
const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const db = require('../../database/db');
const bossCommand = require('./boss.js');

// Cooldown tracker (3 seconds)
const cooldowns = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sacrifice')
        .setDescription('💰 Sacrifice wealth to heal in battle!')
        .addIntegerOption(option => option.setName('amount').setDescription('Amount to sacrifice').setRequired(true)),
    async execute(interaction) {
        const userId = interaction.user.id;
        const serverId = interaction.guild.id;
        const now = Date.now();
        const amount = interaction.options.getInteger('amount');

        // Check cooldown
        if (cooldowns.has(userId)) {
            const remaining = (cooldowns.get(userId) - now) / 1000;
            if (remaining > 0) {
                await interaction.reply({ content: `You're on cooldown! Wait ${remaining.toFixed(1)}s!`, ephemeral: true });
                return;
            }
        }

        // Check if user has the ability
        const ability = db.prepare('SELECT * FROM user_abilities WHERE user_id = ? AND server_id = ? AND ability_id = ?').get(userId, serverId, 'sacrifice');
        if (!ability) {
            await interaction.reply({ content: '❌ You need to buy this ability from /shop first!', ephemeral: true });
            return;
        }

        // Get user data to check wealth
        let userData = db.prepare('SELECT * FROM users WHERE user_id = ? AND server_id = ?').get(userId, serverId);
        if (!userData) {
            await interaction.reply({ content: '❌ You need a profile first! Use /profile', ephemeral: true });
            return;
        }

        if (userData.wealth < amount) {
            await interaction.reply({ content: `❌ You don't have enough wealth! You have ${userData.wealth} wealth.`, ephemeral: true });
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

            // Deduct wealth from user
            db.prepare('UPDATE users SET wealth = wealth - ? WHERE user_id = ? AND server_id = ?').run(amount, userId, serverId);

            // Heal player: 1 wealth = 1 HP
            const healAmount = Math.min(amount, state.playerMaxHP - state.playerHP);
            state.playerHP += healAmount;
            state.log.push(`💰 You sacrificed ${amount} wealth and healed ${healAmount} HP!`);

            // Update embed
            const message = await interaction.channel.messages.fetch(state.messageId);
            const { embed: newEmbed, row: newRow } = bossCommand.createBossEmbed(state);
            await message.edit({ embeds: [newEmbed], components: [newRow] });

            cooldowns.set(userId, now + 3000);
            await interaction.reply({ content: '💰 You used sacrifice!', ephemeral: true });
            return;
        }

        await interaction.reply({ content: 'You ain\'t in a battle or boss fight', ephemeral: true });
    }
};
