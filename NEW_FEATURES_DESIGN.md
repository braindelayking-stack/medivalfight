
# Medieval Fight Bot - New Features Design
## Planned Features for Next Update

---

## 1. Quest System
### Overview
A quest system where users can complete daily, weekly, and repeatable quests to earn coins, points, and special rewards!

### Features
- **Quest Types**:
  - Daily Quests (resets every 24 hours)
  - Weekly Quests (resets every 7 days)
  - Repeatable Quests (can be done multiple times, but with cooldowns)
- **Quest Objectives**:
  - Defeat X bosses (easy/mid/strong/very strong)
  - Earn X points from chatting
  - Use X abilities
  - Win X player battles (if we add player battles later)
  - Spend X coins
- **Rewards**:
  - Coins
  - Stat Points
  - Special Titles (optional, future)
  - Exclusive Items (for inventory system, see below)
- **Commands**:
  - `/quest list` - Show available quests
  - `/quest progress` - Show your current quest progress
  - `/quest claim` - Claim rewards for completed quests

### Database Changes
Add these tables:
```sql
CREATE TABLE IF NOT EXISTS quests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL, -- daily/weekly/repeatable
  objective_type TEXT NOT NULL, -- boss_defeat/chat_points/use_abilities/etc
  objective_target INTEGER NOT NULL,
  reward_coins INTEGER DEFAULT 0,
  reward_points INTEGER DEFAULT 0,
  reward_item TEXT, -- optional, for inventory
  cooldown_seconds INTEGER DEFAULT 0, -- for repeatable quests
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
  last_claimed_at TEXT, -- for cooldowns
  FOREIGN KEY (quest_id) REFERENCES quests(id),
  UNIQUE(user_id, server_id, quest_id)
);
```

---

## 2. Daily Login Reward System
### Overview
Users get daily rewards just for using a command each day! Streak bonuses for consecutive days!

### Features
- Daily reward for logging in (using any command)
- Streak bonuses (e.g., 7-day streak gives extra coins/points)
- Commands:
  - `/daily` - Claim your daily reward (shows streak too)

### Database Changes
Add/modify users table:
```sql
ALTER TABLE users ADD COLUMN last_daily_claim TEXT;
ALTER TABLE users ADD COLUMN daily_streak INTEGER DEFAULT 0;
```

---

## 3. Inventory System
### Overview
Users can collect and use items! Items can be earned from quests, bosses, or daily rewards!

### Features
- Item types:
  - Consumables (e.g., health potions for boss fights, XP boosters)
  - Passive Items (e.g., increase coin gain, increase point gain)
  - Cosmetic Items (e.g., titles, profile backgrounds)
- Commands:
  - `/inventory` - Show your inventory
  - `/item use <item>` - Use a consumable item
  - `/item equip <item>` - Equip a passive/cosmetic item
- Boss drops: Random chance to get items when defeating bosses!

### Database Changes
Add these tables:
```sql
CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL, -- consumable/passive/cosmetic
  effect TEXT, -- JSON for effect details
  rarity TEXT NOT NULL, -- common/uncommon/rare/epic/legendary
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
```

---

## 4. Achievements System
### Overview
Long-term goals for users to complete, with unique rewards!

### Features
- Achievement categories: Bosses, Quests, Chatting, Abilities, etc.
- Rewards: Coins, points, exclusive items, titles
- Commands:
  - `/achievements` - List all achievements and your progress
  - `/achievements claim` - Claim unlocked achievement rewards

### Database Changes
Add these tables:
```sql
CREATE TABLE IF NOT EXISTS achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL, -- bosses/quests/chat/abilities
  requirement_type TEXT NOT NULL,
  requirement_target INTEGER NOT NULL,
  reward_coins INTEGER DEFAULT 0,
  reward_points INTEGER DEFAULT 0,
  reward_item TEXT,
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
```

---

## Implementation Order (Suggested)
1. **Daily Login Reward System** - Simple to implement, great for engagement!
2. **Quest System** - More complex, but core new feature!
3. **Inventory System** - Complements quests and boss fights!
4. **Achievements System** - Long-term feature, adds replayability!

Let me know which features you want to implement first, and any changes you'd like to the design!
