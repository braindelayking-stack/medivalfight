
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const { abilities, categoryConfig } = require('../abilities');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('View all available abilities for purchase'),
    async execute(interaction) {
        const userId = interaction.user.id;
        const serverId = interaction.guild.id;

        let userData = db.prepare('SELECT * FROM users WHERE user_id = ? AND server_id = ?').get(userId, serverId);
        if (!userData) {
            await interaction.reply({ content: 'You need to create a profile first with /profile!' });
            return;
        }

        const userAbilities = db.prepare('SELECT * FROM user_abilities WHERE user_id = ? AND server_id = ?').all(userId, serverId);
        const ownedAbilityIds = new Set(userAbilities.map(ua => ua.ability_id));

        // Group abilities by category
        const groupedAbilities = {};
        abilities.forEach(ability => {
            if (!groupedAbilities[ability.category]) groupedAbilities[ability.category] = [];
            groupedAbilities[ability.category].push(ability);
        });

        // Build the embed
        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🏪 Medieval Grand Bazaar')
            .setThumbnail('https://cdn.pixabay.com/photo/2017/03/01/20/14/market-2108329_1280.jpg')
            .setDescription(`Your coins: **${userData.coins}**\nUse /abilities buy to purchase, /abilities inspect for details!`);

        for (const [category, categoryAbilities] of Object.entries(groupedAbilities)) {
            const config = categoryConfig[category] || { emoji: '📜', color: '#8B4513' };
            const abilityList = categoryAbilities.map(a => {
                const isOwned = ownedAbilityIds.has(a.id);
                let costStr = a.costType === 'coins' ? `${a.cost} coins` : `${a.cost} ${a.costType}`;
                return `${config.emoji} ${a.name} - ${costStr} ${isOwned ? '✅ **OWNED**' : ''}`;
            }).join('\n');
            embed.addFields({ name: `${config.emoji} ${category}`, value: abilityList, inline: false });
        }

        await interaction.reply({ embeds: [embed] });
    }
};
