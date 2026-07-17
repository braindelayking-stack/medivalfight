const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const { giveItemToUser, giveTitleToUser, updateAchievementProgress } = require('../utils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('achievements')
        .setDescription('View your achievements!'),
    async execute(interaction) {
        await interaction.deferReply();
        const userId = interaction.user.id;
        const serverId = interaction.guild.id;

        let userData = db.prepare('SELECT * FROM users WHERE user_id = ? AND server_id = ?').get(userId, serverId);
        if (!userData) {
            await interaction.editReply('You need a profile first! Use /profile create!');
            return;
        }

        // Ensure user has achievement progress entries for all achievements
        const allAchievements = db.prepare('SELECT * FROM achievements').all();
        for (const a of allAchievements) {
            const existing = db.prepare('SELECT * FROM user_achievements WHERE user_id = ? AND server_id = ? AND achievement_id = ?').get(userId, serverId, a.id);
            if (!existing) {
                db.prepare('INSERT INTO user_achievements (user_id, server_id, achievement_id) VALUES (?, ?, ?)').run(userId, serverId, a.id);
            }
        }
        // Update progress for all stat-based achievements
        updateAchievementProgress(userId, serverId, 'dummy');

        const userAchievements = db.prepare(`
            SELECT ua.*, a.* 
            FROM user_achievements ua 
            JOIN achievements a ON ua.achievement_id = a.id 
            WHERE ua.user_id = ? AND ua.server_id = ?
        `).all(userId, serverId);

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle(`🏆 Your Achievements`);

        let desc = '';
        for (const ua of userAchievements) {
            const statusEmoji = ua.unlocked ? (ua.claimed ? '✅' : '🆕') : '⏳';
            const progress = `${Math.min(ua.progress, ua.requirement_target)}/${ua.requirement_target}`;
            desc += `${statusEmoji} **${ua.title}** - ${ua.description} (${progress})\n`;
            if (ua.unlocked && !ua.claimed) {
                // Auto-claim
                if (ua.reward_coins) db.prepare('UPDATE users SET coins = coins + ? WHERE user_id = ? AND server_id = ?').run(ua.reward_coins, userId, serverId);
                if (ua.reward_points) db.prepare('UPDATE users SET points = points + ? WHERE user_id = ? AND server_id = ?').run(ua.reward_points, userId, serverId);
                if (ua.reward_item_id) giveItemToUser(userId, serverId, ua.reward_item_id);
                if (ua.reward_title_id) giveTitleToUser(userId, serverId, ua.reward_title_id);
                db.prepare('UPDATE user_achievements SET claimed = 1 WHERE id = ?').run(ua.id);
            }
        }

        embed.setDescription(desc);
        await interaction.editReply({ embeds: [embed] });
    }
};
