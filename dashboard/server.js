
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
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } // 7 days!
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
    console.log('[DEBUG] Discord OAuth success, access token length:', accessToken?.length);
    profile.accessToken = accessToken;
    profile.refreshToken = refreshToken;
    done(null, profile);
}));

app.get('/auth/discord', passport.authenticate('discord'));
app.get('/auth/discord/callback', passport.authenticate('discord', { failureRedirect: '/' }), (req, res) => res.redirect('/dashboard'));
app.get('/auth/logout', (req, res) => { req.logout(err => res.redirect('/')); });
app.get('/docs', (req, res) => res.sendFile(path.join(__dirname, 'public', 'docs.html')));
app.get('/battle-log', (req, res) => res.sendFile(path.join(__dirname, 'public', 'battle-log.html')));
app.get('/feedback', (req, res) => res.sendFile(path.join(__dirname, 'public', 'feedback.html')));

// Feedback API Routes
app.post('/api/feedback', async (req, res) => {
    console.log('[DEBUG] Feedback endpoint hit!');
    console.log('[DEBUG] Request body:', req.body);
    
    const { feedbackText } = req.body;
    if (!feedbackText || feedbackText.trim() === '') {
        console.log('[DEBUG] Missing feedback text');
        return res.status(400).json({ error: 'Feedback text is required' });
    }
    const userId = req.user?.id || 'anonymous';
    const username = req.user?.username || 'Anonymous User';
    console.log('[DEBUG] User:', { userId, username });
    
    // Insert into database
    try {
        db.prepare('INSERT INTO feedback (user_id, username, feedback_text) VALUES (?, ?, ?)').run(userId, username, feedbackText.trim());
        console.log('[DEBUG] Feedback saved to database');
    } catch (dbError) {
        console.error('[DEBUG] Database error:', dbError);
        return res.status(500).json({ error: 'Failed to save feedback to database' });
    }
    
    // Try to send Discord notification but don't fail if it doesn't work
    if (process.env.DISCORD_TOKEN) {
        // Send feedback asynchronously without blocking response
        sendDiscordFeedback(userId, username, feedbackText.trim()).catch(err => {
            console.error('[DEBUG] Discord notification failed (non-critical):', err);
        });
    } else {
        console.log('[DEBUG] DISCORD_TOKEN not configured, skipping Discord notification');
    }
    
    // Return success immediately - feedback is saved in DB
    res.status(200).json({ message: 'Feedback saved successfully!' });
});

