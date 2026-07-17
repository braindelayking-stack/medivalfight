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
                    value: 'Use `/profile` to start your adventure!',
                    inline: false
                },
                {
                    name: '💪 Stat Point System',
                    value: `
- **Strength**: Boosts your damage output in combat
- **Wealth**: Get more coins after winning against bosses, grants wealth-based abilities
- **Agility**: Improves your dodging of boss attacks
- **Composure**: Enhances your maximum HP (Base HP = 25, +5 HP per point)
- **Free Points**: Unassigned points you can distribute using \`/profile\`
                    `,
                    inline: false
                },
                {
                    name: '🪙 Coin System',
                    value: 'Earn coins by beating bosses! Your Wealth stat gives you more coins. Spend coins to get new abilities or items from shops!',
                    inline: false
                },
                {
                    name: '📜 Profile Commands',
                    value: `
- \`/profile\`: View and manage your character
                    `,
                    inline: false
                },
                {
                    name: '👹 Boss Commands',
                    value: `
- \`/boss fight\`: Battle a boss to earn coins and glory
- \`/boss inspect\`: View detailed info about a boss before fighting
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
- \`/role-shop buy\`: Buy roles from the role shop
- \`/role-shop list\`: List available roles for purchase
                    `,
                    inline: false
                },
                {
                    name: '📅 New Features!',
                    value: `
- \`/daily\`: Claim your daily reward with streak bonuses!
- \`/quest list\`: View daily, weekly, and repeatable quests (includes progress)!
- \`/quest claim\`: Claim rewards for completed quests!
- \`/inventory\`: View your items and titles!
- \`/item inspect\`: Inspect any item to see what it does and how to get it!
- \`/title inspect\`: Inspect any title to see how to get it!
- \`/achievements\`: View your achievements and claim rewards!
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