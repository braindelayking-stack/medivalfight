
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const db = require('../../database/db');
const path = require('path');
const { updateQuestProgress, giveItemToUser } = require('../utils');

// Boss data with images and difficulty tiers
const bosses = [
    // Easy Bosses (<=100 HP)
    {
        id: 'golem',
        name: 'Golem',
        health: 100,
        maxHealth: 100,
        difficulty: 'easy',
        image: path.join(__dirname, '../../dashboard/public/golem.png'),
        attacks: [
            { name: 'Golem Attack', damage: 10, weight: 60 },
            { name: 'Poison Attack', damage: 5, duration: 3, poison: true, weight: 10 },
            { name: 'Shield', blockChance: 0.1, weight: 30 }
        ],
        reward: 100
    },
    {
        id: 'dragon',
        name: 'Dragon',
        health: 100,
        maxHealth: 100,
        difficulty: 'easy',
        image: path.join(__dirname, '../../dashboard/public/dragon.png'),
        attacks: [
            { name: 'Dragon Attack', damage: 20, weight: 60 },
            { name: 'Fire Attack', burnMultiplier: 1.5, duration: 10, weight: 30 },
            { name: 'Shield', blockChance: 0.1, weight: 10 }
        ],
        reward: 100
    },
    {
        id: 'skeleton',
        name: 'Skeleton',
        health: 100,
        maxHealth: 100,
        difficulty: 'easy',
        image: path.join(__dirname, '../../dashboard/public/skeleton.png'),
        attacks: [
            { name: 'Skeleton Attack', damage: 15, weight: 60 },
            { name: 'Shield', blockChance: 0.1, weight: 35 },
            { name: 'Skeleton Army', stunDuration: 5, damagePerSecond: 1, weight: 5 }
        ],
        reward: 100
    },
    // Mid Bosses (150-200 HP)
    {
        id: 'wraith_king',
        name: 'Wraith King',
        health: 150,
        maxHealth: 150,
        difficulty: 'mid',
        image: path.join(__dirname, '../../dashboard/public/wraith_king.png'),
        attacks: [
            { name: 'Spectral Slash', damage: 18, weight: 50 },
            { name: 'Soul Drain', damage: 12, healBoss: 10, weight: 25 },
            { name: 'Wraith Summon', addDamageTurns: 3, addDamageAmount: 5, weight: 15 },
            { name: 'Phantom Shield', blockAttacks: 2, weight: 10 }
        ],
        reward: 200
    },
    {
        id: 'vampire_lord',
        name: 'Vampire Lord',
        health: 150,
        maxHealth: 150,
        difficulty: 'mid',
        image: path.join(__dirname, '../../dashboard/public/vampire_lord.png'),
        attacks: [
            { name: 'Blood Slash', damage: 15, weight: 60 },
            { name: 'Blood Drain', damage: 10, healBoss: 10, weight: 25 },
            { name: 'Dark Mist', immuneNextAttack: true, weight: 15 }
        ],
        reward: 250
    },
    {
        id: 'storm_elemental',
        name: 'Storm Elemental',
        health: 200,
        maxHealth: 200,
        difficulty: 'mid',
        image: path.join(__dirname, '../../dashboard/public/storm_elemental.png'),
        attacks: [
            { name: 'Lightning Strike', damage: 20, weight: 60 },
            { name: 'Thunder Shock', stunDuration: 3, weight: 25 },
            { name: 'Electric Shield', reflectChance: 0.2, weight: 15 }
        ],
        reward: 300
    },
    {
        id: 'fire_elemental',
        name: 'Fire Elemental',
        health: 200,
        maxHealth: 200,
        difficulty: 'mid',
        image: path.join(__dirname, '../../dashboard/public/fire_elemental.png'),
        attacks: [
            { name: 'Inferno Blast', damage: 25, weight: 40 },
            { name: 'Firestorm', damage: 10, burnMultiplier: 1.5, duration: 8, weight: 30 },
            { name: 'Heat Wave', extraAbilityCost: 1, weight: 15 },
            { name: 'Magma Barrier', blockPercent: 0.5, turns: 3, weight: 15 }
        ],
        reward: 350
    },
    // Strong Bosses (250-300 HP)
    {
        id: 'ice_giant',
        name: 'Ice Giant',
        health: 250,
        maxHealth: 250,
        difficulty: 'strong',
        image: path.join(__dirname, '../../dashboard/public/ice_giant.png'),
        attacks: [
            { name: 'Frozen Strike', damage: 25, weight: 60 },
            { name: 'Ice Prison', freezeDuration: 4, weight: 30 },
            { name: 'Ice Shield', blockNextAttack: true, weight: 10 }
        ],
        reward: 400
    },
    {
        id: 'shadow_assassin',
        name: 'Shadow Assassin',
        health: 250,
        maxHealth: 250,
        difficulty: 'strong',
        image: path.join(__dirname, '../../dashboard/public/shadow_assassin.png'),
        attacks: [
            { name: 'Shadow Strike', damage: 40, weight: 50 },
            { name: 'Smoke Bomb', nextAttacksMiss: 2, weight: 30 },
            { name: 'Poison Blade', poisonDamage: 5, duration: 10, weight: 20 }
        ],
        reward: 450
    },
    {
        id: 'ancient_phoenix',
        name: 'Ancient Phoenix',
        health: 300,
        maxHealth: 300,
        difficulty: 'strong',
        image: path.join(__dirname, '../../dashboard/public/ancient_phoenix.png'),
        attacks: [
            { name: 'Flame Burst', damage: 30, weight: 60 },
            { name: 'Burning Wings', burnMultiplier: 1.5, duration: 5, weight: 30 },
            { name: 'Rebirth Flame', healBoss: 75, weight: 10 }
        ],
        reward: 500
    },
    {
        id: 'ancient_mummy',
        name: 'Ancient Mummy',
        health: 300,
        maxHealth: 300,
        difficulty: 'strong',
        image: path.join(__dirname, '../../dashboard/public/ancient_mummy.png'),
        attacks: [
            { name: 'Curse Strike', damage: 20, weight: 60 },
            { name: 'Ancient Curse', damageReduction: 0.3, duration: 10, weight: 30 },
            { name: 'Resurrection', healBoss: 50, weight: 10 }
        ],
        reward: 550
    },
    {
        id: 'lich_lord',
        name: 'Lich Lord',
        health: 275,
        maxHealth: 275,
        difficulty: 'strong',
        image: path.join(__dirname, '../../dashboard/public/lich_lord.png'),
        attacks: [
            { name: 'Death Ray', damage: 30, weight: 35 },
            { name: 'Curse of Decay', poisonDamage: 8, duration: 5, weight: 25 },
            { name: 'Raise Undead', addDamageTurns: 2, addDamageAmount: 10, weight: 20 },
            { name: 'Bone Shield', blockAllTurns: 1, weight: 10 },
            { name: 'Life Steal', damage: 20, healBoss: 20, weight: 10 }
        ],
        reward: 600
    },
    // Very Strong Bosses (>300 HP)
    {
        id: 'demon_king',
        name: 'Demon King',
        health: 350,
        maxHealth: 350,
        difficulty: 'very_strong',
        image: path.join(__dirname, '../../dashboard/public/demon_king.png'),
        attacks: [
            { name: 'Demon Blade', damage: 30, weight: 60 },
            { name: 'Hellfire', burnMultiplier: 1.5, duration: 5, weight: 30 },
            { name: 'Dark Barrier', damageReduction: 0.5, weight: 10 }
        ],
        reward: 700
    },
    {
        id: 'sea_kraken',
        name: 'Sea Kraken',
        health: 400,
        maxHealth: 400,
        difficulty: 'very_strong',
        image: path.join(__dirname, '../../dashboard/public/sea_kraken.png'),
        attacks: [
            { name: 'Tentacle Smash', damage: 35, weight: 60 },
            { name: 'Water Prison', attackPrevention: 5, weight: 25 },
            { name: 'Tidal Wave', dotDamage: 15, duration: 5, weight: 15 }
        ],
        reward: 800
    },
    {
        id: 'void_destroyer',
        name: 'Void Destroyer',
        health: 500,
        maxHealth: 500,
        difficulty: 'very_strong',
        image: path.join(__dirname, '../../dashboard/public/void_destroyer.png'),
        attacks: [
            { name: 'Void Blast', damage: 50, weight: 60 },
            { name: 'Reality Break', disableAbilities: 5, weight: 25 },
            { name: 'Void Shield', blockAttacks: 2, weight: 15 }
        ],
        reward: 1000
    }
];

