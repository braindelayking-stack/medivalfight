
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const { getTodayUTC } = require('../utils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Claim your daily reward!'),
    async execute(interaction) {
        await interaction.deferReply();
        const userId = interaction.user.id;
        const serverId = interaction.guild.id;

        // Ensure user exists
        let user = db.prepare('SELECT * FROM users WHERE user_id = ? AND server_id = ?').get(userId, serverId);
        if (!user) {
            await interaction.editReply('You need to create a profile first with /profile create!');
            return;
        }

        const today = getTodayUTC();
        if (user.last_daily_claim === today) {
            await interaction.editReply('You already claimed your daily reward today! Come back tomorrow!');
            return;
        }

        // Calculate streak
        let newStreak = 1;
        const yesterday = new Date();
        yesterday.setUTCDate(yesterday.getUTCDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        if (user.last_daily_claim === yesterdayStr) {
            newStreak = user.daily_streak + 1;
        }

        // Calculate rewards (base 50 coins + 10 per streak day, 100 points base)
        const baseCoins = 50;
        const streakCoins = (newStreak - 1) * 10;
        const totalCoins = baseCoins + streakCoins;
        const points = 100 + (newStreak - 1) * 20;

        // Update user
        db.prepare('UPDATE users SET coins = coins + ?, points = points + ?, last_daily_claim = ?, daily_streak = ? WHERE user_id = ? AND server_id = ?').run(totalCoins, points, today, newStreak, userId, serverId);

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🎁 Daily Reward Claimed!')
            .setDescription(`You claimed your daily reward!\n**+${totalCoins} coins**\n**+${points} points**\nCurrent streak: **${newStreak} days**`)
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }
};
