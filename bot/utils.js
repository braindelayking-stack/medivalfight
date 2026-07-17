
const db = require('../database/db');

// Get today's date as YYYY-MM-DD in UTC
function getTodayUTC() {
    return new Date().toISOString().split('T')[0];
}

// Get current week's start date (Monday) as YYYY-MM-DD in UTC
function getWeekStartUTC() {
    const d = new Date();
    const day = d.getUTCDay();
    const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1); // Monday as start
    const monday = new Date(d.setUTCDate(diff));
    return monday.toISOString().split('T')[0];
}

// Get or generate today's daily quest rotation (pick 4 random from daily pool to prevent same quests every day)
function getDailyQuestRotation() {
    const today = getTodayUTC();
    const existing = db.prepare('SELECT quest_ids FROM daily_quest_rotation WHERE date = ?').get(today);
    if (existing) {
        return JSON.parse(existing.quest_ids);
    }
    // Get all daily quests from pool (ids 1-4,12-13)
    const dailyQuests = db.prepare('SELECT id FROM quests WHERE type = ?').all('daily');
    const pool = dailyQuests.map(q => q.id);
    // Shuffle and pick 4
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const selected = pool.slice(0,4);
    db.prepare('INSERT OR IGNORE INTO daily_quest_rotation (date, quest_ids) VALUES (?, ?)').run(today, JSON.stringify(selected));
    return selected;
}

// Assign daily and weekly quests to user if not already assigned
function assignQuestsToUser(userId, serverId) {
    const today = getTodayUTC();
    const weekStart = getWeekStartUTC();

    // Assign daily quests
    const dailyRotation = getDailyQuestRotation();
    for (const questId of dailyRotation) {
        const existing = db.prepare('SELECT id FROM user_quests WHERE user_id = ? AND server_id = ? AND quest_id = ? AND assigned_at >= ?').get(userId, serverId, questId, today);
        if (!existing) {
            db.prepare('INSERT OR IGNORE INTO user_quests (user_id, server_id, quest_id, assigned_at) VALUES (?, ?, ?, ?)').run(userId, serverId, questId, today);
        }
    }

    // Assign weekly quests (all weekly quests)
    const weeklyQuests = db.prepare('SELECT id FROM quests WHERE type = ?').all('weekly');
    for (const q of weeklyQuests) {
        const existing = db.prepare('SELECT id FROM user_quests WHERE user_id = ? AND server_id = ? AND quest_id = ? AND assigned_at >= ?').get(userId, serverId, q.id, weekStart);
        if (!existing) {
            db.prepare('INSERT OR IGNORE INTO user_quests (user_id, server_id, quest_id, assigned_at) VALUES (?, ?, ?, ?)').run(userId, serverId, q.id, weekStart);
        }
    }
}

// Update quest progress for user
function updateQuestProgress(userId, serverId, objectiveType, objectiveData = null, amount = 1) {
    const userQuests = db.prepare(`
        SELECT uq.*, q.objective_type, q.objective_data, q.objective_target 
        FROM user_quests uq 
        JOIN quests q ON uq.quest_id = q.id 
        WHERE uq.user_id = ? AND uq.server_id = ? AND uq.completed = 0 AND uq.claimed = 0
    `).all(userId, serverId);

    for (const uq of userQuests) {
        if (uq.objective_type !== objectiveType) continue;

        let shouldUpdate = true;
        if (objectiveType === 'boss_defeat_specific') {
            const qData = JSON.parse(uq.objective_data || '{}');
            if (qData.boss_id !== objectiveData?.boss_id) shouldUpdate = false;
        }

        if (shouldUpdate) {
            const newProgress = uq.progress + amount;
            const isComplete = newProgress >= uq.objective_target;
            db.prepare('UPDATE user_quests SET progress = ?, completed = ? WHERE id = ?').run(newProgress, isComplete ? 1 : 0, uq.id);
        }
    }

    // Also update user's total stats if needed
    if (objectiveType === 'boss_defeat' || objectiveType === 'boss_defeat_easy' || objectiveType === 'boss_defeat_mid' || objectiveType === 'boss_defeat_strong' || objectiveType === 'boss_defeat_very_strong' || objectiveType === 'boss_defeat_specific') {
        db.prepare('UPDATE users SET total_bosses_defeated = total_bosses_defeated + ? WHERE user_id = ? AND server_id = ?').run(amount, userId, serverId);
    } else if (objectiveType === 'chat_points') {
        db.prepare('UPDATE users SET total_chat_points = total_chat_points + ? WHERE user_id = ? AND server_id = ?').run(amount, userId, serverId);
    } else if (objectiveType === 'use_abilities') {
        db.prepare('UPDATE users SET total_abilities_used = total_abilities_used + ? WHERE user_id = ? AND server_id = ?').run(amount, userId, serverId);
    }

    // TODO: Update achievement progress here
    updateAchievementProgress(userId, serverId, objectiveType, objectiveData, amount);
}

