
# Medieval Fight Bot - Full Content Design
## All Quests, Items, Titles & Achievements

---

## 1. All Quest Designs
Let's design daily, weekly, and repeatable quests!

### Daily Quests (Resets Every 24 Hours at UTC 00:00)
| Quest ID | Title                          | Description                                  | Objective Type       | Target | Reward Coins | Reward Points |
|----------|--------------------------------|----------------------------------------------|----------------------|--------|--------------|---------------|
| 1        | Daily Boss Slayer              | Defeat 3 bosses of any difficulty            | boss_defeat          | 3      | 50           | 100           |
| 2        | Chatty Adventurer              | Earn 200 points from chatting                | chat_points          | 200    | 30           | 150           |
| 3        | Ability Practice               | Use any ability 5 times                      | use_abilities        | 5      | 40           | 80            |
| 4        | Spending Spree                 | Spend 100 coins on anything                  | spend_coins          | 100    | 25           | 75            |

### Weekly Quests (Resets Every Monday at UTC 00:00)
| Quest ID | Title                          | Description                                  | Objective Type       | Target | Reward Coins | Reward Points | Reward Item          |
|----------|--------------------------------|----------------------------------------------|----------------------|--------|--------------|---------------|----------------------|
| 5        | Weekly Warrior                 | Defeat 10 bosses of any difficulty           | boss_defeat          | 10     | 200          | 500           | Health Potion (x2)   |
| 6        | Mid-Tier Champion              | Defeat 5 mid-difficulty bosses               | boss_defeat_mid      | 5      | 250          | 600           | Coin Booster (1hr)   |
| 7        | Legendary Seeker               | Defeat 1 very-strong boss                    | boss_defeat_very_strong | 1   | 500          | 1000          | Rare Title Scroll    |
| 8        | Social Butterfly               | Earn 1000 points from chatting               | chat_points          | 1000   | 150          | 700           | Point Booster (1hr)  |

### Repeatable Quests (With Cooldowns)
| Quest ID | Title                          | Description                                  | Objective Type       | Target | Reward Coins | Reward Points | Cooldown |
|----------|--------------------------------|----------------------------------------------|----------------------|--------|--------------|---------------|----------|
| 9        | Golem Gauntlet                 | Defeat the Golem boss 3 times                | boss_defeat_specific | Golem (3x) | 100      | 200           | 2 hours  |
| 10       | Dragon Slayer Repeat           | Defeat the Dragon boss 2 times               | boss_defeat_specific | Dragon (2x) | 120      | 250           | 3 hours  |
| 11       | Skeleton Sweep                 | Defeat the Skeleton boss 5 times             | boss_defeat_specific | Skeleton (5x) | 80     | 180           | 1 hour   |

---

## 2. All Item Designs
Let's design consumables, passive items, and cosmetics!

### Item Rarity Tiers
- Common (Gray)
- Uncommon (Green)
- Rare (Blue)
- Epic (Purple)
- Legendary (Gold)

### Consumable Items
| Item ID | Name                 | Rarity   | Type       | Effect                                                                 | How to Obtain                                  |
|---------|----------------------|----------|------------|-----------------------------------------------------------------------|------------------------------------------------|
| 1       | Health Potion        | Common   | Consumable | Heals 50 HP during a boss fight (only usable in combat)              | Weekly Quest 5, Easy Boss Drops (10% chance)   |
| 2       | Large Health Potion  | Uncommon | Consumable | Heals 100 HP during a boss fight                                     | Mid Boss Drops (8% chance), Rarely from quests |
| 3       | Coin Booster (1hr)   | Rare     | Consumable | Gives 1.5x coin rewards from bosses for 1 hour                       | Weekly Quest 6, Strong Boss Drops (5% chance)  |
| 4       | Point Booster (1hr)  | Rare     | Consumable | Gives 2x chat points for 1 hour                                      | Weekly Quest 8, Strong Boss Drops (5% chance)  |
| 5       | Ultimate Health Potion | Epic    | Consumable | Fully heals you during a boss fight                                  | Very Strong Boss Drops (3% chance)             |
| 6       | Double Rewards (1hr) | Legendary| Consumable | Gives 2x coins AND points for 1 hour                                 | Achievement "Legendary Victor" reward          |

### Passive Items (Equippable, 1 at a time)
| Item ID | Name                 | Rarity   | Type       | Effect                                                                 | How to Obtain                                  |
|---------|----------------------|----------|------------|-----------------------------------------------------------------------|------------------------------------------------|
| 7       | Coin Magnet          | Uncommon | Passive    | +10% coin rewards from all bosses                                     | Mid Boss Drops (10% chance)                    |
| 8       | Point Magnet         | Uncommon | Passive    | +10% chat points earned                                               | Shop (1000 coins)                              |
| 9       | Lucky Charm          | Rare     | Passive    | +5% chance to get items from boss drops                               | Strong Boss Drops (7% chance)                  |
| 10      | Durable Armor        | Epic     | Passive    | +25 max HP                                                           | Very Strong Boss Drops (4% chance)             |
| 11      | Ring of Wealth       | Legendary| Passive    | +25% coin rewards, +15% point rewards, +10% drop chance               | Achievement "King of the Castle" reward        |

