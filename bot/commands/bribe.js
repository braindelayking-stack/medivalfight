
const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database/db');
const bossCommand = require('./boss.js');

// Cooldown tracker (8 seconds)
const cooldowns = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bribe')
        .setDescription('💵 Spend 50 coins to skip the boss\'s next attack'),
    async execute(interaction) {
        const userId = interaction.user.id;
        const serverId = interaction.guild.id;
        const now = Date.now();

        // Check cooldown
        if (cooldowns.has(userId)) {
            const remaining = (cooldowns.get(userId) - now) / 1000;
            if (remaining > 0) {
                await interaction.reply({ content: `You're on cooldown! Wait ${remaining.toFixed(1)}s!`, ephemeral: true });
                return;
            }
        }

        // Check if user has the ability
        const ability = db.prepare('SELECT * FROM user_abilities WHERE user_id = ? AND server_id = ? AND ability_id = ?').get(userId, serverId, 'bribe');
        if (!ability) {
            await interaction.reply({ content: '❌ You need to buy this ability from /shop first!', ephemeral: true });
            return;
        }

        // Check if in boss fight
        const bossFightId = `${serverId}-${userId}`;
        if (bossCommand.activeBossFights.has(bossFightId)) {
            const state = bossCommand.activeBossFights.get(bossFightId);

            // Check if user is stunned
            if (state.userEffects.stun.active) {
                await interaction.reply({ content: '😵 You are stunned and can\'t use this!', ephemeral: true });
                return;
            }

            // Get user data to check coins
            let userData = db.prepare('SELECT * FROM users WHERE user_id = ? AND server_id = ?').get(userId, serverId);
            if (!userData) {
                await interaction.reply({ content: '❌ You need a profile first! Use /profile', ephemeral: true });
                return;
            }

            if (userData.coins < 50) {
                await interaction.reply({ content: `❌ You need at least 50 coins to bribe! You have ${userData.coins} coins.`, ephemeral: true });
                return;
            }

            // Deduct coins
            db.prepare('UPDATE users SET coins = coins - ? WHERE user_id = ? AND server_id = ?').run(50, userId, serverId);

            // Set skip boss attack effect
            state.userEffects.skipBossAttack = { active: true };
            state.log.push(`💵 You bribed the boss! Their next attack will be skipped! (-50 coins)`);

            // Update embed
            const message = await interaction.channel.messages.fetch(state.messageId);
            const { embed: newEmbed, row: newRow } = bossCommand.createBossEmbed(state);
            await message.edit({ embeds: [newEmbed], components: [newRow] });

            cooldowns.set(userId, now + 8000);
            await interaction.reply({ content: '💵 You bribed the boss!', ephemeral: true });
            return;
        }

        await interaction.reply({ content: 'You ain\'t in a battle or boss fight', ephemeral: true });
    }
};
