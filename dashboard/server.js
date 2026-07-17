
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const cors = require('cors');
const path = require('path');
const db = require('../database/db');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 86400000 }
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public')));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: process.env.CALLBACK_URL,
    scope: ['identify', 'guilds']
}, (accessToken, refreshToken, profile, done) => {
    // Attach tokens to profile so we can use them later!
    profile.accessToken = accessToken;
    profile.refreshToken = refreshToken;
    done(null, profile);
}));

app.get('/auth/discord', passport.authenticate('discord'));
app.get('/auth/discord/callback', passport.authenticate('discord', { failureRedirect: '/' }), (req, res) => res.redirect('/dashboard'));
app.get('/auth/logout', (req, res) => { req.logout(err => res.redirect('/')); });
app.get('/docs', (req, res) => res.sendFile(path.join(__dirname, 'public', 'docs.html')));
app.get('/battle-log', (req, res) => res.sendFile(path.join(__dirname, 'public', 'battle-log.html')));

app.get('/api/battle-log/:code', (req, res) => {
    const { code } = req.params;
    const log = db.prepare('SELECT * FROM battle_logs WHERE fight_code = ?').get(code);
    if (!log) {
        return res.status(404).json({ error: 'Battle log not found' });
    }
    log.full_log = JSON.parse(log.full_log);
    res.json(log);
});

app.get('/api/user', (req, res) => res.json(req.user || null));

app.get('/api/users/:serverId', (req, res) => {
    const serverId = req.params.serverId;
    const users = db.prepare('SELECT * FROM users WHERE server_id = ?').all(serverId);
    res.json(users);
});

app.get('/api/user/:serverId/:userId', (req, res) => {
    const { serverId, userId } = req.params;
    const user = db.prepare('SELECT * FROM users WHERE user_id = ? AND server_id = ?').get(userId, serverId);
    res.json(user);
});

app.put('/api/user/:serverId/:userId', (req, res) => {
    const { serverId, userId } = req.params;
    const { game_username, game_avatar } = req.body;
    if (!req.user || req.user.id !== userId) return res.sendStatus(403);
    db.prepare('UPDATE users SET game_username = COALESCE(?, game_username), game_avatar = COALESCE(?, game_avatar) WHERE user_id = ? AND server_id = ?').run(game_username, game_avatar, userId, serverId);
    res.sendStatus(200);
});

// Role Shop API Routes
app.get('/api/guilds/:serverId/role-shop', (req, res) => {
    const { serverId } = req.params;
    const guild = req.user?.guilds?.find(g => g.id === serverId);
    if (!guild || !(guild.permissions & 0x20)) {
        return res.sendStatus(403);
    }
    const shopItems = db.prepare('SELECT * FROM server_role_shop WHERE server_id = ? ORDER BY slot').all(serverId);
    res.json(shopItems);
});

app.put('/api/guilds/:serverId/role-shop/:slot', (req, res) => {
    const { serverId, slot } = req.params;
    const { roleId, cost } = req.body;
    const guild = req.user?.guilds?.find(g => g.id === serverId);
    if (!guild || !(guild.permissions & 0x20)) {
        return res.sendStatus(403);
    }
    const slotNum = parseInt(slot);
    if (slotNum < 1 || slotNum > 10) {
        return res.status(400).json({ error: 'Slot must be 1-10' });
    }
    const existing = db.prepare('SELECT * FROM server_role_shop WHERE server_id = ? AND slot = ?').get(serverId, slotNum);
    if (existing) {
        db.prepare('UPDATE server_role_shop SET role_id = ?, cost = ? WHERE server_id = ? AND slot = ?').run(roleId, cost, serverId, slotNum);
    } else {
        db.prepare('INSERT INTO server_role_shop (server_id, role_id, cost, slot) VALUES (?, ?, ?, ?)').run(serverId, roleId, cost, slotNum);
    }
    res.sendStatus(200);
});

app.delete('/api/guilds/:serverId/role-shop/:slot', (req, res) => {
    const { serverId, slot } = req.params;
    const guild = req.user?.guilds?.find(g => g.id === serverId);
    if (!guild || !(guild.permissions & 0x20)) {
        return res.sendStatus(403);
    }
    db.prepare('DELETE FROM server_role_shop WHERE server_id = ? AND slot = ?').run(serverId, parseInt(slot));
    res.sendStatus(200);
});

// API endpoint to get guild channels from Discord
app.get('/api/guilds/:serverId/channels', async (req, res) => {
    const { serverId } = req.params;
    const guild = req.user?.guilds?.find(g => g.id === serverId);
    if (!guild || !(guild.permissions & 0x20)) {
        return res.sendStatus(403);
    }
    try {
        const response = await fetch(`https://discord.com/api/v10/guilds/${serverId}/channels`, {
            headers: {
                'Authorization': `Bot ${process.env.DISCORD_TOKEN}`
            }
        });
        if (!response.ok) {
            console.error('Failed to fetch guild channels:', await response.text());
            return res.status(response.status).json({ error: 'Failed to fetch guild channels' });
        }
        const channels = await response.json();
        // Filter to only text channels
        const textChannels = channels.filter(ch => ch.type === 0); // Type 0 is text channel
        res.json(textChannels);
    } catch (error) {
        console.error('Error fetching guild channels:', error);
        res.status(500).json({ error: 'Failed to fetch guild channels' });
    }
});

// Server Config API Routes
app.get('/api/guilds/:serverId/config', (req, res) => {
    const { serverId } = req.params;
    const guild = req.user?.guilds?.find(g => g.id === serverId);
    if (!guild || !(guild.permissions & 0x20)) {
        return res.sendStatus(403);
    }
    let config = db.prepare('SELECT * FROM server_config WHERE server_id = ?').get(serverId);
    if (!config) {
        db.prepare('INSERT OR IGNORE INTO server_config (server_id) VALUES (?)').run(serverId);
        config = db.prepare('SELECT * FROM server_config WHERE server_id = ?').get(serverId);
    }
    const trackedChannels = db.prepare('SELECT channel_id FROM server_tracked_channels WHERE server_id = ?').all(serverId);
    res.json({ config, trackedChannels: trackedChannels.map(c => c.channel_id) });
});

app.put('/api/guilds/:serverId/config', (req, res) => {
    const { serverId } = req.params;
    const { coinsEasy, coinsMid, coinsStrong, coinsVeryStrong, trackedChannels } = req.body;
    const guild = req.user?.guilds?.find(g => g.id === serverId);
    if (!guild || !(guild.permissions & 0x20)) {
        return res.sendStatus(403);
    }
    db.prepare(`
        INSERT INTO server_config (server_id, coins_easy, coins_mid, coins_strong, coins_very_strong, updated_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(server_id) DO UPDATE SET
            coins_easy = excluded.coins_easy,
            coins_mid = excluded.coins_mid,
            coins_strong = excluded.coins_strong,
            coins_very_strong = excluded.coins_very_strong,
            updated_at = CURRENT_TIMESTAMP
    `).run(serverId, coinsEasy, coinsMid, coinsStrong, coinsVeryStrong);
    db.prepare('DELETE FROM server_tracked_channels WHERE server_id = ?').run(serverId);
    for (const channelId of (trackedChannels || [])) {
        db.prepare('INSERT OR IGNORE INTO server_tracked_channels (server_id, channel_id) VALUES (?, ?)').run(serverId, channelId);
    }
    res.sendStatus(200);
});

app.use((req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`Dashboard running on http://localhost:${PORT}`));
