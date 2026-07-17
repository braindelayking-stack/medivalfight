
const { Events } = require('discord.js');
const db = require('../../database/db');
const { updateQuestProgress, assignQuestsToUser } = require('../utils');

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot) return;
        if (!message.guild) return;

        const userId = message.author.id;
        const serverId = message.guild.id;
        const channelId = message.channel.id;

        // Ensure user exists
        let existingUser = db.prepare('SELECT * FROM users WHERE user_id = ? AND server_id = ?').get(userId, serverId);
        if (!existingUser) {
            db.prepare(`
                INSERT INTO users (user_id, server_id, game_username, game_avatar, points, coins, strength, wealth, health, agility, composure, total_points_spent, wins, boss_wins)
                VALUES (?, ?, ?, ?, ?, 0, 0, 0, 0, 0, 0, 0, 0, 0)
            `).run(userId, serverId, message.author.username, message.author.displayAvatarURL(), 0);
            // Give first title
            db.prepare('INSERT OR IGNORE INTO user_titles (user_id, server_id, title_id) VALUES (?, ?, ?)').run(userId, serverId, 1);
            db.prepare('UPDATE users SET equipped_title = ? WHERE user_id = ? AND server_id = ?').run(1, userId, serverId);
            // Insert first achievement progress
            db.prepare('INSERT OR IGNORE INTO user_achievements (user_id, server_id, achievement_id, progress, unlocked) VALUES (?, ?, ?, 1, 1)').run(userId, serverId, 1);
            existingUser = db.prepare('SELECT * FROM users WHERE user_id = ? AND server_id = ?').get(userId, serverId);
        }

        // Assign quests
        assignQuestsToUser(userId, serverId);

        // Check tracked channels
        const trackedChannels = db.prepare('SELECT channel_id FROM server_tracked_channels WHERE server_id = ?').all(serverId);
        if (trackedChannels.length > 0) {
            const isTracked = trackedChannels.some(c => c.channel_id === channelId);
            if (!isTracked) return;
        }

        const wordCount = message.content.trim().split(/\s+/).filter(word => word.length > 0).length;
        let pointsToAdd;
        if (wordCount > 75) {
            pointsToAdd = 10;
        } else if (wordCount > 50) {
            pointsToAdd = 5;
        } else {
            pointsToAdd = 1;
        }

        // Apply any point boosters (TODO later, for now just add)
        db.prepare('UPDATE users SET points = points + ? WHERE user_id = ? AND server_id = ?').run(pointsToAdd, userId, serverId);

        // Update quest progress for chat points
        updateQuestProgress(userId, serverId, 'chat_points', null, pointsToAdd);
    }
};