// Update achievement progress
function updateAchievementProgress(userId, serverId, objectiveType, objectiveData = null, amount = 1) {
    // First update user's total stats if needed
    if (objectiveType === 'boss_defeat' || objectiveType.startsWith('boss_defeat_')) {
        db.prepare('UPDATE users SET total_bosses_defeated = total_bosses_defeated + ? WHERE user_id = ? AND server_id = ?').run(amount, userId, serverId);
    } else if (objectiveType === 'chat_points') {
        db.prepare('UPDATE users SET total_chat_points = total_chat_points + ? WHERE user_id = ? AND server_id = ?').run(amount, userId, serverId);
    } else if (objectiveType === 'use_abilities') {
        db.prepare('UPDATE users SET total_abilities_used = total_abilities_used + ? WHERE user_id = ? AND server_id = ?').run(amount, userId, serverId);
    }

    const userAchievements = db.prepare(`
        SELECT ua.*, a.requirement_type, a.requirement_data, a.requirement_target 
        FROM user_achievements ua 
        JOIN achievements a ON ua.achievement_id = a.id 
        WHERE ua.user_id = ? AND ua.server_id = ? AND ua.unlocked = 0
    `).all(userId, serverId);

    for (const ua of userAchievements) {
        if (ua.requirement_type !== objectiveType) continue;
        const newProgress = ua.progress + amount;
        const isUnlocked = newProgress >= ua.requirement_target;
        db.prepare('UPDATE user_achievements SET progress = ?, unlocked = ? WHERE id = ?').run(newProgress, isUnlocked ? 1 : 0, ua.id);
    }

    // Also check stat-based achievements
    const user = db.prepare('SELECT * FROM users WHERE user_id = ? AND server_id = ?').get(userId, serverId);
    const allAchievements = db.prepare('SELECT * FROM achievements').all();
    for (const a of allAchievements) {
        let ua = db.prepare('SELECT * FROM user_achievements WHERE user_id = ? AND server_id = ? AND achievement_id = ?').get(userId, serverId, a.id);
        if (!ua) {
            db.prepare('INSERT OR IGNORE INTO user_achievements (user_id, server_id, achievement_id) VALUES (?, ?, ?)').run(userId, serverId, a.id);
            ua = db.prepare('SELECT * FROM user_achievements WHERE user_id = ? AND server_id = ? AND achievement_id = ?').get(userId, serverId, a.id);
        }
        // Check for stat-based achievements
        let progress = 0;
        if (a.requirement_type === 'total_bosses_defeated') progress = user?.total_bosses_defeated || 0;
        else if (a.requirement_type === 'total_chat_points') progress = user?.total_chat_points || 0;
        else if (a.requirement_type === 'total_abilities_used') progress = user?.total_abilities_used || 0;
        else if (a.requirement_type === 'daily_quests_completed') progress = user?.daily_quests_completed || 0;
        else if (a.requirement_type === 'weekly_quests_completed') progress = user?.weekly_quests_completed || 0;
        else if (a.requirement_type === 'total_quests_completed') progress = user?.total_quests_completed || 0;
        else if (a.requirement_type === 'all_achievements') {
            // Check if all other achievements are unlocked and claimed
            const otherAchievements = db.prepare('SELECT id FROM achievements WHERE id != ?').all(a.id);
            let allComplete = true;
            for (const oa of otherAchievements) {
                const oua = db.prepare('SELECT * FROM user_achievements WHERE user_id = ? AND server_id = ? AND achievement_id = ?').get(userId, serverId, oa.id);
                if (!oua || !oua.unlocked || !oua.claimed) {
                    allComplete = false;
                    break;
                }
            }
            progress = allComplete ? 1 : 0;
        }

        if (progress !== undefined && ua && !ua.unlocked) {
            db.prepare('UPDATE user_achievements SET progress = ?, unlocked = ? WHERE id = ?').run(progress, progress >= a.requirement_target ? 1 : 0, ua.id);
        }
    }
}

// Give item to user
function giveItemToUser(userId, serverId, itemId, quantity = 1) {
    const existing = db.prepare('SELECT * FROM user_items WHERE user_id = ? AND server_id = ? AND item_id = ?').get(userId, serverId, itemId);
    if (existing) {
        db.prepare('UPDATE user_items SET quantity = quantity + ? WHERE id = ?').run(quantity, existing.id);
    } else {
        db.prepare('INSERT INTO user_items (user_id, server_id, item_id, quantity) VALUES (?, ?, ?, ?)').run(userId, serverId, itemId, quantity);
    }
}

// Give title to user
function giveTitleToUser(userId, serverId, titleId) {
    db.prepare('INSERT OR IGNORE INTO user_titles (user_id, server_id, title_id) VALUES (?, ?, ?)').run(userId, serverId, titleId);
}

module.exports = {
    getTodayUTC,
    getWeekStartUTC,
    getDailyQuestRotation,
    assignQuestsToUser,
    updateQuestProgress,
    updateAchievementProgress,
    giveItemToUser,
    giveTitleToUser
};
