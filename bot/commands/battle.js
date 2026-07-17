
const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType } = require('discord.js');
const db = require('../../database/db');
const { abilities } = require('../abilities');

const activeBattles = new Map();
const battleCooldowns = new Map();

// Helper function to calculate max HP based on health stat
function calculateMaxHP(healthStat) {
    return 25 + (healthStat * 5);
}

// Helper function to get user's abilities
function getUserAbilities(userId, serverId) {
    const userAbilities = db.prepare('SELECT ability_id FROM user_abilities WHERE user_id = ? AND server_id = ?').all(userId, serverId);
    const ownedIds = new Set(userAbilities.map(u => u.ability_id));
    return abilities.filter(a => ownedIds.has(a.id));
}

// Helper function to check cooldown
function isOnCooldown(battleId, userId, abilityId) {
    const battleCooldowns = battleCooldowns.get(battleId);
    if (!battleCooldowns) return false;
    const userCooldowns = battleCooldowns[userId];
    if (!userCooldowns) return false;
    const cooldownEnd = userCooldowns[abilityId];
    if (!cooldownEnd) return false;
    return Date.now() < cooldownEnd;
}

// Helper function to set cooldown
function setCooldown(battleId, userId, abilityId, cooldownMs) {
    const battleCooldownsMap = battleCooldowns.get(battleId);
    if (!battleCooldownsMap) return;
    if (!battleCooldownsMap[userId]) battleCooldownsMap[userId] = {};
    battleCooldownsMap[userId][abilityId] = Date.now() + cooldownMs;
}

// Helper function to get remaining cooldown time
function getCooldownRemaining(battleId, userId, abilityId) {
    const battleCooldownsMap = battleCooldowns.get(battleId);
    if (!battleCooldownsMap) return 0;
    const userCooldowns = battleCooldownsMap[userId];
    if (!userCooldowns) return 0;
    const cooldownEnd = userCooldowns[abilityId];
    if (!cooldownEnd) return 0;
    return Math.max(0, cooldownEnd - Date.now());
}

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
    },

    async handleButton(interaction) {
        const customId = interaction.customId;
        const userId = interaction.user.id;

        // Parse battle action: battle_<battleId>_<abilityId>
        if (!customId.startsWith('battle_')) return;

        const parts = customId.split('_');
        const battleId = parts[1];
        const abilityId = parts.slice(2).join('_');

        const battleState = activeBattles.get(battleId);
        if (!battleState) {
            await interaction.reply({ content: "This battle has ended!", ephemeral: true });
            return;
        }

        // Verify user is part of this battle
        if (userId !== battleState.challengerId && userId !== battleState.defenderId) {
            await interaction.reply({ content: "You're not part of this battle!", ephemeral: true });
            return;
        }

        // Check if battle is already over
        if (battleState.winner) {
            await interaction.reply({ content: "This battle has already ended!", ephemeral: true });
            return;
        }

        // Check cooldown
        if (isOnCooldown(battleId, userId, abilityId)) {
            const remaining = Math.ceil(getCooldownRemaining(battleId, userId, abilityId) / 1000);
            await interaction.reply({ content: `Ability on cooldown! ${remaining}s remaining.`, ephemeral: true });
            return;
        }

        // Get ability info
        const ability = abilities.find(a => a.id === abilityId);
        if (!ability) {
            await interaction.reply({ content: "Ability not found!", ephemeral: true });
            return;
        }

        // Check if user owns this ability
        const userAbilities = getUserAbilities(userId, battleState.serverId);
        if (!userAbilities.some(a => a.id === abilityId)) {
            await interaction.reply({ content: "You don't own this ability!", ephemeral: true });
            return;
        }

        // Determine target (opponent)
        const isChallenger = userId === battleState.challengerId;
        const targetId = isChallenger ? battleState.defenderId : battleState.challengerId;
        const targetHpKey = isChallenger ? 'defenderHp' : 'challengerHp';
        const userHpKey = isChallenger ? 'challengerHp' : 'defenderHp';

        // Apply ability effect based on type
        if (ability.healAmount) {
            // Healing ability
            const healAmount = ability.healAmount;
            battleState[userHpKey] = Math.min(battleState[isChallenger ? 'maxChallengerHp' : 'maxDefenderHp'], battleState[userHpKey] + healAmount);
            battleState.log.push(`${interaction.user.username} used ${ability.name} and healed for ${healAmount} HP!`);
        } else if (ability.baseDamage && ability.baseDamage > 0) {
            // Damage ability
            const damage = ability.baseDamage;
            battleState[targetHpKey] -= damage;
            battleState.log.push(`${interaction.user.username} used ${ability.name} for ${damage} damage!`);
        } else {
            // Support/utility ability (dodge, boost, etc.)
            battleState.log.push(`${interaction.user.username} used ${ability.name}!`);
        }

        // Set cooldown
        setCooldown(battleId, userId, abilityId, ability.cooldown);

        // Check for battle end
        if (battleState.challengerHp <= 0) {
            battleState.winner = battleState.defenderId;
            battleState.log.push(`${battleState.defenderId} wins the battle!`);
        } else if (battleState.defenderHp <= 0) {
            battleState.winner = battleState.challengerId;
            battleState.log.push(`${battleState.challengerId} wins the battle!`);
        }

        // Update embed
        const challenger = await interaction.client.users.fetch(battleState.challengerId);
        const defender = await interaction.client.users.fetch(battleState.defenderId);
        const challengerData = db.prepare('SELECT * FROM users WHERE user_id = ? AND server_id = ?').get(battleState.challengerId, battleState.serverId);
        const defenderData = db.prepare('SELECT * FROM users WHERE user_id = ? AND server_id = ?').get(battleState.defenderId, battleState.serverId);

        if (battleState.winner) {
            // Battle ended - give rewards
            const winnerId = battleState.winner;
            db.prepare('UPDATE users SET coins = coins + 10, wins = wins + 1 WHERE user_id = ? AND server_id = ?').run(winnerId, battleState.serverId);
            
            const embed = createBattleEmbed(battleState, challenger, defender, challengerData, defenderData);
            embed.addFields({ name: '🏆 Winner!', value: `<@${winnerId}> earned 10 coins!` });
            
            await interaction.update({ embeds: [embed], components: [] });
            
            // Clean up battle
            activeBattles.delete(battleId);
            battleCooldowns.delete(battleId);
        } else {
            // Battle continues - update embed with new buttons
            const embed = createBattleEmbed(battleState, challenger, defender, challengerData, defenderData);
            const components = createAbilityButtons(battleId, userId, battleState.challengerId, battleState.defenderId);
            
            await interaction.update({ embeds: [embed], components });
        }
    }
};

