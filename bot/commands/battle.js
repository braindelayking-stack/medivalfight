
const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const db = require('../../database/db');

const activeBattles = new Map();
const cooldowns = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('battle')
        .setDescription('Challenge another player to a battle!')
        .addUserOption(option =>
            option.setName('opponent')
                .setDescription('The user to battle')
                .setRequired(true)),
    async execute(interaction) {
        const challenger = interaction.user;
        const defender = interaction.options.getUser('opponent');
        const serverId = interaction.guild.id;

        if (challenger.id === defender.id) {
            await interaction.reply({ content: "You can't battle yourself!", ephemeral: true });
            return;
        }

        if (defender.bot) {
            await interaction.reply({ content: "You can't battle a bot!", ephemeral: true });
            return;
        }

        let challengerData = db.prepare('SELECT * FROM users WHERE user_id = ? AND server_id = ?').get(challenger.id, serverId);
        let defenderData = db.prepare('SELECT * FROM users WHERE user_id = ? AND server_id = ?').get(defender.id, serverId);

        if (!challengerData) {
            await interaction.reply({ content: "You need a profile first! Use /profile.", ephemeral: true });
            return;
        }
        if (!defenderData) {
            await interaction.reply({ content: "Your opponent needs a profile first!", ephemeral: true });
            return;
        }

        const acceptButton = new ButtonBuilder()
            .setCustomId('accept_battle')
            .setLabel('Accept Battle')
            .setStyle(ButtonStyle.Success);
        const declineButton = new ButtonBuilder()
            .setCustomId('decline_battle')
            .setLabel('Decline')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(acceptButton, declineButton);
        const embed = new EmbedBuilder()
            .setColor('#8B4513')
            .setTitle('⚔️ Battle Challenge!')
            .setDescription(`${challenger} challenges ${defender} to battle! Do you accept?`);

        const challengeMsg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

        const filter = i => ['accept_battle', 'decline_battle'].includes(i.customId) && i.user.id === defender.id;
        try {
            const i = await challengeMsg.awaitMessageComponent({ filter, time: 60000 });
            if (i.customId === 'decline_battle') {
                await i.update({ content: `${defender} declined the battle!`, embeds: [], components: [] });
                return;
            }

            await startBattle(i, challenger, defender, serverId, challengerData, defenderData);
        } catch (e) {
            console.error(e);
            await interaction.editReply({ content: "Battle timed out!", embeds: [], components: [] });
        }
    }
};

async function startBattle(interaction, challenger, defender, serverId, challengerData, defenderData) {
    const battleId = `${serverId}-${Date.now()}`;
    const battleState = {
        id: battleId,
        serverId,
        challengerId: challenger.id,
        defenderId: defender.id,
        challengerHp: challengerData.health || 100,
        defenderHp: defenderData.health || 100,
        maxChallengerHp: challengerData.health || 100,
        maxDefenderHp: defenderData.health || 100,
        challengerEffects: {},
        defenderEffects: {},
        log: []
    };

    activeBattles.set(battleId, battleState);
    cooldowns.set(battleId, { [challenger.id]: {}, [defender.id]: {} });

    const embed = createBattleEmbed(battleState, challenger, defender, challengerData, defenderData);
    await interaction.update({ embeds: [embed], components: [] });
}

function createBattleEmbed(battleState, challenger, defender, challengerData, defenderData) {
    const embed = new EmbedBuilder()
        .setColor('#8B4513')
        .setTitle('⚔️ Medieval Battle Arena')
        .addFields(
            { name: `${challengerData.game_username}`, value: `❤️ HP: ${battleState.challengerHp}/${battleState.maxChallengerHp}`, inline: true },
            { name: 'VS', value: '⚔️', inline: true },
            { name: `${defenderData.game_username}`, value: `❤️ HP: ${battleState.defenderHp}/${battleState.maxDefenderHp}`, inline: true }
        )
        .setTimestamp();
    if (battleState.log.length > 0) {
        embed.addFields({ name: 'Battle Log', value: battleState.log.slice(-5).join('\n') });
    }
    return embed;
}
