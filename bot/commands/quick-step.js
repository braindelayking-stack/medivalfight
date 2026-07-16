
const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database/db');
const bossCommand = require('./boss.js');

// Cooldown tracker (6 seconds)
const cooldowns = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('quick-step')
        .setDescription('🏃‍♂️ Dodge the next boss attack and counter for 15 damage'),
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
        const ability = db.prepare('SELECT * FROM user_abilities WHERE user_id = ? AND server_id = ? AND ability_id = ?').get(userId, serverId, 'quick_step');
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

            // Activate dodge
            state.userEffects.dodge = { active: true, chance: 1 };

            // Deal counter damage
            let damage = 15;
            // Apply attack boost if active
            if (state.userEffects.attackBoost.active) {
                damage = Math.round(damage * state.userEffects.attackBoost.multiplier);
                state.userEffects.attackBoost = { active: false, multiplier: 1 };
            }
            state.bossHP -= damage;
            state.damageGiven += damage;
            state.log.push(`🏃‍♂️ You used Quick Step! You'll dodge the next attack and counter for ${damage} damage!`);

            // Check if boss is dead
            if (state.bossHP <= 0) {
                const message = await interaction.channel.messages.fetch(state.messageId);
                await bossCommand.endBossFight(state, message, true);
                await interaction.reply({ content: '🏃‍♂️ You used Quick Step!', ephemeral: true });
                return;
            }

            // Update embed
            const message = await interaction.channel.messages.fetch(state.messageId);
            const { embed: newEmbed, row: newRow } = bossCommand.createBossEmbed(state);
            await message.edit({ embeds: [newEmbed], components: [newRow] });

            cooldowns.set(userId, now + 6000);
            await interaction.reply({ content: '🏃‍♂️ You used Quick Step!', ephemeral: true });
            return;
        }

        await interaction.reply({ content: 'You ain\'t in a battle or boss fight', ephemeral: true });
    }
};
