const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('item')
        .setDescription('Item commands!')
        .addSubcommand(sub => 
            sub.setName('inspect')
                .setDescription('Inspect an item!')
                .addStringOption(opt => 
                    opt.setName('name')
                        .setDescription('Name of the item to inspect')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        ),
    async autocomplete(interaction) {
        const focused = interaction.options.getFocused();
        const items = db.prepare('SELECT name FROM items WHERE name LIKE ?').all(`%${focused}%`);
        await interaction.respond(
            items.map(item => ({ name: item.name, value: item.name }))
        );
    },
    async execute(interaction) {
        await interaction.deferReply();
        const userId = interaction.user.id;
        const serverId = interaction.guild.id;
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'inspect') {
            const name = interaction.options.getString('name');
            const item = db.prepare('SELECT * FROM items WHERE name = ?').get(name);
            if (!item) {
                await interaction.editReply('Item not found!');
                return;
            }

            const rarityEmoji = {
                'Common': '⚪',
                'Uncommon': '🟢',
                'Rare': '🔵',
                'Epic': '🟣',
                'Legendary': '🟡'
            }[item.rarity] || '⚪';

            const embed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle(`${rarityEmoji} ${item.name}`);
            
            if (item.description) {
                embed.addFields({ name: 'What it does:', value: item.description });
            }
            
            if (item.effect) {
                const effect = JSON.parse(item.effect);
                let effectStr = '';
                if (effect.type === 'heal') {
                    if (effect.full) effectStr += 'Heals you to full HP in boss fights!';
                    else effectStr += `Heals ${effect.amount} HP in boss fights!`;
                } else if (effect.type === 'boost') {
                    if (effect.stat === 'coins') effectStr += `${effect.multiplier}x coins for ${Math.round(effect.duration / 60000)} minutes!`;
                    else if (effect.stat === 'points') effectStr += `${effect.multiplier}x points for ${Math.round(effect.duration / 60000)} minutes!`;
                    else if (effect.stat === 'both') effectStr += `${effect.multiplier}x coins AND points for ${Math.round(effect.duration / 60000)} minutes!`;
                } else if (effect.type === 'passive') {
                    if (effect.coins) effectStr += `${(effect.coins - 1) * 100}% coin bonus! `;
                    if (effect.points) effectStr += `${(effect.points - 1) * 100}% points bonus! `;
                    if (effect.drop_chance) effectStr += `${effect.drop_chance * 100}% higher drop chance! `;
                    if (effect.stat === 'drop_chance') effectStr += `${(effect.bonus) * 100}% higher drop chance!`;
                    if (effect.stat === 'max_hp') effectStr += `+${effect.bonus} Max HP!`;
                    if (effect.stat === 'coins') effectStr += `${(effect.multiplier -1) *100}% coin bonus!`;
                    if (effect.stat === 'points') effectStr += `${(effect.multiplier -1)*100}% points bonus!`;
                }
                if (effectStr) embed.addFields({ name: 'What it does:', value: effectStr });
            }

            // Find how to obtain
            let obtainFrom = [];
            // Check quests that give this item
            const questGivers = db.prepare('SELECT title FROM quests WHERE reward_item_id = ?').all(item.id);
            for (const q of questGivers) obtainFrom.push(`Complete quest: "${q.title}"`);
            
            // Check boss drops
            const bosses = [
                { difficulty: 'easy', drops: [1] }, // Health Potion
                { difficulty: 'mid', drops: [2,7,8] }, // Large Health Potion, Coin Magnet, Point Magnet
                { difficulty: 'strong', drops: [3,4,9,10] }, // Coin Booster, Point Booster, Lucky Charm, Durable Armor
                { difficulty: 'very_strong', drops: [5,10,6] } // Ultimate Health Potion, Durable Armor, Double Rewards
            ];
            for (const boss of bosses) {
                if (boss.drops.includes(item.id)) {
                    let chance;
                    if (boss.difficulty === 'easy') chance = '10%';
                    else if (boss.difficulty === 'mid') {
                        if (item.id === 2) chance = '8%';
                        else chance = '3%';
                    } else if (boss.difficulty === 'strong') {
                        if (item.id === 3 || item.id === 4) chance = '5%';
                        else if (item.id ===9) chance='7%';
                        else chance='3%';
                    } else if (boss.difficulty === 'very_strong') {
                        if (item.id ===5) chance='3%';
                        else if (item.id ===10) chance='4%';
                        else chance='1%';
                    }
                    obtainFrom.push(`Drop from ${boss.difficulty.replace('_',' ').replace(/\b\w/g, l => l.toUpperCase())} bosses (${chance})`);
                }
            }

            if (obtainFrom.length >0) embed.addFields({ name: 'Requirement:', value: obtainFrom.join('\n') });

            await interaction.editReply({ embeds: [embed] });
        }
    }
};