### Cosmetic Items (Titles & Profile Decorations)
#### Titles (Displayed on `/profile view`)
| Title ID | Name                 | Rarity   | How to Obtain                                  |
|----------|----------------------|----------|------------------------------------------------|
| 1        | Newbie Adventurer    | Common   | Create your profile (auto-unlocked)            |
| 2        | Boss Slayer          | Uncommon | Defeat 100 bosses                              |
| 3        | Wealthy Merchant     | Rare     | Have 10,000 coins at once                      |
| 4        | Legendary Victor     | Epic     | Defeat the Void Destroyer 5 times              |
| 5        | King of the Castle   | Legendary| Unlock all achievements                         |
| 6        | Quest Master         | Rare     | Complete 50 daily quests                       |
| 7        | Weekly Warrior       | Epic     | Complete 20 weekly quests                      |
| 8        | Chatty Champion      | Uncommon | Earn 10,000 total chat points                  |
| 9        | Rare Title Scroll    | Rare     | Use "Rare Title Scroll" item (grants a random rare title) | Weekly Quest 7 |

---

## 3. All Achievement Designs
Let's design all achievements!

| Achievement ID | Title                 | Category   | Requirement Type       | Target | Reward Coins | Reward Points | Reward Item          |
|----------------|-----------------------|------------|------------------------|--------|--------------|---------------|----------------------|
| 1              | First Steps           | General    | create_profile         | 1      | 50           | 100           | -                    |
| 2              | Boss Hunter           | Bosses     | boss_defeat_total      | 10     | 100          | 200           | -                    |
| 3              | Boss Slayer           | Bosses     | boss_defeat_total      | 50     | 300          | 600           | Lucky Charm          |
| 4              | Legendary Boss Killer | Bosses     | boss_defeat_very_strong| 10     | 1000         | 2000          | Durable Armor        |
| 5              | The Ultimate Killer   | Bosses     | boss_defeat_very_strong| 50     | 5000         | 10000         | Ring of Wealth       |
| 6              | Daily Dedication      | Quests     | daily_quests_completed | 30     | 500          | 1000          | -                    |
| 7              | Weekly Warrior        | Quests     | weekly_quests_completed| 10     | 1000         | 2000          | -                    |
| 8              | Quest Master          | Quests     | total_quests_completed | 100    | 3000         | 6000          | Title "Quest Master"|
| 9              | Chatty Cathy          | Chatting   | total_chat_points      | 5000   | 400          | 800           | -                    |
| 10             | Chat Champion         | Chatting   | total_chat_points      | 50000  | 2000         | 4000          | Title "Chatty Champion" |
| 11             | Ability Master        | Abilities  | abilities_used         | 100    | 300          | 600           | -                    |
| 12             | Ability Legend        | Abilities  | abilities_used         | 1000   | 1500         | 3000          | -                    |
| 13             | Collector             | Inventory  | unique_items_owned     | 10     | 200          | 400           | -                    |
| 14             | Hoarder               | Inventory  | unique_items_owned     | 30     | 1000         | 2000          | -                    |
| 15             | King of the Castle    | General    | all_achievements       | 1      | 10000        | 20000         | Title "King of the Castle", Ring of Wealth |

---

## 4. Boss Drop Table Updates
Add item drops to all bosses!

### Easy Bosses (10% Common, 3% Uncommon)
- Golem: 10% Health Potion, 3% Coin Magnet
- Dragon: 10% Health Potion, 3% Point Magnet
- Skeleton:10% Health Potion, 3% Coin Magnet

### Mid Bosses (8% Uncommon, 5% Rare)
- Wraith King: 8% Large Health Potion, 5% Lucky Charm
- Vampire Lord:8% Large Health Potion,5% Lucky Charm
- Storm Elemental:8% Large Health Potion,5% Coin Booster (1hr)
- Fire Elemental:8% Large Health Potion,5% Point Booster (1hr)

### Strong Bosses (5% Rare, 3% Epic)
- Ice Giant:5% Coin Booster (1hr), 3% Durable Armor
- Shadow Assassin:5% Point Booster (1hr),3% Durable Armor
- Ancient Phoenix:5% Lucky Charm,3% Durable Armor
- Ancient Mummy:5% Lucky Charm,3% Durable Armor
- Lich Lord:5% Coin Booster (1hr),3% Durable Armor

### Very Strong Bosses (3% Epic, 1% Legendary)
- Demon King:3% Ultimate Health Potion,1% Double Rewards (1hr)
- Sea Kraken:3% Ultimate Health Potion,1% Double Rewards (1hr)
- Void Destroyer:3% Ultimate Health Potion,1% Double Rewards (1hr)

---

## 5. Profile View Update Plan
When a user does `/profile view`, it should now show:
- Current equipped title (before username)
- Current equipped passive item (if any)
- Profile stats (as before)
- Quick overview of daily/weekly quest progress
- Next daily reset timer
- Next weekly reset timer

---

Okay, that's everything! Let me know if you want to add, remove, or change anything, and then I'll start building it all!