// Async function to send Discord notifications without blocking
async function sendDiscordFeedback(userId, username, feedbackText) {
    console.log('[DEBUG] sendDiscordFeedback called for user:', username);
    console.log('[DEBUG] DISCORD_TOKEN exists:', !!process.env.DISCORD_TOKEN);
    console.log('[DEBUG] DISCORD_TOKEN length:', process.env.DISCORD_TOKEN?.length);
    console.log('[DEBUG] DISCORD_TOKEN first 20 chars:', JSON.stringify(process.env.DISCORD_TOKEN?.substring(0,20)));
    console.log('[DEBUG] DISCORD_TOKEN last 20 chars:', JSON.stringify(process.env.DISCORD_TOKEN?.substring(process.env.DISCORD_TOKEN.length-20)));
    const token = process.env.DISCORD_TOKEN?.trim();
    console.log('[DEBUG] Trimmed token length:', token?.length);
    
    // First validate the bot token
    try {
        const validateResponse = await fetch('https://discord.com/api/v10/users/@me', {
            headers: {
                'Authorization': `Bot ${token}`
            }
        });
        console.log('[DEBUG] Bot token validation response status:', validateResponse.status);
        if (!validateResponse.ok) {
            const errorText = await validateResponse.text();
            console.error('[DEBUG] Bot token validation failed:', errorText);
            return; // Don't try to send if token is invalid
        }
        const botUser = await validateResponse.json();
        console.log('[DEBUG] Bot user:', botUser.username);
    } catch (error) {
        console.error('[DEBUG] Bot token validation error:', error);
        return;
    }
    
    const sendFeedback = async (destinationId, isChannel = true) => {
        const url = isChannel 
            ? `https://discord.com/api/v10/channels/${destinationId}/messages`
            : `https://discord.com/api/v10/users/@me/channels`;
        
        try {
            let targetUrl = url;
            if (!isChannel) {
                const dmResponse = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bot ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ recipient_id: destinationId })
                });
                console.log(`[DEBUG] DM channel creation response status:`, dmResponse.status);
                if (!dmResponse.ok) {
                    const errorText = await dmResponse.text();
                    console.error(`[DEBUG] DM channel creation failed:`, errorText);
                    return;
                }
                const dmData = await dmResponse.json();
                targetUrl = `https://discord.com/api/v10/channels/${dmData.id}/messages`;
            }
            
            const messagePayload = {
                embeds: [
                    {
                        title: '📝 New Feedback Received!',
                        color: 0xffd700,
                        fields: [
                            { name: 'User', value: `${username} (ID: ${userId})`, inline: true },
                            { name: 'Feedback', value: feedbackText }
                        ],
                        timestamp: new Date().toISOString()
                    }
                ]
            };
            
            console.log(`[DEBUG] Sending to ${isChannel ? 'channel' : 'DM'}:`, targetUrl);
            const messageResponse = await fetch(targetUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bot ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(messagePayload)
            });
            
            console.log(`[DEBUG] Message response status:`, messageResponse.status);
            if (messageResponse.ok) {
                console.log(`[DEBUG] Feedback sent to ${isChannel ? 'channel' : 'DM'} successfully`);
            } else {
                const errorText = await messageResponse.text();
                console.error(`[DEBUG] Failed to send message:`, errorText);
            }
        } catch (error) {
            console.error(`[DEBUG] Error sending feedback to ${isChannel ? 'channel' : 'DM'}:`, error);
        }
    };
    
    // Only send to channel since bot is confirmed to be there
    await sendFeedback('1527647475215896776', true);
}

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
    try {
        const { serverId } = req.params;
        console.log('[DEBUG] Loading role shop for server:', serverId);
        
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated', needsReauth: true });
        }
        
        const guild = req.user?.guilds?.find(g => g.id === serverId);
        if (!guild || !(guild.permissions & 0x20)) {
            console.error('[DEBUG] No permission to access role shop');
            return res.sendStatus(403);
        }
        const shopItems = db.prepare('SELECT * FROM server_role_shop WHERE server_id = ? ORDER BY slot').all(serverId);
        console.log('[DEBUG] Role shop items:', shopItems);
        res.json(shopItems);
    } catch (error) {
        console.error('[DEBUG] Error loading role shop:', error);
        res.status(500).json({ error: 'Failed to load role shop' });
    }
});

app.put('/api/guilds/:serverId/role-shop/:slot', (req, res) => {
    try {
        const { serverId, slot } = req.params;
        const { roleId, cost } = req.body;
        console.log('[DEBUG] Saving role shop slot:', slot, 'for server:', serverId, 'Data:', { roleId, cost });
        
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated', needsReauth: true });
        }
        
        const guild = req.user?.guilds?.find(g => g.id === serverId);
        if (!guild || !(guild.permissions & 0x20)) {
            console.error('[DEBUG] No permission to save role shop slot');
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
        console.log('[DEBUG] Role shop slot saved successfully');
        res.sendStatus(200);
    } catch (error) {
        console.error('[DEBUG] Error saving role shop slot:', error);
        res.status(500).json({ error: 'Failed to save slot' });
    }
});

app.delete('/api/guilds/:serverId/role-shop/:slot', (req, res) => {
    try {
        const { serverId, slot } = req.params;
        console.log('[DEBUG] Deleting role shop slot:', slot, 'for server:', serverId);
        
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated', needsReauth: true });
        }
        
        const guild = req.user?.guilds?.find(g => g.id === serverId);
        if (!guild || !(guild.permissions & 0x20)) {
            console.error('[DEBUG] No permission to delete role shop slot');
            return res.sendStatus(403);
        }
        db.prepare('DELETE FROM server_role_shop WHERE server_id = ? AND slot = ?').run(serverId, parseInt(slot));
        console.log('[DEBUG] Role shop slot deleted successfully');
        res.sendStatus(200);
    } catch (error) {
        console.error('[DEBUG] Error deleting role shop slot:', error);
        res.status(500).json({ error: 'Failed to delete slot' });
    }
});