async function startBattle(interaction, challenger, defender, serverId, challengerData, defenderData) {
    const battleId = `${serverId}-${Date.now()}`;
    
    const challengerMaxHp = calculateMaxHP(challengerData.health);
    const defenderMaxHp = calculateMaxHP(defenderData.health);
    
    const battleState = {
        id: battleId,
        serverId,
        challengerId: challenger.id,
        defenderId: defender.id,
        challengerHp: challengerMaxHp,
        defenderHp: defenderMaxHp,
        maxChallengerHp: challengerMaxHp,
        maxDefenderHp: defenderMaxHp,
        challengerEffects: {},
        defenderEffects: {},
        log: ['Battle started!'],
        winner: null
    };

    activeBattles.set(battleId, battleState);
    battleCooldowns.set(battleId, { [challenger.id]: {}, [defender.id]: {} });

    const embed = createBattleEmbed(battleState, challenger, defender, challengerData, defenderData);
    
    // Create ability buttons for both players
    const challengerAbilities = getUserAbilities(challenger.id, serverId);
    const defenderAbilities = getUserAbilities(defender.id, serverId);
    
    const components = [];
    
    // Add challenger's abilities
    if (challengerAbilities.length > 0) {
        const challengerRow = new ActionRowBuilder();
        challengerAbilities.slice(0, 5).forEach(ability => {
            const button = new ButtonBuilder()
                .setCustomId(`battle_${battleId}_${ability.id}`)
                .setLabel(ability.name)
                .setStyle(ButtonStyle.Primary);
            challengerRow.addComponents(button);
        });
        components.push(challengerRow);
    }
    
    // Add defender's abilities
    if (defenderAbilities.length > 0) {
        const defenderRow = new ActionRowBuilder();
        defenderAbilities.slice(0, 5).forEach(ability => {
            const button = new ButtonBuilder()
                .setCustomId(`battle_${battleId}_${ability.id}`)
                .setLabel(ability.name)
                .setStyle(ButtonStyle.Danger);
            defenderRow.addComponents(button);
        });
        components.push(defenderRow);
    }

    await interaction.update({ embeds: [embed], components });
}

function createAbilityButtons(battleId, userId, challengerId, defenderId) {
    const components = [];
    const userAbilities = getUserAbilities(userId, activeBattles.get(battleId).serverId);
    
    if (userAbilities.length > 0) {
        const row = new ActionRowBuilder();
        userAbilities.slice(0, 5).forEach(ability => {
            const isOnCooldown = isOnCooldown(battleId, userId, ability.id);
            const button = new ButtonBuilder()
                .setCustomId(`battle_${battleId}_${ability.id}`)
                .setLabel(ability.name)
                .setStyle(isOnCooldown ? ButtonStyle.Secondary : ButtonStyle.Primary)
                .setDisabled(isOnCooldown);
            row.addComponents(button);
        });
        components.push(row);
    }
    
    return components;
}

function createBattleEmbed(battleState, challenger, defender, challengerData, defenderData) {
    const embed = new EmbedBuilder()
        .setColor('#8B4513')
        .setTitle('⚔️ Medieval Battle Arena')
        .addFields(
            { name: `${challengerData.game_username || challenger.username}`, value: `❤️ HP: ${Math.max(0, battleState.challengerHp)}/${battleState.maxChallengerHp}`, inline: true },
            { name: 'VS', value: '⚔️', inline: true },
            { name: `${defenderData.game_username || defender.username}`, value: `❤️ HP: ${Math.max(0, battleState.defenderHp)}/${battleState.maxDefenderHp}`, inline: true }
        )
        .setTimestamp();
    
    if (battleState.log.length > 0) {
        embed.addFields({ name: 'Battle Log', value: battleState.log.slice(-5).join('\n') });
    }
    
    return embed;
}
