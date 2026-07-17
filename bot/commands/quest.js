
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const { assignQuestsToUser, giveItemToUser, giveTitleToUser, getTodayUTC, getWeekStartUTC } = require('../utils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('quest')
        .setDescription('Quest commands!')
        .addSubcommand(sub => sub.setName('list').setDescription('List your available quests'))
        .addSubcommand(sub => sub.setName('progress').setDescription('Show your quest progress'))
        .addSubcommand(sub => sub.setName('claim').setDescription('Claim rewards for completed quests!')),
    async execute(interaction) {
        await interaction.deferReply();
        const userId = interaction.user.id;
        const serverId = interaction.guild.id;
        const subcommand = interaction.options.getSubcommand();

        // Ensure user exists and has quests assigned
        let user = db.prepare('SELECT * FROM users WHERE user_id = ? AND server_id = ?').get(userId, serverId);
        if (!user) {
            await interaction.editReply('You need a profile first! Use /profile create!');
            return;
        }
        assignQuestsToUser(userId, serverId);

        if (subcommand === 'list' || subcommand === 'progress') {
            // Get all user quests
            const today = getTodayUTC();
            const weekStart = getWeekStartUTC();
            const userQuests = db.prepare(`
                SELECT uq.*, q.* 
                FROM user_quests uq 
                JOIN quests q ON uq.quest_id = q.id 
                WHERE uq.user_id = ? AND uq.server_id = ? 
                AND (
                    (q.type = 'daily' AND uq.assigned_at >= ?) 
                    OR (q.type = 'weekly' AND uq.assigned_at >= ?) 
                    OR q.type = 'repeatable'
                )
            `).all(userId, serverId, today, weekStart);

            // Group by type
            const daily = userQuests.filter(q => q.type === 'daily');
            const weekly = userQuests.filter(q => q.type === 'weekly');
            const repeatable = userQuests.filter(q => q.type === 'repeatable');

            const embed = new EmbedBuilder().setColor('#FFD700').setTitle('📜 Your Quests');
            let desc = '';

            if (daily.length > 0) {
                desc += '**Daily Quests**\n';
                for (const q of daily) {
                    const status = q.completed ? (q.claimed ? '✅ Claimed' : '✅ Completed (use /quest claim!)') : `⏳ ${q.progress}/${q.objective_target}`;
                    desc += `• **${q.title}**: ${q.description} - ${status}\n`;
                }
            }
            if (weekly.length > 0) {
                desc += '\n**Weekly Quests**\n';
                for (const q of weekly) {
                    const status = q.completed ? (q.claimed ? '✅ Claimed' : '✅ Completed (use /quest claim!)') : `⏳ ${q.progress}/${q.objective_target}`;
                    desc += `• **${q.title}**: ${q.description} - ${status}\n`;
                }
            }
            if (repeatable.length > 0) {
                desc += '\n**Repeatable Quests**\n';
                for (const q of repeatable) {
                    const canClaim = q.completed && !q.claimed;
                    const onCooldown = q.last_claimed_at && (Date.now() - new Date(q.last_claimed_at).getTime()) < q.cooldown_seconds * 1000;
                    let status = `⏳ ${q.progress}/${q.objective_target}`;
                    if (q.completed) {
                        if (onCooldown) {
                            const remaining = Math.ceil((q.cooldown_seconds * 1000 - (Date.now() - new Date(q.last_claimed_at).getTime())) / 1000);
                            status = `⌛ On cooldown (${remaining}s)`;
                        } else {
                            status = '✅ Completed (use /quest claim!)';
                        }
                    }
                    desc += `• **${q.title}**: ${q.description} - ${status}\n`;
                }
            }
            if (!desc) desc = 'No quests available right now!';
            embed.setDescription(desc);
            await interaction.editReply({ embeds: [embed] });
        } else if (subcommand === 'claim') {
            const today = getTodayUTC();
            const weekStart = getWeekStartUTC();
            const userQuests = db.prepare(`
                SELECT uq.*, q.* 
                FROM user_quests uq 
                JOIN quests q ON uq.quest_id = q.id 
                WHERE uq.user_id = ? AND uq.server_id = ? AND uq.completed = 1 AND uq.claimed = 0
                AND (
                    (q.type = 'daily' AND uq.assigned_at >= ?) 
                    OR (q.type = 'weekly' AND uq.assigned_at >= ?) 
                    OR q.type = 'repeatable'
                )
            `).all(userId, serverId, today, weekStart);

            if (userQuests.length === 0) {
                await interaction.editReply('No completed quests to claim!');
                return;
            }

            let totalCoins = 0;
            let totalPoints = 0;
            const itemsGiven = [];
            const titlesGiven = [];

            for (const uq of userQuests) {
                // Check cooldown for repeatable
                if (uq.type === 'repeatable' && uq.last_claimed_at) {
                    const timeSince = Date.now() - new Date(uq.last_claimed_at).getTime();
                    if (timeSince < uq.cooldown_seconds * 1000) continue;
                }

                totalCoins += uq.reward_coins;
                totalPoints += uq.reward_points;
                if (uq.reward_item_id) {
                    giveItemToUser(userId, serverId, uq.reward_item_id);
                    const item = db.prepare('SELECT * FROM items WHERE id = ?').get(uq.reward_item_id);
                    if (item) itemsGiven.push(item.name);
                }
                db.prepare('UPDATE user_quests SET claimed = 1, last_claimed_at = ? WHERE id = ?').run(new Date().toISOString(), uq.id);
                // Update user's quest completion counts
                if (uq.type === 'daily') {
                    db.prepare('UPDATE users SET daily_quests_completed = daily_quests_completed + 1 WHERE user_id = ? AND server_id = ?').run(userId, serverId);
                    updateAchievementProgress(userId, serverId, 'daily_quests_completed', null, 1);
                }
                if (uq.type === 'weekly') {
                    db.prepare('UPDATE users SET weekly_quests_completed = weekly_quests_completed + 1 WHERE user_id = ? AND server_id = ?').run(userId, serverId);
                    updateAchievementProgress(userId, serverId, 'weekly_quests_completed', null, 1);
                }
                db.prepare('UPDATE users SET total_quests_completed = total_quests_completed + 1 WHERE user_id = ? AND server_id = ?').run(userId, serverId);
                updateAchievementProgress(userId, serverId, 'total_quests_completed', null, 1);
            }

            db.prepare('UPDATE users SET coins = coins + ?, points = points + ? WHERE user_id = ? AND server_id = ?').run(totalCoins, totalPoints, userId, serverId);

            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('🎉 Quest Rewards Claimed!')
                .setDescription(`You claimed your rewards!\n**+${totalCoins} coins**\n**+${totalPoints} points**`);
            if (itemsGiven.length > 0) embed.addFields({ name: 'Items Received', value: itemsGiven.join(', ') });
            await interaction.editReply({ embeds: [embed] });
        }
    }
};
