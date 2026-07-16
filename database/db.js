
require('dotenv').config();
const { createClient } = require('@libsql/client');

// Use local SQLite if TURSO_URL not set (for development), else use Turso
const db = process.env.TURSO_URL 
  ? createClient({
      url: process.env.TURSO_URL,
      authToken: process.env.TURSO_AUTH_TOKEN
    })
  : (() => {
      // Fallback to local better-sqlite3 for local dev
      const Database = require('better-sqlite3');
      const path = require('path');
      const localDb = new Database(path.join(__dirname, 'game.db'));
      localDb.pragma('journal_mode = WAL');
      return localDb;
    })();

// Create tables (works for both Turso and local SQLite)
const createTables = async () => {
  try {
    // For Turso (async)
    if (db.execute) {
      await db.execute(`
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
      `);
    } else {
      // For local better-sqlite3 (sync)
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
      `);
    }
  } catch (err) {
    console.error('Error creating tables:', err);
  }
};

createTables();

module.exports = db;