// Store active boss fights
const activeBossFights = new Map();

// Helper to pick weighted random attack
function pickAttack(attacks) {
    const totalWeight = attacks.reduce((sum, a) => sum + a.weight, 0);
    let random = Math.random() * totalWeight;
    for (const attack of attacks) {
        random -= attack.weight;
        if (random <= 0) return attack;
    }
    return attacks[0];
}

// Calculate player's max HP (base 25 + 5 per health point)
function calculatePlayerMaxHP(userData) {
    return 25 + (userData.health * 5);
}

// Generate random fight code
function generateFightCode() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

module.exports = {
    async autocomplete(interaction) {
        const focusedOption = interaction.options.getFocused(true);
        let choices = bosses.map(b => ({ name: b.name, value: b.id }));
        const filtered = choices.filter(choice => choice.name.toLowerCase().includes(focusedOption.value.toLowerCase()));
        await interaction.respond(filtered.map(choice => ({ name: choice.name, value: choice.value })));
    },
    data: new SlashCommandBuilder()
        .setName('boss')
        .setDescription('Boss commands!')
        .addSubcommand(subcommand =>
            subcommand.setName('fight')
                .setDescription('Fight a boss!')
                .addStringOption(option =>
                    option.setName('boss')
                        .setDescription('Choose a boss')
                        .setAutocomplete(true)
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand.setName('inspect')
                .setDescription('View details of a boss!')
                .addStringOption(option =>
                    option.setName('boss')
                        .setDescription('Choose a boss')
                        .setAutocomplete(true)
                        .setRequired(true))),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        if (subcommand === 'inspect') {
            await interaction.deferReply();
            const bossId = interaction.options.getString('boss');
            const boss = bosses.find(b => b.id === bossId);
            
            // Determine difficulty tier
            let difficulty, embedColor;
            if (boss.maxHealth <= 100) {
                difficulty = '🟢 Easy';
                embedColor = '#228B22';
            } else if (boss.maxHealth <= 200) {
                difficulty = '🟡 Mid';
                embedColor = '#FFD700';
            } else if (boss.maxHealth <= 300) {
                difficulty = '🔴 Strong';
                embedColor = '#FF4500';
            } else {
                difficulty = '⚫ Very Strong';
                embedColor = '#4B0082';
            }
            
            // Format attacks
            const attackList = boss.attacks.map(attack => {
                let attackInfo = `• **${attack.name}** (${Math.round(attack.weight)}% chance)`;
                if (attack.damage) attackInfo += ` - ${attack.damage} dmg`;
                if (attack.healBoss) attackInfo += ` - heals boss ${attack.healBoss} HP`;
                if (attack.poison) attackInfo += ` - poison (${attack.damage} dmg/sec for ${attack.duration}s)`;
                if (attack.poisonDamage) attackInfo += ` - poison (${attack.poisonDamage} dmg/sec for ${attack.duration}s)`;
                if (attack.burnMultiplier) attackInfo += ` - burn (${attack.burnMultiplier}x dmg for ${attack.duration}s)`;
                if (attack.stunDuration) attackInfo += ` - stuns for ${attack.stunDuration}s`;
                if (attack.damagePerSecond) attackInfo += ` - ${attack.damagePerSecond} dmg/sec for ${attack.stunDuration}s`;
                if (attack.blockChance) attackInfo += ` - ${Math.round(attack.blockChance * 100)}% block chance`;
                if (attack.blockNextAttack) attackInfo += ` - blocks next attack`;
                if (attack.blockAttacks) attackInfo += ` - blocks next ${attack.blockAttacks} attacks`;
                if (attack.immuneNextAttack) attackInfo += ` - boss immune to next attack`;
                if (attack.reflectChance) attackInfo += ` - ${Math.round(attack.reflectChance * 100)}% reflect chance`;
                if (attack.freezeDuration) attackInfo += ` - freezes for ${attack.freezeDuration}s`;
                if (attack.nextAttacksMiss) attackInfo += ` - next ${attack.nextAttacksMiss} attacks miss`;
                if (attack.damageReduction) attackInfo += ` - reduces your damage by ${Math.round(attack.damageReduction * 100)}% for ${attack.duration}s`;
                if (attack.dotDamage) attackInfo += ` - ${attack.dotDamage} dmg/sec for ${attack.duration}s`;
                if (attack.attackPrevention) attackInfo += ` - prevents attacking for ${attack.attackPrevention}s`;
                if (attack.disableAbilities) attackInfo += ` - disables your abilities for ${attack.disableAbilities}s`;
                if (attack.addDamageTurns) attackInfo += ` - ${attack.addDamageAmount} extra dmg/sec for ${attack.addDamageTurns}s`;
                return attackInfo;
            }).join('\n');

            const embed = new EmbedBuilder()
                .setColor(embedColor)
                .setTitle(`👹 ${boss.name}`)
                .setDescription(`${difficulty} Boss`)
                .addFields(
                    { name: '❤️ Max Health', value: `${boss.maxHealth}`, inline: true },
                    { name: '💰 Reward', value: `${boss.reward} coins`, inline: true },
                    { name: '🗡️ Attacks', value: attackList, inline: false }
                )
                .setThumbnail('https://cdn-icons-png.flaticon.com/512/2232/2232688.png');
            
            await interaction.editReply({ embeds: [embed] });
            return;
        }

        // Fight subcommand
        await interaction.deferReply();
        const bossId = interaction.options.getString('boss');
        const boss = bosses.find(b => b.id === bossId);
        const userId = interaction.user.id;
        const serverId = interaction.guild.id;

        let userData = db.prepare('SELECT * FROM users WHERE user_id = ? AND server_id = ?').get(userId, serverId);
        if (!userData) {
            await interaction.reply({ content: 'You need a profile first! Use /profile', ephemeral: false });
            return;
        }

        // Check if user is already in a fight
        if (activeBossFights.has(`${serverId}-${userId}`)) {
            await interaction.reply({ content: 'You are already in a boss fight!', ephemeral: false });
            return;
        }

        // Create new fight state
        const playerMaxHP = calculatePlayerMaxHP(userData);
        const fightCode = generateFightCode();
        const fightState = {
            id: `${serverId}-${userId}`,
            userId,
            serverId,
            user: interaction.user,
            userData,
            playerHP: playerMaxHP,
            playerMaxHP,
            bossHP: boss.health,
            bossMaxHP: boss.health,
            boss: { ...boss },
            log: [],
            damageGiven: 0,
            damageTaken: 0,
            fightCode,
            lastStandUsed: false,
            userEffects: {
                poison: { active: false, duration: 0, damage: 0 },
                burn: { active: false, duration: 0, multiplier: 1 },
                stun: { active: false, duration: 0, damagePerSecond: 0 },
                attackBoost: { active: false, multiplier: 1 },
                dodge: { active: false, chance: 0 },
                composure: { active: false, damageReduction: 0 },
                increasedDamageTaken: { active: false, multiplier: 1 },
                ironWill: { active: false, duration: 0 },
                skipBossAttack: { active: false },
                playerDamageReduction: { active: false, duration: 0, amount: 0 },
                dotDamage: { active: false, duration: 0, damage: 0 },
                addDamage: { active: false, duration: 0, damage: 0 },
                attackPrevented: { active: false, duration: 0 },
                abilitiesDisabled: { active: false, duration: 0 },
                freezes: { active: false, duration: 0 }
            },
            bossEffects: {
                shield: { active: false, blockChance: 0 },
                stun: { active: false, duration: 0 },
                blockAttacks: 0,
                immuneNextAttack: false,
                blockNextAttack: false,
                reflectChance: 0
            },
            lastUpdate: Date.now()
        };

        activeBossFights.set(fightState.id, fightState);

        // Send initial embed
        const { embed, row } = createBossEmbed(fightState);
        await interaction.editReply({ embeds: [embed], components: [row] });
        const message = await interaction.fetchReply();
        fightState.messageId = message.id;

        // Start boss attack interval (every 3 seconds)
        const intervalId = setInterval(async () => {
            if (!activeBossFights.has(fightState.id)) {
                clearInterval(intervalId);
                return;
            }
            await processBossTurn(fightState, message);
        }, 3000);
        fightState.intervalId = intervalId;
    },
    // Export for other commands
    activeBossFights,
    calculatePlayerMaxHP,
    createBossEmbed,
    endBossFight,
    handleButton
};

