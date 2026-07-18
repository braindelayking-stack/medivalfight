
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'game.db'));

db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
    user_id TEXT,
    server_id TEXT NOT NULL,
    game_username TEXT,
    game_avatar TEXT,
    points INTEGER DEFAULT 0,
    coins INTEGER DEFAULT 0,
    strength INTEGER DEFAULT 0,
    wealth INTEGER DEFAULT 0,
    health INTEGER DEFAULT 0,
    agility INTEGER DEFAULT 0,
    composure INTEGER DEFAULT 0,
    total_points_spent INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    boss_wins INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    last_daily_claim TEXT,
    daily_streak INTEGER DEFAULT 0,
    equipped_title INTEGER,
    equipped_passive_item INTEGER,
    total_chat_points INTEGER DEFAULT 0,
    total_bosses_defeated INTEGER DEFAULT 0,
    total_abilities_used INTEGER DEFAULT 0,
    daily_quests_completed INTEGER DEFAULT 0,
    weekly_quests_completed INTEGER DEFAULT 0,
    total_quests_completed INTEGER DEFAULT 0,
    PRIMARY KEY (user_id, server_id)
);

CREATE TABLE IF NOT EXISTS user_abilities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    server_id TEXT NOT NULL,
    ability_id TEXT NOT NULL,
    UNIQUE(user_id, server_id, ability_id)
);

CREATE TABLE IF NOT EXISTS server_role_shop (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_id TEXT NOT NULL,
    role_id TEXT NOT NULL,
    cost INTEGER NOT NULL,
    slot INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(server_id, slot)
);

CREATE TABLE IF NOT EXISTS battles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_id TEXT NOT NULL,
    challenger_id TEXT NOT NULL,
    defender_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS battle_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fight_code TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL,
    server_id TEXT NOT NULL,
    boss_name TEXT NOT NULL,
    full_log TEXT NOT NULL,
    damage_given INTEGER DEFAULT 0,
    damage_taken INTEGER DEFAULT 0,
    player_won BOOLEAN DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_ability_upgrades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    server_id TEXT NOT NULL,
    ability_id TEXT NOT NULL,
    level INTEGER DEFAULT 0,
    UNIQUE(user_id, server_id, ability_id)
);

CREATE TABLE IF NOT EXISTS server_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_id TEXT NOT NULL UNIQUE,
    coins_easy INTEGER DEFAULT 100,
    coins_mid INTEGER DEFAULT 150,
    coins_strong INTEGER DEFAULT 200,
    coins_very_strong INTEGER DEFAULT 300,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS server_tracked_channels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(server_id, channel_id)
);

-- New tables for features
CREATE TABLE IF NOT EXISTS quests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    type TEXT NOT NULL,
    objective_type TEXT NOT NULL,
    objective_target INTEGER NOT NULL,
    objective_data TEXT,
    reward_coins INTEGER DEFAULT 0,
    reward_points INTEGER DEFAULT 0,
    reward_item_id INTEGER,
    cooldown_seconds INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_quests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    server_id TEXT NOT NULL,
    quest_id INTEGER NOT NULL,
    progress INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT 0,
    claimed BOOLEAN DEFAULT 0,
    last_claimed_at TEXT,
    assigned_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quest_id) REFERENCES quests(id),
    UNIQUE(user_id, server_id, quest_id, assigned_at)
);

CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    type TEXT NOT NULL,
    effect TEXT,
    rarity TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    server_id TEXT NOT NULL,
    item_id INTEGER NOT NULL,
    quantity INTEGER DEFAULT 1,
    equipped BOOLEAN DEFAULT 0,
    FOREIGN KEY (item_id) REFERENCES items(id),
    UNIQUE(user_id, server_id, item_id)
);

CREATE TABLE IF NOT EXISTS titles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    rarity TEXT NOT NULL,
    description TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_titles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    server_id TEXT NOT NULL,
    title_id INTEGER NOT NULL,
    FOREIGN KEY (title_id) REFERENCES titles(id),
    UNIQUE(user_id, server_id, title_id)
);

