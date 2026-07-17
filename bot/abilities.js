
const categoryConfig = {
    Strength: { color: '#FF4444', emoji: '⚔️' },
    Wealth: { color: '#FFD700', emoji: '💰' },
    Agility: { color: '#00FF7F', emoji: '🏃' },
    Composure: { color: '#9370DB', emoji: '🧘' }
};

const abilityUpgradeConfigs = {
    fire_attack: {
        baseDamage: 10,
        damagePerLevel: 2,
        costType: 'strength',
        description: (level) => `Fireball damage increases by ${2*level} (total ${10+2*level})`,
        label: 'Inferno Boost'
    },
    water_attack: {
        baseDamage:10,
        damagePerLevel:2,
        costType:'strength',
        description: (level)=> `Waterball damage increases by ${2*level} (total ${10+2*level})`,
        label: 'Tsunami Boost'
    },
    earth_attack: {
        baseDamage:10,
        damagePerLevel:2,
        costType:'strength',
        description: (level)=> `Earthball damage increases by ${2*level} (total ${10+2*level})`,
        label: 'Meteor Boost'
    },
    air_attack: {
        baseDamage:10,
        damagePerLevel:2,
        costType:'strength',
        description: (level)=> `Airball damage increases by ${2*level} (total ${10+2*level})`,
        label: 'Gust Boost'
    },
    sacrifice: {
        baseHeal:5,
        healPerLevel:2,
        costType:'wealth',
        description: (level)=> `Heal amount increases by ${2*level} (total ${5+2*level}) per 5 coins`,
        label: 'Divine Restoration'
    },
    dodge: {
        baseChance:30,
        chancePerLevel:3,
        costType:'agility',
        description: (level)=> `Dodge chance increases by ${3*level}% (total ${30+3*level}%)`,
        label: 'Nimble Feet'
    },
    attack_boost: {
        baseMultiplier:1.1,
        multiplierPerLevel:0.05,
        costType:'agility',
        description: (level)=> `Attack boost multiplier increases by +${(0.05*level).toFixed(2)} (total ${(1.1 +0.05*level).toFixed(2)}x)`,
        label: 'Adrenaline Surge'
    },
    composure_defense: {
        baseReduction:10,
        reductionPerLevel:2,
        costType:'composure',
        description: (level)=> `Damage reduction increases by ${2*level}% (total ${10+2*level}%)`,
        label: 'Inner Peace'
    },
    smash: {
        baseDamage:30,
        damagePerLevel:3,
        extraDamageTakenReduction:0.02, // Reduce the 1.2x damage taken by 2% per level
        costType:'strength',
        description: (level)=> `Smash damage +${3*level} (${30+3*level} total), extra damage taken -${(2*level)}%`,
        label: 'Shield Breaker Mastery'
    },
    bribe: {
        baseCost:50,
        costReductionPerLevel:2,
        costType:'wealth',
        description: (level)=> `Bribe cost -${2*level} coins (${Math.max(0,50-2*level)} total)`,
        label: 'Diplomatic Immunity'
    },
    quick_step: {
        baseCounterDamage:15,
        counterDamagePerLevel:3,
        costType:'agility',
        description: (level)=> `Counter damage +${3*level} (${15+3*level} total)`,
        label: 'Shadow Step'
    },
    iron_will: {
        baseDuration:5,
        durationPerLevel:1,
        costType:'composure',
        description: (level)=> `Iron Will duration +${level} seconds (${5+level} total)`,
        label: 'Unbreakable Resolve'
    },
    berserk: {
        baseDamage:50,
        damagePerLevel:5,
        hpSacrificeReduction:1, // Reduce the % HP sacrificed by 1% per level (starting at 20%)
        costType:'strength',
        description: (level)=> `Berserk damage +${5*level} (${50+5*level}), HP sacrifice -${level}% (${20-level}%)`,
        label: 'Rage Control'
    },
    golden_touch: {
        baseDamage:25,
        damagePerLevel:3,
        pointsGainedPerLevel:3,
        costType:'wealth',
        description: (level)=> `Golden Touch damage +${3*level} (${25+3*level}), points gained +${3*level} (${30+3*level})`,
        label: 'Alchemy Master'
    },
    shadow_strike: {
        baseDamage:40,
        damagePerLevel:4,
        stunDurationPerLevel:0.3,
        costType:'agility',
        description: (level)=> `Shadow Strike damage +${4*level} (${40+4*level}), stun duration +${(0.3*level).toFixed(1)}s (${(2+0.3*level).toFixed(1)}s)`,
        label: 'Nightblade'
    },
    last_stand: {
        baseHealPercent:50,
        healPercentPerLevel:3,
        boostMultiplierPerLevel:0.1,
        costType:'composure',
        description: (level)=> `Last Stand heal to ${50+3*level}% HP, boost multiplier +${(0.1*level).toFixed(1)}x (${(2+0.1*level).toFixed(1)}x)`,
        label: 'Final Stand'
    }
};