function createBossEmbed(state) {
    const playerAvatar = state.userData.game_avatar || state.user.displayAvatarURL({ dynamic: true });

    const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle(`⚔️ BOSS FIGHT ⚔️`)
        .setAuthor({ name: state.userData.game_username, iconURL: playerAvatar })
        .setDescription(`${state.userData.game_username} vs ${state.boss.name}`)
        .addFields(
            { name: `🛡️ ${state.userData.game_username}`, value: `❤️ HP: ${Math.max(0, state.playerHP)}/${state.playerMaxHP}`, inline: true },
            { name: `\u200b`, value: `\u200b`, inline: true },
            { name: `👹 ${state.boss.name}`, value: `❤️ HP: ${Math.max(0, state.bossHP)}/${state.bossMaxHP}`, inline: true },
            { name: `📋 Fight Code`, value: `#${state.fightCode}`, inline: false }
        )
        .setTimestamp();

    if (state.log.length > 0) {
        embed.addFields({ name: '📜 Fight Log', value: state.log.slice(-8).join('\n'), inline: false });
    }

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`battle_log_${state.fightCode}`)
                .setLabel('Show Full Log')
                .setStyle(ButtonStyle.Primary)
        );

    return { embed, row };
}

async function processBossTurn(state, message) {
    // Process ongoing effects first
    let damageTaken = 0;
    const effectsLog = [];

    // Poison
    if (state.userEffects.poison.active) {
        damageTaken += state.userEffects.poison.damage;
        effectsLog.push(`☠️ Poison deals ${state.userEffects.poison.damage} damage!`);
        state.userEffects.poison.duration--;
        if (state.userEffects.poison.duration <= 0) {
            state.userEffects.poison.active = false;
        }
    }

    // DOT Damage
    if (state.userEffects.dotDamage.active) {
        damageTaken += state.userEffects.dotDamage.damage;
        effectsLog.push(`🌊 DOT deals ${state.userEffects.dotDamage.damage} damage!`);
        state.userEffects.dotDamage.duration--;
        if (state.userEffects.dotDamage.duration <= 0) {
            state.userEffects.dotDamage.active = false;
        }
    }

    // Additional Damage
    if (state.userEffects.addDamage.active) {
        damageTaken += state.userEffects.addDamage.damage;
        effectsLog.push(`💀 Additional damage deals ${state.userEffects.addDamage.damage} damage!`);
        state.userEffects.addDamage.duration--;
        if (state.userEffects.addDamage.duration <= 0) {
            state.userEffects.addDamage.active = false;
        }
    }

    // Burn (only affects next incoming damage, handled when taking damage)
    if (state.userEffects.burn.active) {
        state.userEffects.burn.duration--;
        if (state.userEffects.burn.duration <= 0) {
            state.userEffects.burn.active = false;
            state.userEffects.burn.multiplier = 1;
        }
    }

    // Stun (dot damage)
    if (state.userEffects.stun.active) {
        damageTaken += state.userEffects.stun.damagePerSecond;
        effectsLog.push(`💀 Skeleton Army deals ${state.userEffects.stun.damagePerSecond} damage!`);
        state.userEffects.stun.duration--;
        if (state.userEffects.stun.duration <= 0) {
            state.userEffects.stun.active = false;
        }
    }

    // Iron Will duration
    if (state.userEffects.ironWill.active) {
        state.userEffects.ironWill.duration--;
        if (state.userEffects.ironWill.duration <= 0) {
            state.userEffects.ironWill.active = false;
        }
    }

    // Player damage reduction duration
    if (state.userEffects.playerDamageReduction.active) {
        state.userEffects.playerDamageReduction.duration--;
        if (state.userEffects.playerDamageReduction.duration <= 0) {
            state.userEffects.playerDamageReduction.active = false;
        }
    }

    // Attack prevention duration
    if (state.userEffects.attackPrevented.active) {
        state.userEffects.attackPrevented.duration--;
        if (state.userEffects.attackPrevented.duration <= 0) {
            state.userEffects.attackPrevented.active = false;
        }
    }

    // Abilities disabled duration
    if (state.userEffects.abilitiesDisabled.active) {
        state.userEffects.abilitiesDisabled.duration--;
        if (state.userEffects.abilitiesDisabled.duration <= 0) {
            state.userEffects.abilitiesDisabled.active = false;
        }
    }

    // Freeze duration
    if (state.userEffects.freezes.active) {
        state.userEffects.freezes.duration--;
        if (state.userEffects.freezes.duration <= 0) {
            state.userEffects.freezes.active = false;
        }
    }

    // Boss stun duration
    if (state.bossEffects.stun.active) {
        state.bossEffects.stun.duration--;
        if (state.bossEffects.stun.duration <= 0) {
            state.bossEffects.stun.active = false;
        }
    }

    // Apply damage from effects
    if (damageTaken > 0) {
        let adjustedDamage = damageTaken;
        if (state.userEffects.ironWill.active) {
            adjustedDamage = Math.round(adjustedDamage * 0.5);
        }
        state.playerHP -= adjustedDamage;
        state.damageTaken += adjustedDamage;
    }

    if (effectsLog.length > 0) {
        state.log.push(...effectsLog);
    }

    // Check if player died from effects
    if (state.playerHP <= 0) {
        await endBossFight(state, message, false);
        return;
    }

    // Check if we should skip boss attack or boss is stunned
    if (state.userEffects.skipBossAttack.active) {
        state.log.push(`💵 Boss's attack was skipped!`);
        state.userEffects.skipBossAttack.active = false;
    } else if (state.bossEffects.stun.active) {
        state.log.push(`👤 Boss is stunned and can't attack!`);
    } else {
        // Now boss attacks
        const attack = pickAttack(state.boss.attacks);
        let attackLog = [];

        if (attack.damage) {
            let damage = attack.damage;
            // Check dodge
            if (state.userEffects.dodge.active) {
                if (Math.random() < state.userEffects.dodge.chance) {
                    attackLog.push(`🏃 You dodged the attack!`);
                    state.userEffects.dodge = { active: false, chance: 0 };
                } else {
                    // Apply burn multiplier if active
                    if (state.userEffects.burn.active) {
                        damage = Math.round(damage * state.userEffects.burn.multiplier);
                    }
                    // Apply composure defense if active and low health
                    if (state.userEffects.composure.active && state.playerHP / state.playerMaxHP < 0.2) {
                        damage = Math.round(damage * (1 - state.userEffects.composure.damageReduction));
                        state.userEffects.composure = { active: false, damageReduction: 0 };
                    }
                    // Apply iron will
                    if (state.userEffects.ironWill.active) {
                        damage = Math.round(damage * 0.5);
                    }
                    // Apply increased damage taken
                    if (state.userEffects.increasedDamageTaken.active) {
                        damage = Math.round(damage * state.userEffects.increasedDamageTaken.multiplier);
                        state.userEffects.increasedDamageTaken = { active: false, multiplier: 1 };
                    }
                    // Apply player damage reduction
                    if (state.userEffects.playerDamageReduction.active) {
                        damage = Math.round(damage * (1 - state.userEffects.playerDamageReduction.amount));
                    }
                    state.playerHP -= damage;
                    state.damageTaken += damage;
                    attackLog.push(`👹 ${state.boss.name} uses ${attack.name} dealing ${damage} damage!`);
                    state.userEffects.dodge = { active: false, chance: 0 };
                }
            } else {
                // Apply burn multiplier if active
                if (state.userEffects.burn.active) {
                    damage = Math.round(damage * state.userEffects.burn.multiplier);
                }
                // Apply composure defense if active and low health
                if (state.userEffects.composure.active && state.playerHP / state.playerMaxHP < 0.2) {
                    damage = Math.round(damage * (1 - state.userEffects.composure.damageReduction));
                    state.userEffects.composure = { active: false, damageReduction: 0 };
                }
                // Apply iron will
                if (state.userEffects.ironWill.active) {
                    damage = Math.round(damage * 0.5);
                }
                // Apply increased damage taken
                if (state.userEffects.increasedDamageTaken.active) {
                    damage = Math.round(damage * state.userEffects.increasedDamageTaken.multiplier);
                    state.userEffects.increasedDamageTaken = { active: false, multiplier: 1 };
                }
                // Apply player damage reduction
                if (state.userEffects.playerDamageReduction.active) {
                    damage = Math.round(damage * (1 - state.userEffects.playerDamageReduction.amount));
                }
                state.playerHP -= damage;
                state.damageTaken += damage;
                attackLog.push(`👹 ${state.boss.name} uses ${attack.name} dealing ${damage} damage!`);
            }
        } else if (attack.poison) {
            state.userEffects.poison = { active: true, duration: attack.duration, damage: attack.damage };
            attackLog.push(`👹 ${state.boss.name} uses ${attack.name}! You are poisoned for ${attack.duration} seconds!`);
        } else if (attack.poisonDamage) {
            state.userEffects.poison = { active: true, duration: attack.duration, damage: attack.poisonDamage };
            attackLog.push(`👹 ${state.boss.name} uses ${attack.name}! You are poisoned for ${attack.duration} seconds!`);
        } else if (attack.burnMultiplier) {
            state.userEffects.burn = { active: true, duration: attack.duration, multiplier: attack.burnMultiplier };
            attackLog.push(`👹 ${state.boss.name} uses ${attack.name}! You are burning for ${attack.duration} seconds!`);
        } else if (attack.blockChance) {
            state.bossEffects.shield = { active: true, blockChance: attack.blockChance };
            attackLog.push(`👹 ${state.boss.name} raises its shield!`);
        } else if (attack.blockNextAttack) {
            state.bossEffects.blockNextAttack = true;
            attackLog.push(`👹 ${state.boss.name} blocks your next attack!`);
        } else if (attack.blockAttacks) {
            state.bossEffects.blockAttacks = attack.blockAttacks;
            attackLog.push(`👹 ${state.boss.name} blocks your next ${attack.blockAttacks} attacks!`);
        } else if (attack.immuneNextAttack) {
            state.bossEffects.immuneNextAttack = true;
            attackLog.push(`👹 ${state.boss.name} becomes immune to your next attack!`);
        } else if (attack.reflectChance) {
            state.bossEffects.reflectChance = attack.reflectChance;
            attackLog.push(`👹 ${state.boss.name} creates an electric shield!`);
        } else if (attack.stunDuration) {
            if (attack.damagePerSecond) {
                state.userEffects.stun = { active: true, duration: attack.stunDuration, damagePerSecond: attack.damagePerSecond };
            } else {
                state.bossEffects.stun = { active: true, duration: attack.stunDuration };
            }
            attackLog.push(`👹 ${state.boss.name} uses ${attack.name}!`);
        } else if (attack.freezeDuration) {
            state.userEffects.freezes = { active: true, duration: attack.freezeDuration };
            attackLog.push(`👹 ${state.boss.name} freezes you for ${attack.freezeDuration} seconds!`);
        } else if (attack.healBoss) {
            state.bossHP = Math.min(state.bossHP + attack.healBoss, state.bossMaxHP);
            attackLog.push(`👹 ${state.boss.name} heals for ${attack.healBoss} HP!`);
        } else if (attack.damageReduction) {
            state.userEffects.playerDamageReduction = { active: true, duration: attack.duration, amount: attack.damageReduction };
            attackLog.push(`👹 ${state.boss.name} curses you, reducing your damage by ${Math.round(attack.damageReduction * 100)}%!`);
        } else if (attack.dotDamage) {
            state.userEffects.dotDamage = { active: true, duration: attack.duration, damage: attack.dotDamage };
            attackLog.push(`👹 ${state.boss.name} uses ${attack.name}!`);
        } else if (attack.attackPrevention) {
            state.userEffects.attackPrevented = { active: true, duration: attack.attackPrevention };
            attackLog.push(`👹 ${state.boss.name} traps you in a water prison!`);
        } else if (attack.disableAbilities) {
            state.userEffects.abilitiesDisabled = { active: true, duration: attack.disableAbilities };
            attackLog.push(`👹 ${state.boss.name} breaks reality, disabling your abilities!`);
        } else if (attack.addDamageTurns) {
            state.userEffects.addDamage = { active: true, duration: attack.addDamageTurns, damage: attack.addDamageAmount };
            attackLog.push(`👹 ${state.boss.name} summons allies!`);
        }

        state.log.push(...attackLog);

        // Check if player died from boss attack
        if (state.playerHP <= 0) {
            await endBossFight(state, message, false);
            return;
        }
    }

    // Update the embed
    const { embed: newEmbed, row: newRow } = createBossEmbed(state);
    await message.edit({ embeds: [newEmbed], components: [newRow] });
}

