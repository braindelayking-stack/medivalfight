
const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database/db');
const bossCommand = require('./boss.js');

// Cooldown tracker (12 seconds)
const cooldowns = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('berserk')
        .setDescription('🔥 Sacrifice 20% current HP to deal 50 base damage'),
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
        const ability = db.prepare('SELECT * FROM user_abilities WHERE user_id = ? AND server_id = ? AND ability_id = ?').get(userId, serverId, 'berserk');
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
                await interaction.reply({ content: '😵 You are stunned and can\'t attack!', ephemeral: true });
                return;
            }

            // Calculate 20% current HP to sacrifice
            const hpToSacrifice = Math.max(1, Math.round(state.playerHP * 0.2));
            
            // Make sure we don't kill the player (leave at least 1 HP)
            const actualSacrifice = Math.min(hpToSacrifice, state.playerHP - 1);
            state.playerHP -= actualSacrifice;
            state.damageTaken += actualSacrifice;

            // Deal damage
            let damage = 50;
            // Apply attack boost if active
            if (state.userEffects.attackBoost.active) {
                damage = Math.round(damage * state.userEffects.attackBoost.multiplier);
                state.userEffects.attackBoost = { active: false, multiplier: 1 };
            }
            state.bossHP -= damage;
            state.damageGiven += damage;
            state.log.push(`🔥 You used Berserk! Sacrificed ${actualSacrifice} HP to deal ${damage} damage!`);

            // Check if boss is dead
            if (state.bossHP <= 0) {
                const message = await interaction.channel.messages.fetch(state.messageId);
                await bossCommand.endBossFight(state, message, true);
                await interaction.reply({ content: '🔥 You used Berserk!', ephemeral: true });
                return;
            }

            // Check if we died from sacrifice
            if (state.playerHP <= 0) {
                const message = await interaction.channel.messages.fetch(state.messageId);
                await bossCommand.endBossFight(state, message, false);
                await interaction.reply({ content: '🔥 You used Berserk!', ephemeral: true });
                return;
            }

            // Update embed
            const message = await interaction.channel.messages.fetch(state.messageId);
            const { embed: newEmbed, row: newRow } = bossCommand.createBossEmbed(state);
            await message.edit({ embeds: [newEmbed], components: [newRow] });

            cooldowns.set(userId, now + 12000);
            await interaction.reply({ content: '🔥 You used Berserk!', ephemeral: true });
            return;
        }

        await interaction.reply({ content: 'You ain\'t in a battle or boss fight', ephemeral: true });
    }
};