const abilities = [
    // Weak Abilities (Existing)
    { id: 'fire_attack', name: 'Fire Attack', category: 'Strength', costType: 'strength', cost: 50, description: '🔥 Shoot a fireball dealing 10 base damage', cooldown: 3000 },
    { id: 'water_attack', name: 'Water Attack', category: 'Strength', costType: 'strength', cost: 50, description: '💧 Shoot a waterball dealing 10 base damage', cooldown: 3000 },
    { id: 'earth_attack', name: 'Earth Attack', category: 'Strength', costType: 'strength', cost: 50, description: '🌍 Shoot an earthball dealing 10 base damage', cooldown: 3000 },
    { id: 'air_attack', name: 'Air Attack', category: 'Strength', costType: 'strength', cost: 50, description: '💨 Shoot an airball dealing 10 base damage', cooldown: 3000 },
    { id: 'sacrifice', name: 'Sacrifice', category: 'Wealth', costType: 'wealth', cost: 50, description: '💰 Spend wealth to heal yourself during battle', cooldown: 3000 },
    { id: 'dodge', name: 'Dodge', category: 'Agility', costType: 'agility', cost: 50, description: '🏃 Dodge the next attack with 50% chance', cooldown: 3000 },
    { id: 'attack_boost', name: 'Attack Boost', category: 'Agility', costType: 'agility', cost: 50, description: '⚡ Boost your next attack by 2x', cooldown: 3000 },
    { id: 'composure_defense', name: 'Composure Defense', category: 'Composure', costType: 'composure', cost: 50, description: '🧘 Reduce damage by 50% when below 20% HP', cooldown: 3000 },

    // Mid-Tier Abilities
    { id: 'smash', name: 'Smash', category: 'Strength', costType: 'strength', cost: 150, description: '💥 30 base damage, shatters boss shields, but you take 1.2x damage next hit', cooldown: 5000 },
    { id: 'bribe', name: 'Bribe', category: 'Wealth', costType: 'wealth', cost: 170, description: '💵 Spend 50 wealth to skip the boss\'s next attack', cooldown: 8000 },
    { id: 'quick_step', name: 'Quick Step', category: 'Agility', costType: 'agility', cost: 160, description: '🏃‍♂️ Dodge the next boss attack and counter for 15 damage', cooldown: 6000 },
    { id: 'iron_will', name: 'Iron Will', category: 'Composure', costType: 'composure', cost: 140, description: '🛡️ Reduce all incoming damage by 50% for 5 seconds', cooldown: 10000 },

    // Strong Abilities
    { id: 'berserk', name: 'Berserk', category: 'Strength', costType: 'strength', cost: 300, description: '🔥 Sacrifice 20% current HP to deal 50 base damage', cooldown: 12000 },
    { id: 'golden_touch', name: 'Golden Touch', category: 'Wealth', costType: 'wealth', cost: 330, description: '✨ Convert 30 wealth into 30 points AND deal 25 damage', cooldown: 10000 },
    { id: 'shadow_strike', name: 'Shadow Strike', category: 'Agility', costType: 'agility', cost: 310, description: '👤 40 damage and stun the boss for 2 seconds', cooldown: 11000 },
    { id: 'last_stand', name: 'Last Stand', category: 'Composure', costType: 'composure', cost: 320, description: '⚔️ If below 20% HP: heal to 50% max HP and 2x attack boost (once per fight)', cooldown: 999999999 } // Long cooldown since one-time use
];

module.exports = { abilities, categoryConfig, abilityUpgradeConfigs };