// API endpoint to check if bot is in server
app.get('/api/guilds/:serverId/bot-status', async (req, res) => {
    try {
        const { serverId } = req.params;
        
        // Use bot token to check if bot is in the guild
        const token = process.env.DISCORD_TOKEN?.trim();
        if (!token) {
            return res.json({ botInServer: true }); // Assume true if no token
        }
        
        const response = await fetch(`https://discord.com/api/v10/guilds/${serverId}/members/${process.env.DISCORD_CLIENT_ID}`, {
            headers: {
                'Authorization': `Bot ${token}`
            }
        });
        
        if (response.ok) {
            res.json({ botInServer: true });
        } else if (response.status === 404) {
            res.json({ botInServer: false });
        } else {
            res.json({ botInServer: true }); // Assume true on other errors
        }
    } catch (error) {
        console.error('Error checking bot status:', error);
        res.json({ botInServer: true }); // Assume true on error
    }
});

// API endpoint to get guild channels from Discord
app.get('/api/guilds/:serverId/channels', async (req, res) => {
    try {
        const { serverId } = req.params;
        console.log('[DEBUG] Loading channels for server:', serverId);
        console.log('[DEBUG] User:', req.user?.id, req.user?.username);
        
        const guild = req.user?.guilds?.find(g => g.id === serverId);
        if (!guild || !(guild.permissions & 0x20)) {
            console.error('[DEBUG] No permission to access guild channels');
            return res.sendStatus(403);
        }
        
        // Use bot token instead of user token to avoid session expiration
        const token = process.env.DISCORD_TOKEN?.trim();
        console.log('[DEBUG] Fetching channels from Discord API using bot token...');
        const response = await fetch(`https://discord.com/api/v10/guilds/${serverId}/channels`, {
            headers: {
                'Authorization': `Bot ${token}`
            }
        });
        
        console.log('[DEBUG] Discord API response status:', response.status);
        if (!response.ok) {
            const errorText = await response.text();
            console.error('[DEBUG] Failed to fetch guild channels:', errorText);
            return res.status(response.status).json({ error: 'Failed to fetch guild channels' });
        }
        
        const channels = await response.json();
        console.log('[DEBUG] Channels from Discord:', channels.length, 'channels');
        
        // Filter to only text channels
        const textChannels = channels.filter(ch => ch.type === 0); // Type 0 is text channel
        console.log('[DEBUG] Filtered to', textChannels.length, 'text channels');
        
        res.json(textChannels);
    } catch (error) {
        console.error('[DEBUG] Error fetching guild channels:', error);
        res.status(500).json({ error: 'Failed to fetch guild channels' });
    }
});

// Server Config API Routes
app.get('/api/guilds/:serverId/config', (req, res) => {
    try {
        const { serverId } = req.params;
        console.log('[DEBUG] Loading config for server:', serverId);
        
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated', needsReauth: true });
        }
        
        const guild = req.user?.guilds?.find(g => g.id === serverId);
        if (!guild || !(guild.permissions & 0x20)) {
            console.error('[DEBUG] No permission to access guild config');
            return res.sendStatus(403);
        }
        let config = db.prepare('SELECT * FROM server_config WHERE server_id = ?').get(serverId);
        if (!config) {
            console.log('[DEBUG] No config found, creating default');
            db.prepare('INSERT OR IGNORE INTO server_config (server_id) VALUES (?)').run(serverId);
            config = db.prepare('SELECT * FROM server_config WHERE server_id = ?').get(serverId);
        }
        console.log('[DEBUG] Config found:', config);
        const trackedChannels = db.prepare('SELECT channel_id FROM server_tracked_channels WHERE server_id = ?').all(serverId);
        console.log('[DEBUG] Tracked channels:', trackedChannels);
        res.json({ config, trackedChannels: trackedChannels.map(c => c.channel_id) });
    } catch (error) {
        console.error('[DEBUG] Error loading server config:', error);
        res.status(500).json({ error: 'Failed to load server config' });
    }
});

app.put('/api/guilds/:serverId/config', (req, res) => {
    try {
        const { serverId } = req.params;
        const { coinsEasy, coinsMid, coinsStrong, coinsVeryStrong, trackedChannels } = req.body;
        console.log('[DEBUG] Saving config for server:', serverId, 'Data:', { coinsEasy, coinsMid, coinsStrong, coinsVeryStrong, trackedChannels });
        
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated', needsReauth: true });
        }
        
        const guild = req.user?.guilds?.find(g => g.id === serverId);
        if (!guild || !(guild.permissions & 0x20)) {
            console.error('[DEBUG] No permission to save guild config');
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
        console.log('[DEBUG] Config saved successfully');
        res.sendStatus(200);
    } catch (error) {
        console.error('[DEBUG] Error saving server config:', error);
        res.status(500).json({ error: 'Failed to save server config' });
    }
});

app.use((req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`Dashboard running on http://localhost:${PORT}`));
