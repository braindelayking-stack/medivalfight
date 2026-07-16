
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Get help with the medieval fantasy RPG bot!'),
    async execute(interaction) {
        const helpEmbed = new EmbedBuilder()
            .setColor('#8B4513')
            .setTitle('⚔️ Medieval Fantasy RPG Help')
            .setDescription('Welcome to the RPG! Here\'s how to play:')
            .addFields(
                {
                    name: '🎯 Creating a Profile',
                    value: 'Use `/profile create` to start your adventure. You get 100 points to distribute!',
                    inline: false
                },
                {
                    name: '💪 Stats',
                    value: `
- Strength: Increases damage
- Wealth: Earns more coins and has wealth-based abilities
- Agility: Higher chance to dodge attacks
- Composure: Increases max HP (Base HP is 25, +5 HP per point)
- Free Points: Points you can distribute!
                    `,
                    inline: false
                },
                {
                    name: '👹 Boss Battles',
                    value: 'Use `/boss fight` to battle bosses! Earn coins by winning!',
                    inline: false
                },
                {
                    name: '📜 Abilities',
                    value: `
- Use \`/abilities view\` to see your owned abilities
- Use \`/abilities buy\` to buy new abilities (with coins or stats!)
- Use \`/abilities inspect\` to check ability details!
                    `,
                    inline: false
                },
                {
                    name: '🪙 Economy',
                    value: 'Earn coins by defeating bosses, use coins or stats to buy abilities!',
                    inline: false
                },
                {
                    name: '📊 Profile',
                    value: 'Use `/profile view` to see your stats, level, HP, and coins!',
                    inline: false
                },
                {
                    name: '🗄️ Battle Log',
                    value: 'Use the link from your boss fight to view full battle history on the dashboard!',
                    inline: false
                }
            )
            .setFooter({ text: 'Have fun! 🎮' });

        await interaction.reply({ embeds: [helpEmbed] });
    }
};