async function endBossFight(state, message, playerWon) {
    clearInterval(state.intervalId);
    activeBossFights.delete(state.id);

    let coinReward = state.boss.reward; // Default to boss reward if no config
    const itemsReceived = [];
    if (playerWon) {
        // Get server config for coin rewards
        const serverConfig = db.prepare('SELECT * FROM server_config WHERE server_id = ?').get(state.serverId);
        if (serverConfig) {
            if (state.boss.difficulty === 'easy') coinReward = serverConfig.coins_easy;
            else if (state.boss.difficulty === 'mid') coinReward = serverConfig.coins_mid;
            else if (state.boss.difficulty === 'strong') coinReward = serverConfig.coins_strong;
            else if (state.boss.difficulty === 'very_strong') coinReward = serverConfig.coins_very_strong;
        }
        // Update user
        db.prepare('UPDATE users SET coins = coins + ?, boss_wins = boss_wins + 1 WHERE user_id = ? AND server_id = ?').run(coinReward, state.userId, state.serverId);
        
        // Update quest progress
        updateQuestProgress(state.userId, state.serverId, 'boss_defeat');
        updateQuestProgress(state.userId, state.serverId, `boss_defeat_${state.boss.difficulty}`);
        updateQuestProgress(state.userId, state.serverId, 'boss_defeat_specific', { boss_id: state.boss.id });

        // Roll for item drops
        // Define drop tables by difficulty
        const dropTable = {
            easy: [
                { itemId: 1, chance: 0.1 } // Health potion 10%
            ],
            mid: [
                { itemId: 2, chance: 0.08 }, // Large health potion 8%
                { itemId: 7, chance: 0.03 }, // Coin magnet 3%
                { itemId: 8, chance: 0.03 }  // Point magnet 3%
            ],
            strong: [
                { itemId: 3, chance: 0.05 }, // Coin booster 5%
                { itemId: 4, chance: 0.05 }, // Point booster 5%
                { itemId: 9, chance: 0.07 }, // Lucky charm 7%
                { itemId: 10, chance: 0.03 } // Durable armor 3%
            ],
            very_strong: [
                { itemId: 5, chance: 0.03 }, // Ultimate health potion 3%
                { itemId: 10, chance: 0.04 }, // Durable armor 4%
                { itemId: 6, chance: 0.01 } // Double rewards 1%
            ]
        };

        const drops = dropTable[state.boss.difficulty] || [];
        for (const drop of drops) {
            if (Math.random() < drop.chance) {
                giveItemToUser(state.userId, state.serverId, drop.itemId);
                const item = db.prepare('SELECT * FROM items WHERE id = ?').get(drop.itemId);
                if (item) itemsReceived.push(item.name);
            }
        }

        let logMsg = `🎉 You defeated ${state.boss.name}! +${coinReward} coins!`;
        if (itemsReceived.length > 0) {
            logMsg += `\n📦 Items received: ${itemsReceived.join(', ')}`;
        }
        state.log.push(logMsg);
    } else {
        state.log.push(`💀 You were defeated by ${state.boss.name}!`);
    }

    // Store battle log in database
    db.prepare('INSERT INTO battle_logs (fight_code, user_id, server_id, boss_name, full_log, damage_given, damage_taken, player_won) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
        state.fightCode,
        state.userId,
        state.serverId,
        state.boss.name,
        JSON.stringify(state.log),
        state.damageGiven,
        state.damageTaken,
        playerWon ? 1 : 0
    );

    const { embed: finalEmbed, row: finalRow } = createBossEmbed(state);
    await message.edit({ embeds: [finalEmbed], components: [finalRow] });
}

// Handle battle log button clicks
async function handleButton(interaction) {
    const customId = interaction.customId;
    if (customId.startsWith('battle_log_')) {
        const fightCode = customId.replace('battle_log_', '');
        const log = db.prepare('SELECT * FROM battle_logs WHERE fight_code = ? AND user_id = ?').get(fightCode, interaction.user.id);
        if (log) {
            const dashboardUrl = process.env.DASHBOARD_URL || 'http://localhost:3000';
            await interaction.reply({ content: `View your full battle log here: ${dashboardUrl}/battle-log?code=${fightCode}`, ephemeral: true });
        } else {
            await interaction.reply({ content: 'You don\'t have access to this battle log!', ephemeral: true });
        }
    }
}
