
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Get complete help with the Medieval Fight RPG bot!'),
    async execute(interaction) {
        // Defer reply to avoid unknown interaction errors
        await interaction.deferReply();

        const helpEmbed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('⚔️ Medieval Fight RPG - Complete Help')
            .setDescription('Welcome to Medieval Fight! Here\'s everything you need to know:')
            .addFields(
                {
                    name: '🎯 Getting Started',
                    value: 'Use `/profile create` to start your adventure. You get 100 FREE points to distribute!',
                    inline: false
                },
                {
                    name: '💪 Stat Point System',
                    value: `
- **Strength**: Increases damage dealt in battle
- **Wealth**: Earns more coins from battles, unlocks wealth-based abilities
- **Agility**: Higher chance to dodge boss attacks
- **Composure**: Increases max HP (Base HP = 25, +5 HP per composure point)
- **Free Points**: Unassigned points you can distribute using \`/profile distribute\`
                    `,
                    inline: false
                },
                {
                    name: '🪙 Coin System',
                    value: 'Earn coins by defeating bosses! Coins are used to buy abilities in the shop. Wealth stat increases coin earnings!',
                    inline: false
                },
                {
                    name: '📜 Profile Commands',
                    value: `
- \`/profile create\`: Create your character
- \`/profile view\`: View your stats, level, HP, coins, and owned abilities
- \`/profile distribute\`: Spend free points to boost your stats
- \`/profile reset\`: Reset your profile (WARNING: This deletes all progress!)
                    `,
                    inline: false
                },
                {
                    name: '👹 Boss Commands',
                    value: `
- \`/boss list\`: List all available bosses with difficulty tiers
- \`/boss inspect\`: View detailed info about a boss before fighting
- \`/boss fight\`: Battle a boss to earn coins and glory
                    `,
                    inline: false
                },
                {
                    name: '⚡ Ability Commands',
                    value: `
- \`/abilities list\`: List all available abilities with categories
- \`/abilities view\`: View your owned abilities
- \`/abilities buy\`: Purchase new abilities
- \`/abilities inspect\`: Inspect an ability's details
- \`/abilities upgrade view\`: View your ability upgrade progress
- \`/abilities upgrade ability\`: Upgrade an ability to make it stronger!
                    `,
                    inline: false
                },
                {
                    name: '🏪 Shop Commands',
                    value: `
- \`/shop buy\`: Buy items from the shop
- \`/shop list\`: List all shop items
- \`/role-shop buy\`: Buy roles from the role shop
- \`/role-shop list\`: List available roles for purchase
                    `,
                    inline: false
                },
                {
                    name: '📊 Leaderboard',
                    value: 'Use `/leaderboard` to see the top players!',
                    inline: false
                },
                {
                    name: '🗄️ Dashboard',
                    value: 'Visit the dashboard at https://medivalfight.alwaysdata.net for battle logs, profile management, and more!',
                    inline: false
                }
            )
            .setFooter({ text: 'Conquer the realm! 🎮' })
            .setTimestamp();

        await interaction.editReply({ embeds: [helpEmbed] });
    }
};