CREATE TABLE IF NOT EXISTS achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    requirement_type TEXT NOT NULL,
    requirement_target INTEGER NOT NULL,
    requirement_data TEXT,
    reward_coins INTEGER DEFAULT 0,
    reward_points INTEGER DEFAULT 0,
    reward_item_id INTEGER,
    reward_title_id INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    server_id TEXT NOT NULL,
    achievement_id INTEGER NOT NULL,
    progress INTEGER DEFAULT 0,
    unlocked BOOLEAN DEFAULT 0,
    claimed BOOLEAN DEFAULT 0,
    FOREIGN KEY (achievement_id) REFERENCES achievements(id),
    UNIQUE(user_id, server_id, achievement_id)
);

-- Table to track daily quest rotations (to prevent same quests every day)
CREATE TABLE IF NOT EXISTS daily_quest_rotation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    quest_ids TEXT NOT NULL -- JSON array of quest IDs
);

CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    feedback_text TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    sent INTEGER DEFAULT 0
);

-- Add sent column if it doesn't exist
PRAGMA table_info(feedback);
`);

// Check if sent column exists, if not, add it
const tableInfo = db.prepare("PRAGMA table_info(feedback)").all();
const hasSentColumn = tableInfo.some(col => col.name === 'sent');
if (!hasSentColumn) {
    console.log("Adding 'sent' column to feedback table");
    db.prepare("ALTER TABLE feedback ADD COLUMN sent INTEGER DEFAULT 0").run();
}

// Seed initial data
const seedData = async () => {
    // Seed titles
    const titles = [
        { id: 1, name: 'Newbie Adventurer', rarity: 'Common', description: 'Your first title!' },
        { id: 2, name: 'Boss Slayer', rarity: 'Uncommon', description: 'Defeat 100 bosses!' },
        { id: 3, name: 'Wealthy Merchant', rarity: 'Rare', description: 'Have 10,000 coins!' },
        { id: 4, name: 'Legendary Victor', rarity: 'Epic', description: 'Defeat the Void Destroyer 5 times!' },
        { id: 5, name: 'King of the Castle', rarity: 'Legendary', description: 'Unlock all achievements!' },
        { id: 6, name: 'Quest Master', rarity: 'Rare', description: 'Complete 50 daily quests!' },
        { id: 7, name: 'Weekly Warrior', rarity: 'Epic', description: 'Complete 20 weekly quests!' },
        { id: 8, name: 'Chatty Champion', rarity: 'Uncommon', description: 'Earn 10,000 total chat points!' }
    ];
    const insertTitle = db.prepare('INSERT OR IGNORE INTO titles (id, name, rarity, description) VALUES (?, ?, ?, ?)');
    for (const t of titles) insertTitle.run(t.id, t.name, t.rarity, t.description);

    // Seed items
    const items = [
        // Consumables
        { id: 1, name: 'Health Potion', type: 'consumable', rarity: 'Common', description: 'Heals 50 HP in boss fights', effect: JSON.stringify({ type: 'heal', amount: 50 }) },
        { id: 2, name: 'Large Health Potion', type: 'consumable', rarity: 'Uncommon', description: 'Heals 100 HP in boss fights', effect: JSON.stringify({ type: 'heal', amount: 100 }) },
        { id: 3, name: 'Coin Booster (1hr)', type: 'consumable', rarity: 'Rare', description: '1.5x coins for 1 hour', effect: JSON.stringify({ type: 'boost', stat: 'coins', multiplier: 1.5, duration: 3600000 }) },
        { id: 4, name: 'Point Booster (1hr)', type: 'consumable', rarity: 'Rare', description: '2x chat points for 1 hour', effect: JSON.stringify({ type: 'boost', stat: 'points', multiplier: 2, duration: 3600000 }) },
        { id: 5, name: 'Ultimate Health Potion', type: 'consumable', rarity: 'Epic', description: 'Full heal in boss fights', effect: JSON.stringify({ type: 'heal', full: true }) },
        { id: 6, name: 'Double Rewards (1hr)', type: 'consumable', rarity: 'Legendary', description: '2x coins and points for 1 hour', effect: JSON.stringify({ type: 'boost', stat: 'both', multiplier: 2, duration: 3600000 }) },
        // Passives
        { id: 7, name: 'Coin Magnet', type: 'passive', rarity: 'Uncommon', description: '+10% coin rewards', effect: JSON.stringify({ type: 'passive', stat: 'coins', multiplier: 1.1 }) },
        { id: 8, name: 'Point Magnet', type: 'passive', rarity: 'Uncommon', description: '+10% chat points', effect: JSON.stringify({ type: 'passive', stat: 'points', multiplier: 1.1 }) },
        { id: 9, name: 'Lucky Charm', type: 'passive', rarity: 'Rare', description: '+5% drop chance', effect: JSON.stringify({ type: 'passive', stat: 'drop_chance', bonus: 0.05 }) },
        { id: 10, name: 'Durable Armor', type: 'passive', rarity: 'Epic', description: '+25 max HP', effect: JSON.stringify({ type: 'passive', stat: 'max_hp', bonus: 25 }) },
        { id: 11, name: 'Ring of Wealth', type: 'passive', rarity: 'Legendary', description: '+25% coins, +15% points, +10% drops', effect: JSON.stringify({ type: 'passive', coins: 1.25, points: 1.15, drop_chance: 0.1 }) }
    ];
    const insertItem = db.prepare('INSERT OR IGNORE INTO items (id, name, type, rarity, description, effect) VALUES (?, ?, ?, ?, ?, ?)');
    for (const i of items) insertItem.run(i.id, i.name, i.type, i.rarity, i.description, i.effect);

    // Seed quests (daily pool first, then weekly, then repeatable)
    const dailyQuestPool = [
        { id: 1, title: 'Daily Boss Slayer', description: 'Defeat 3 bosses of any difficulty', type: 'daily', objective_type: 'boss_defeat', objective_target: 3, reward_coins:50, reward_points:100 },
        { id: 2, title: 'Chatty Adventurer', description: 'Earn 200 points from chatting', type: 'daily', objective_type: 'chat_points', objective_target:200, reward_coins:30, reward_points:150 },
        { id: 3, title: 'Ability Practice', description: 'Use any ability 5 times', type: 'daily', objective_type: 'use_abilities', objective_target:5, reward_coins:40, reward_points:80 },
        { id:4, title: 'Spending Spree', description: 'Spend 100 coins', type: 'daily', objective_type: 'spend_coins', objective_target:100, reward_coins:25, reward_points:75 },
        { id:12, title: 'Easy Boss Buster', description: 'Defeat 2 easy bosses', type: 'daily', objective_type: 'boss_defeat_easy', objective_target:2, reward_coins:45, reward_points:90 },
        { id:13, title: 'Mid Boss Muncher', description: 'Defeat 1 mid boss', type: 'daily', objective_type: 'boss_defeat_mid', objective_target:1, reward_coins:70, reward_points:140 }
    ];
    const weeklyQuests = [
        { id:5, title: 'Weekly Warrior', description: 'Defeat 10 bosses', type: 'weekly', objective_type: 'boss_defeat', objective_target:10, reward_coins:200, reward_points:500, reward_item_id:1 },
        { id:6, title: 'Mid-Tier Champion', description: 'Defeat 5 mid bosses', type: 'weekly', objective_type: 'boss_defeat_mid', objective_target:5, reward_coins:250, reward_points:600, reward_item_id:3 },
        { id:7, title: 'Legendary Seeker', description: 'Defeat 1 very strong boss', type: 'weekly', objective_type: 'boss_defeat_very_strong', objective_target:1, reward_coins:500, reward_points:1000, reward_item_id:null }, // We'll handle rare title scroll as a title later
        { id:8, title: 'Social Butterfly', description: 'Earn 1000 chat points', type: 'weekly', objective_type: 'chat_points', objective_target:1000, reward_coins:150, reward_points:700, reward_item_id:4 }
    ];
    const repeatableQuests = [
        { id:9, title: 'Golem Gauntlet', description: 'Defeat Golem 3 times', type: 'repeatable', objective_type: 'boss_defeat_specific', objective_data: JSON.stringify({ boss_id: 'golem', count: 3 }), objective_target:3, reward_coins:100, reward_points:200, cooldown_seconds:7200 },
        { id:10, title: 'Dragon Slayer Repeat', description: 'Defeat Dragon 2 times', type: 'repeatable', objective_type: 'boss_defeat_specific', objective_data: JSON.stringify({ boss_id: 'dragon', count:2 }), objective_target:2, reward_coins:120, reward_points:250, cooldown_seconds:10800 },
        { id:11, title: 'Skeleton Sweep', description: 'Defeat Skeleton 5 times', type: 'repeatable', objective_type: 'boss_defeat_specific', objective_data: JSON.stringify({ boss_id: 'skeleton', count:5 }), objective_target:5, reward_coins:80, reward_points:180, cooldown_seconds:3600 }
    ];
    const insertQuest = db.prepare('INSERT OR IGNORE INTO quests (id, title, description, type, objective_type, objective_target, objective_data, reward_coins, reward_points, reward_item_id, cooldown_seconds) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    for (const q of [...dailyQuestPool, ...weeklyQuests, ...repeatableQuests]) {
        insertQuest.run(q.id, q.title, q.description, q.type, q.objective_type, q.objective_target, q.objective_data || null, q.reward_coins, q.reward_points, q.reward_item_id, q.cooldown_seconds || 0);
    }

    // Seed achievements
    const achievements = [
        { id:1, title:'First Steps', category:'General', requirement_type:'create_profile', requirement_target:1, reward_coins:50, reward_points:100 },
        { id:2, title:'Boss Hunter', category:'Bosses', requirement_type:'total_bosses_defeated', requirement_target:10, reward_coins:100, reward_points:200 },
        { id:3, title:'Boss Slayer', category:'Bosses', requirement_type:'total_bosses_defeated', requirement_target:50, reward_coins:300, reward_points:600, reward_item_id:9 },
        { id:4, title:'Legendary Boss Killer', category:'Bosses', requirement_type:'boss_defeat_very_strong_total', requirement_target:10, reward_coins:1000, reward_points:2000, reward_item_id:10 },
        { id:5, title:'The Ultimate Killer', category:'Bosses', requirement_type:'boss_defeat_very_strong_total', requirement_target:50, reward_coins:5000, reward_points:10000, reward_item_id:11 },
        { id:6, title:'Daily Dedication', category:'Quests', requirement_type:'daily_quests_completed', requirement_target:30, reward_coins:500, reward_points:1000 },
        { id:7, title:'Weekly Warrior', category:'Quests', requirement_type:'weekly_quests_completed', requirement_target:10, reward_coins:1000, reward_points:2000 },
        { id:8, title:'Quest Master', category:'Quests', requirement_type:'total_quests_completed', requirement_target:100, reward_coins:3000, reward_points:6000, reward_title_id:6 },
        { id:9, title:'Chatty Cathy', category:'Chatting', requirement_type:'total_chat_points', requirement_target:5000, reward_coins:400, reward_points:800 },
        { id:10, title:'Chat Champion', category:'Chatting', requirement_type:'total_chat_points', requirement_target:50000, reward_coins:2000, reward_points:4000, reward_title_id:8 },
        { id:11, title:'Ability Master', category:'Abilities', requirement_type:'total_abilities_used', requirement_target:100, reward_coins:300, reward_points:600 },
        { id:12, title:'Ability Legend', category:'Abilities', requirement_type:'total_abilities_used', requirement_target:1000, reward_coins:1500, reward_points:3000 },
        { id:15, title:'King of the Castle', category:'General', requirement_type:'all_achievements', requirement_target:1, reward_coins:10000, reward_points:20000, reward_item_id:11, reward_title_id:5 }
    ];
    const insertAchievement = db.prepare('INSERT OR IGNORE INTO achievements (id, title, description, category, requirement_type, requirement_target, requirement_data, reward_coins, reward_points, reward_item_id, reward_title_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    for (const a of achievements) {
        insertAchievement.run(a.id, a.title, a.description || '', a.category, a.requirement_type, a.requirement_target, a.requirement_data || null, a.reward_coins, a.reward_points, a.reward_item_id, a.reward_title_id);
    }
};

seedData();

module.exports = db;
