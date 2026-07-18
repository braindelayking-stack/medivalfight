const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('title')
        .setDescription('Title commands!')
        .addSubcommand(sub => 
            sub.setName('inspect')
                .setDescription('Inspect a title!')
                .addStringOption(opt => 
                    opt.setName('name')
                        .setDescription('Name of the title to inspect')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        ),
    async autocomplete(interaction) {
        const focused = interaction.options.getFocused();
        const titles = db.prepare('SELECT name FROM titles WHERE name LIKE ?').all(`%${focused}%`);
        await interaction.respond(
            titles.map(title => ({ name: title.name, value: title.name }))
        );
    },
    async execute(interaction) {
        await interaction.deferReply();
        const userId = interaction.user.id;
        const serverId = interaction.guild.id;
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'inspect') {
            const name = interaction.options.getString('name');
            const title = db.prepare('SELECT * FROM titles WHERE name = ?').get(name);
            if (!title) {
                await interaction.editReply('Title not found!');
                return;
            }

            const rarityEmoji = {
                'Common': '⚪',
                'Uncommon': '🟢',
                'Rare': '🔵',
                'Epic': '🟣',
                'Legendary': '🟡'
            }[title.rarity] || '⚪';

            const embed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle(`${rarityEmoji} ${title.name}`);
            
            if (title.description) {
                embed.addFields({ name: 'What it does:', value: title.description });
            }

            // Find how to obtain
            let obtainFrom = [];
            const achievementGivers = db.prepare('SELECT title FROM achievements WHERE reward_title_id = ?').all(title.id);
            for (const a of achievementGivers) obtainFrom.push(`Unlock achievement: "${a.title}"`);

            if (obtainFrom.length >0) embed.addFields({ name: 'Requirement:', value: obtainFrom.join('\n') });

            await interaction.editReply({ embeds: [embed] });
        }
    }
};
