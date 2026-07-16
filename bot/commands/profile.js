
const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const db = require('../../database/db');

const stats = ['strength', 'wealth', 'health', 'agility', 'composure'];

// Calculate level and XP (arithmetic sequence: 10, 15, 20, ... per level)
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

// Calculate player's max HP (base 25 + 5 per health point)
function calculatePlayerMaxHP(userData) {
    return 25 + (userData.health * 5);
}

function createEmbed(userData, user) {
    const levelData = calculateLevel(userData.total_points_spent);
    const xpBarLength = 20;
    const filledLength = Math.round((levelData.percentage / 100) * xpBarLength);
    const xpBar = '█'.repeat(filledLength) + '░'.repeat(xpBarLength - filledLength);
    const maxHP = calculatePlayerMaxHP(userData);

    const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setAuthor({ 
            name: userData.game_username || user.username, 
            iconURL: userData.game_avatar || user.displayAvatarURL(),
            url: 'https://example.com'
        })
        .setThumbnail(userData.game_avatar || user.displayAvatarURL())
        .setTitle('⚔️ Medieval Warrior Profile')
        .setDescription('Your journey in the medieval realm continues...')
        .addFields(
            { 
                name: '📊 Royal Treasury', 
                value: `💎 Points: **${userData.points}**\n💰 Coins: **${userData.coins}**\n⚔️ Wins: **${userData.wins}**\n👹 Boss Wins: **${userData.boss_wins}**\n❤️ Max HP: **${maxHP}**\n📈 Total Spent: **${userData.total_points_spent}**`, 
                inline: true 
            },
            { 
                name: '🛡️ Attributes', 
                value: `💪 Strength: **${userData.strength}**\n🏛️ Wealth: **${userData.wealth}**\n❤️ Health: **${userData.health}**\n🏃 Agility: **${userData.agility}**\n🧘 Composure: **${userData.composure}**`, 
                inline: true 
            },
            { 
                name: `🎖️ Level ${levelData.level}`, 
                value: `XP: **${levelData.currentXp}**/**${levelData.requiredXp}**\n${xpBar} ${Math.round(levelData.percentage)}%`, 
                inline: false 
            }
        )
        .setTimestamp()
        .setFooter({ 
            text: 'Use the buttons below to upgrade your attributes! May your sword stay sharp!', 
            iconURL: user.displayAvatarURL()
        });
    return embed;
}

function createButtons() {
    // Helper to create upgrade buttons for a stat with different increments
    const createStatButtons = (stat, label) => {
        return [
            new ButtonBuilder()
                .setCustomId(`upgrade_${stat}_1`)
                .setLabel(`+1 ${label}`)
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`upgrade_${stat}_5`)
                .setLabel(`+5 ${label}`)
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`upgrade_${stat}_10`)
                .setLabel(`+10 ${label}`)
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`upgrade_${stat}_25`)
                .setLabel(`+25 ${label}`)
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`upgrade_${stat}_100`)
                .setLabel(`+100 ${label}`)
                .setStyle(ButtonStyle.Danger)
        ];
    };

    const row1 = new ActionRowBuilder().addComponents(...createStatButtons('strength', 'Strength'));
    const row2 = new ActionRowBuilder().addComponents(...createStatButtons('wealth', 'Wealth'));
    const row3 = new ActionRowBuilder().addComponents(...createStatButtons('health', 'Health'));
    const row4 = new ActionRowBuilder().addComponents(...createStatButtons('agility', 'Agility'));
    const row5 = new ActionRowBuilder().addComponents(...createStatButtons('composure', 'Composure'));

    return [row1, row2, row3, row4, row5];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('View or manage your medieval profile'),
    async execute(interaction) {
        const userId = interaction.user.id;
        const serverId = interaction.guild.id;

        let userData = db.prepare('SELECT * FROM users WHERE user_id = ? AND server_id = ?').get(userId, serverId);
        if (!userData) {
            db.prepare(`
                INSERT INTO users (user_id, server_id, game_username, game_avatar, points, coins, strength, wealth, health, agility, composure, total_points_spent, wins, boss_wins)
                VALUES (?, ?, ?, ?, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
            `).run(userId, serverId, interaction.user.username, interaction.user.displayAvatarURL());
            userData = db.prepare('SELECT * FROM users WHERE user_id = ? AND server_id = ?').get(userId, serverId);
        }

        const embed = createEmbed(userData, interaction.user);
        const buttons = createButtons();

        await interaction.reply({ embeds: [embed], components: buttons });
    },
    async handleButton(interaction) {
        if (!interaction.isButton()) return;
        if (!interaction.customId.startsWith('upgrade_')) return;

        const parts = interaction.customId.split('_');
        if (parts.length !== 3) return;
        const stat = parts[1];
        const amount = parseInt(parts[2], 10);

        if (!stats.includes(stat)) return;
        if (isNaN(amount) || amount <= 0) return;

        const userId = interaction.user.id;
        const serverId = interaction.guild.id;

        let userData = db.prepare('SELECT * FROM users WHERE user_id = ? AND server_id = ?').get(userId, serverId);
        if (!userData) return;

        if (userData.points < amount) {
            await interaction.reply({ content: `Not enough points! You need ${amount} points, but only have ${userData.points}!`, ephemeral: true });
            return;
        }

        db.prepare(`
            UPDATE users 
            SET ${stat} = ${stat} + ?, 
                points = points - ?, 
                total_points_spent = total_points_spent + ? 
            WHERE user_id = ? AND server_id = ?
        `).run(amount, amount, amount, userId, serverId);

        userData = db.prepare('SELECT * FROM users WHERE user_id = ? AND server_id = ?').get(userId, serverId);

        const embed = createEmbed(userData, interaction.user);
        const buttons = createButtons();

        await interaction.update({ embeds: [embed], components: buttons });
    }
};
