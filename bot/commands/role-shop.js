
const { SlashCommandBuilder, EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('role-shop')
        .setDescription('Manage or buy roles from the server role shop')
        .addSubcommand(sub =>
            sub.setName('buy')
                .setDescription('Buy a role from the shop'))
        .addSubcommand(sub =>
            sub.setName('manage')
                .setDescription('Manage the role shop (Admin only)')
                .addIntegerOption(option => option.setName('slot').setDescription('Slot (1-10)').setRequired(true))
                .addRoleOption(option => option.setName('role').setDescription('Role to add').setRequired(true))
                .addIntegerOption(option => option.setName('cost').setDescription('Cost in coins').setRequired(true))),
    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const serverId = interaction.guild.id;

        if (sub === 'manage') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
                await interaction.reply({ content: 'You need Manage Server permission!' });
                return;
            }
            const slot = interaction.options.getInteger('slot');
            const role = interaction.options.getRole('role');
            const cost = interaction.options.getInteger('cost');
            if (slot < 1 || slot > 10) {
                await interaction.reply({ content: 'Slot must be between 1-10!' });
                return;
            }
            const existing = db.prepare('SELECT * FROM server_role_shop WHERE server_id = ? AND slot = ?').get(serverId, slot);
            if (existing) {
                db.prepare('UPDATE server_role_shop SET role_id = ?, cost = ? WHERE server_id = ? AND slot = ?').run(role.id, cost, serverId, slot);
            } else {
                db.prepare('INSERT INTO server_role_shop (server_id, role_id, cost, slot) VALUES (?, ?, ?, ?)').run(serverId, role.id, cost, slot);
            }
            const embed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('🎭 Role Shop Updated')
                .setDescription(`Role ${role} added to slot ${slot} for **${cost}** coins!`)
                .setTimestamp();
            await interaction.reply({ embeds: [embed] });
            return;
        }

        if (sub === 'buy') {
            const shopItems = db.prepare('SELECT * FROM server_role_shop WHERE server_id = ? ORDER BY slot').all(serverId);
            if (shopItems.length === 0) {
                await interaction.reply({ content: 'Role shop is empty!' });
                return;
            }
            const userId = interaction.user.id;
            const userData = db.prepare('SELECT * FROM users WHERE user_id = ? AND server_id = ?').get(userId, serverId);
            if (!userData) {
                await interaction.reply({ content: 'Need a profile first! /profile' });
                return;
            }

            const options = shopItems.map(item => {
                const role = interaction.guild.roles.cache.get(item.role_id);
                return new StringSelectMenuOptionBuilder()
                    .setLabel(role?.name || 'Unknown Role')
                    .setDescription(`Cost: ${item.cost} coins`)
                    .setValue(String(item.id));
            });
            const menu = new StringSelectMenuBuilder().setCustomId('buy_role').setPlaceholder('Select a role').addOptions(options);
            const row = new ActionRowBuilder().addComponents(menu);
            const embed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('🏪 Noble Role Shop')
                .setDescription(`Your coins: **${userData.coins}**\nSelect a role to purchase!`)
                .setThumbnail('https://cdn.pixabay.com/photo/2017/03/01/20/14/market-2108329_1280.jpg')
                .setTimestamp();
            const reply = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
            const filter = i => i.customId === 'buy_role' && i.user.id === userId;
            try {
                const i = await reply.awaitMessageComponent({ filter, time: 60000 });
                const itemId = parseInt(i.values[0]);
                const item = db.prepare('SELECT * FROM server_role_shop WHERE id = ?').get(itemId);
                if (!item) return;
                if (userData.coins < item.cost) {
                    await i.reply({ content: 'Not enough coins!' });
                    return;
                }
                db.prepare('UPDATE users SET coins = coins - ? WHERE user_id = ? AND server_id = ?').run(item.cost, userId, serverId);
                const role = interaction.guild.roles.cache.get(item.role_id);
                await interaction.member.roles.add(role);
                const successEmbed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('🎉 Purchase Successful')
                    .setDescription(`You bought **${role.name}** for **${item.cost}** coins!`)
                    .setTimestamp();
                await i.reply({ embeds: [successEmbed] });
            } catch (e) {
                console.error(e);
            }
        }
    }
};
