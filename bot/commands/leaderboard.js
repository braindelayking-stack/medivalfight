
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database/db');

// Calculate level and XP (same as profile.js)
function calculateLevel(totalPoints) {
    let totalXp = 0;
    let level = 1;
    
    // Find current level
    while (totalXp + (10 + (level - 1) * 5) <= totalPoints) {
        totalXp += 10 + (level - 1) * 5;
        level++;
    }

    const xpNeededForNextLevel = 10 + (level - 1) * 5;
    const currentXp = totalPoints - totalXp;
    const requiredXp = xpNeededForNextLevel;
    const percentage = Math.min(100, Math.max(0, (currentXp / requiredXp) * 100));

    return { level, currentXp, requiredXp, percentage };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View server leaderboards')
        .addStringOption(option =>
            option.setName('category')
                .setDescription('Leaderboard category')
                .setRequired(true)
                .addChoices(
                    { name: 'Coins', value: 'coins' },
                    { name: 'Wins', value: 'wins' },
                    { name: 'Levels', value: 'levels' }
                )),
    async execute(interaction) {
        const category = interaction.options.getString('category');
        const serverId = interaction.guild.id;

        let users;
        if (category === 'coins') {
            users = db.prepare('SELECT * FROM users WHERE server_id = ? ORDER BY coins DESC LIMIT 10').all(serverId);
        } else if (category === 'wins') {
            users = db.prepare('SELECT * FROM users WHERE server_id = ? ORDER BY wins DESC LIMIT 10').all(serverId);
        } else if (category === 'levels') {
            users = db.prepare('SELECT * FROM users WHERE server_id = ? ORDER BY total_points_spent DESC LIMIT 10').all(serverId);
        } else {
            await interaction.reply({ content: 'Invalid category!' });
            return;
        }

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle(`🏆 Medieval Leaderboard: ${category.charAt(0).toUpperCase() + category.slice(1)}`)
            .setThumbnail('https://cdn.pixabay.com/photo/2017/01/31/20/23/crown-2026294_1280.png')
            .setTimestamp()
            .setFooter({ text: 'May the greatest warrior win!', iconURL: interaction.guild.iconURL() });

        if (users.length === 0) {
            embed.setDescription('No users found!');
        } else {
            const fields = users.map((user, index) => {
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
                if (category === 'levels') {
                    const levelData = calculateLevel(user.total_points_spent);
                    return { name: `${medal} ${user.game_username}`, value: `Level **${levelData.level}** (${levelData.currentXp}/${levelData.requiredXp} XP)`, inline: false };
                }
                const categoryEmoji = category === 'coins' ? '💰' : '⚔️';
                return { name: `${medal} ${user.game_username}`, value: `${categoryEmoji} ${category}: **${user[category]}**`, inline: false };
            });
            embed.addFields(fields);
        }

        await interaction.reply({ embeds: [embed] });
    }
};
