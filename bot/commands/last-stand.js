
const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database/db');
const bossCommand = require('./boss.js');

// Cooldown tracker (very long since it's once per fight)
const cooldowns = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('last-stand')
        .setDescription('⚔️ If below 20% HP: heal to 50% max HP and 2x attack boost (once per fight)'),
    async execute(interaction) {
        const userId = interaction.user.id;
        const serverId = interaction.guild.id;
        const now = Date.now();

        // Check if user has the ability
        const ability = db.prepare('SELECT * FROM user_abilities WHERE user_id = ? AND server_id = ? AND ability_id = ?').get(userId, serverId, 'last_stand');
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

            // Check if already used in this fight
            if (state.lastStandUsed) {
                await interaction.reply({ content: '❌ You already used Last Stand in this fight!', ephemeral: true });
                return;
            }

            // Check if below 20% HP
            const hpPercentage = state.playerHP / state.playerMaxHP;
            if (hpPercentage >= 0.2) {
                await interaction.reply({ content: '❌ You must be below 20% HP to use Last Stand!', ephemeral: true });
                return;
            }

            // Heal to 50% max HP
            const healTo = Math.round(state.playerMaxHP * 0.5);
            const healAmount = healTo - state.playerHP;
            state.playerHP = healTo;

            // Apply 2x attack boost
            state.userEffects.attackBoost = { active: true, multiplier: 2 };

            // Mark as used
            state.lastStandUsed = true;

            state.log.push(`⚔️ You used Last Stand! Healed ${healAmount} HP and gained a 2x attack boost!`);

            // Update embed
            const message = await interaction.channel.messages.fetch(state.messageId);
            const { embed: newEmbed, row: newRow } = bossCommand.createBossEmbed(state);
            await message.edit({ embeds: [newEmbed], components: [newRow] });

            cooldowns.set(userId, now + 999999999); // Very long cooldown, but we already track per fight
            await interaction.reply({ content: '⚔️ You used Last Stand!', ephemeral: true });
            return;
        }

        await interaction.reply({ content: 'You ain\'t in a battle or boss fight', ephemeral: true });
    }
};
