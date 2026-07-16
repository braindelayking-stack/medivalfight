
const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const db = require('../../database/db');
const bossCommand = require('./boss.js');

// Cooldown tracker (3 seconds)
const cooldowns = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('earth-attack')
        .setDescription('🌍 Use earth attack in battle!'),
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
        const ability = db.prepare('SELECT * FROM user_abilities WHERE user_id = ? AND server_id = ? AND ability_id = ?').get(userId, serverId, 'earth_attack');
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

            // Check if boss has shield
            let blocked = false;
            if (state.bossEffects.shield.active) {
                if (Math.random() < state.bossEffects.shield.blockChance) {
                    blocked = true;
                    state.log.push('🛡️ Boss blocked the attack!');
                }
                state.bossEffects.shield = { active: false, blockChance: 0 }; // Shield is one-time use
            }

            if (!blocked) {
                let damage = 10;
                // Apply attack boost if active
                if (state.userEffects.attackBoost.active) {
                    damage = Math.round(damage * state.userEffects.attackBoost.multiplier);
                    state.userEffects.attackBoost = { active: false, multiplier: 1 };
                }
                state.bossHP -= damage;
                state.damageGiven += damage;
                state.log.push(`🌍 You used earth attack, dealing ${damage} damage!`);
            }

            // Check if boss is dead
            if (state.bossHP <= 0) {
                const message = await interaction.channel.messages.fetch(state.messageId);
                await bossCommand.endBossFight(state, message, true);
                await interaction.reply({ content: '🌍 You attacked!', ephemeral: true });
                cooldowns.set(userId, now + 3000);
                return;
            }

            // Update embed
            const message = await interaction.channel.messages.fetch(state.messageId);
            const { embed: newEmbed, row: newRow } = bossCommand.createBossEmbed(state);
            await message.edit({ embeds: [newEmbed], components: [newRow] });

            cooldowns.set(userId, now + 3000);
            await interaction.reply({ content: '🌍 You used earth attack!', ephemeral: true });
            return;
        }

        await interaction.reply({ content: 'You ain\'t in a battle or boss fight', ephemeral: true });
    }
};
