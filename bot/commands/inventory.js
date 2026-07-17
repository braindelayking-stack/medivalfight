const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('inventory')
        .setDescription('Check your inventory!'),
    async execute(interaction) {
        await interaction.deferReply();
        const userId = interaction.user.id;
        const serverId = interaction.guild.id;

        let userData = db.prepare('SELECT * FROM users WHERE user_id = ? AND server_id = ?').get(userId, serverId);
        if (!userData) {
            await interaction.editReply('You need a profile first! Use /profile create!');
            return;
        }

        const userItems = db.prepare(`
            SELECT ui.*, i.name, i.description, i.type, i.rarity, i.effect 
            FROM user_items ui 
            JOIN items i ON ui.item_id = i.id 
            WHERE ui.user_id = ? AND ui.server_id = ?
        `).all(userId, serverId);

        const userTitles = db.prepare(`
            SELECT ut.*, t.name, t.rarity 
            FROM user_titles ut 
            JOIN titles t ON ut.title_id = t.id 
            WHERE ut.user_id = ? AND ut.server_id = ?
        `).all(userId, serverId);

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle(`🎒 Your Inventory`);

        let itemsList = '';
        if (userItems.length > 0) {
            itemsList = userItems.map(ui => {
                const rarityEmoji = {
                    common: '⚪',
                    uncommon: '🟢',
                    rare: '🔵',
                    epic: '🟣',
                    legendary: '🟡'
                }[ui.rarity] || '⚪';
                return `${rarityEmoji} **${ui.name}** x${ui.quantity} - ${ui.description}${ui.equipped ? ' (Equipped' : ''}';
            }).join('\n');
        } else {
            itemsList = 'No items yet!';
        }
        embed.addFields({ name: '📦 Items', value: itemsList, inline: false });

        let titlesList = '';
        if (userTitles.length > 0) {
            titlesList = userTitles.map(ut => {
                const isEquipped = userData.equipped_title === ut.title_id;
                const rarityEmoji = {
                    common: '⚪',
                    uncommon: '🟢',
                    rare: '🔵',
                    epic: '🟣',
                    legendary: '🟡'
                }[ut.rarity] || '⚪';
                return `${rarityEmoji} **${ut.name}**${isEquipped ? ' (Equipped)' : ''}`;
            }).join('\n');
        } else {
            titlesList = 'No titles yet!';
        }
        embed.addFields({ name: '👑 Titles', value: titlesList, inline: false });

        await interaction.editReply({ embeds: [embed] });
    }
};
