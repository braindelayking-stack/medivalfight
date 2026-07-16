
const { Events } = require('discord.js');
const db = require('../../database/db');

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot) return;
        if (!message.guild) return;

        const userId = message.author.id;
        const serverId = message.guild.id;

        const wordCount = message.content.trim().split(/\s+/).filter(word => word.length > 0).length;
        let pointsToAdd;
        if (wordCount > 75) {
            pointsToAdd = 10;
        } else if (wordCount > 50) {
            pointsToAdd = 5;
        } else {
            pointsToAdd = 1;
        }

        const existingUser = db.prepare('SELECT * FROM users WHERE user_id = ? AND server_id = ?').get(userId, serverId);
        if (existingUser) {
            db.prepare('UPDATE users SET points = points + ? WHERE user_id = ? AND server_id = ?').run(pointsToAdd, userId, serverId);
        } else {
            db.prepare(`
                INSERT INTO users (user_id, server_id, game_username, game_avatar, points, coins, strength, wealth, health, agility, composure, total_points_spent, wins, boss_wins)
                VALUES (?, ?, ?, ?, ?, 0, 0, 0, 0, 0, 0, 0, 0, 0)
            `).run(userId, serverId, message.author.username, message.author.displayAvatarURL(), pointsToAdd);
        }
    }
};
