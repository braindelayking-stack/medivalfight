
let currentUser = null;
let currentServer = null;

document.addEventListener('DOMContentLoaded', async () => {
    const res = await fetch('/api/user');
    currentUser = await res.json();
    updateUI();

    document.getElementById('nav-home').addEventListener('click', () => showPage('home'));
    document.getElementById('nav-dashboard').addEventListener('click', () => showPage('dashboard'));
    document.getElementById('nav-logout').addEventListener('click', () => window.location.href = '/auth/logout');
    document.getElementById('save-profile').addEventListener('click', saveProfile);
    document.getElementById('back-to-dashboard').addEventListener('click', () => {
        currentServer = null;
        showPage('dashboard');
    });
    document.getElementById('save-server-config').addEventListener('click', saveServerConfig);
});

function updateUI() {
    if (currentUser) {
        showPage('dashboard');
        document.getElementById('nav-dashboard').classList.remove('hidden');
        document.getElementById('nav-logout').classList.remove('hidden');
        loadDashboard();
    } else {
        showPage('home');
        document.getElementById('nav-dashboard').classList.add('hidden');
        document.getElementById('nav-logout').classList.add('hidden');
    }
}

function showPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    document.getElementById(page).classList.remove('hidden');
}

async function loadDashboard() {
    document.getElementById('user-avatar').src = `https://cdn.discordapp.com/avatars/${currentUser.id}/${currentUser.avatar}.png?size=256`;
    const guildsDiv = document.getElementById('guilds');
    const manageableGuilds = currentUser.guilds.filter(g => g.permissions & 0x20); // 0x20 is Manage Guild
    guildsDiv.innerHTML = '<h3>Your Servers</h3><div class="guilds-grid">' + manageableGuilds.map(g => 
        `<div class="guild-card" data-server-id="${g.id}" data-server-name="${g.name}">${g.name}</div>`
    ).join('') + '</div>';

    // Add click listeners to guild cards
    const guildCards = document.querySelectorAll('.guild-card');
    guildCards.forEach(card => {
        card.addEventListener('click', () => {
            const serverId = card.dataset.serverId;
            const serverName = card.dataset.serverName;
            openServerManagement(serverId, serverName);
        });
    });
}

async function saveProfile() {
    if (!currentUser) return;
    const gameUsername = document.getElementById('game-username').value;
    const gameAvatar = document.getElementById('game-avatar').value;
    for (const g of currentUser.guilds) {
        await fetch(`/api/user/${g.id}/${currentUser.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ game_username: gameUsername || null, game_avatar: gameAvatar || null })
        });
    }
    alert('Profile saved!');
}

async function openServerManagement(serverId, serverName) {
    currentServer = { id: serverId, name: serverName };
    document.getElementById('server-name').textContent = serverName;
    
    // Check if bot is in the server
    const botInServer = await checkBotInServer(serverId);
    if (!botInServer) {
        showBotInvitePopup(serverName);
        return;
    }
    
    await loadServerRoleShop();
    await loadServerConfig();
    await loadServerChannels();
    showPage('server-management');
}

async function checkBotInServer(serverId) {
    try {
        // Check if bot is in the guild by trying to fetch bot member
        const response = await fetch(`/api/guilds/${serverId}/bot-status`);
        if (response.ok) {
            const data = await response.json();
            return data.botInServer;
        }
        return true; // Assume bot is in server if we can't check
    } catch (error) {
        console.error('Error checking bot status:', error);
        return true; // Assume bot is in server on error
    }
}

function showBotInvitePopup(serverName) {
    const popup = document.createElement('div');
    popup.className = 'bot-invite-popup';
    popup.innerHTML = `
        <div class="popup-content">
            <h3>⚔️ Bot Not in Server</h3>
            <p>The Medieval Fight bot is not in <strong>${serverName}</strong> yet!</p>
            <p>You need to invite the bot to manage server settings.</p>
            <a href="https://discord.com/oauth2/authorize?client_id=1525535092120879135&permissions=268520448&scope=bot%20applications.commands&guild_id=${currentServer.id}" target="_blank" class="medieval-btn">🚀 Invite Bot</a>
            <button onclick="this.closest('.bot-invite-popup').remove()" class="medieval-btn" style="margin-top: 10px;">Cancel</button>
        </div>
    `;
    document.body.appendChild(popup);
}

async function loadServerConfig() {
    if (!currentServer) return;
    const response = await fetch(`/api/guilds/${currentServer.id}/config`);
    if (!response.ok) {
        alert('Failed to load server config!');
        return;
    }
    const { config, trackedChannels } = await response.json();
    // Populate coin inputs
    document.getElementById('coins-easy').value = config.coins_easy || 100;
    document.getElementById('coins-mid').value = config.coins_mid || 150;
    document.getElementById('coins-strong').value = config.coins_strong || 200;
    document.getElementById('coins-very-strong').value = config.coins_very_strong || 300;
    // Save tracked channels to check later
    window.currentTrackedChannels = trackedChannels;
}

async function loadServerChannels() {
    if (!currentServer) return;
    const response = await fetch(`/api/guilds/${currentServer.id}/channels`);
    if (!response.ok) {
        const data = await response.json();
        if (data.needsReauth) {
            alert('Your Discord session has expired. Please log in again.');
            window.location.href = '/auth/discord';
            return;
        }
        alert('Failed to load server channels!');
        return;
    }
    const channels = await response.json();
    renderChannelList(channels);
}

function renderChannelList(channels) {
    const channelListDiv = document.getElementById('channel-list');
    let html = '';
    channels.forEach(channel => {
        const isTracked = window.currentTrackedChannels?.includes(channel.id) || false;
        html += `
            <div class="channel-item">
                <label class="checkbox-label">
                    <input type="checkbox" class="channel-checkbox" value="${channel.id}" ${isTracked ? 'checked' : ''}>
                    <span class="channel-name">#${channel.name}</span>
                </label>
            </div>
        `;
    });
    channelListDiv.innerHTML = html;
}

async function saveServerConfig() {
    if (!currentServer) return;
    const coinsEasy = parseInt(document.getElementById('coins-easy').value) || 100;
    const coinsMid = parseInt(document.getElementById('coins-mid').value) || 150;
    const coinsStrong = parseInt(document.getElementById('coins-strong').value) || 200;
    const coinsVeryStrong = parseInt(document.getElementById('coins-very-strong').value) || 300;
    // Get all checked channels
    const channelCheckboxes = document.querySelectorAll('.channel-checkbox:checked');
    const trackedChannels = Array.from(channelCheckboxes).map(cb => cb.value);
    
    const response = await fetch(`/api/guilds/${currentServer.id}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coinsEasy, coinsMid, coinsStrong, coinsVeryStrong, trackedChannels })
    });
    
    if (response.ok) {
        alert('Server config saved!');
    } else {
        alert('Failed to save server config!');
    }
}

async function loadServerRoleShop() {
    if (!currentServer) return;
    const response = await fetch(`/api/guilds/${currentServer.id}/role-shop`);
    if (!response.ok) {
        alert('Failed to load role shop!');
        return;
    }
    const shopItems = await response.json();
    renderRoleShopSlots(shopItems);
}

function renderRoleShopSlots(shopItems) {
    const slotsDiv = document.getElementById('role-shop-slots');
    let html = '';
    for (let slot = 1; slot <= 10; slot++) {
        const item = shopItems.find(i => i.slot === slot);
        html += `
            <div class="role-shop-slot">
                <h5>Slot ${slot}</h5>
                <label>Role ID:</label>
                <input type="text" id="slot-${slot}-role-id" class="medieval-input" value="${item?.role_id || ''}" placeholder="Enter role ID">
                <label>Cost (coins):</label>
                <input type="number" id="slot-${slot}-cost" class="medieval-input" value="${item?.cost || ''}" placeholder="Enter cost">
                <div class="slot-buttons">
                    <button class="medieval-btn" onclick="saveSlot(${slot})">Save Slot</button>
                    ${item ? `<button class="medieval-btn delete-btn" onclick="deleteSlot(${slot})">Delete</button>` : ''}
                </div>
            </div>
        `;
    }
    slotsDiv.innerHTML = html;
}

async function saveSlot(slot) {
    if (!currentServer) return;
    const roleId = document.getElementById(`slot-${slot}-role-id`).value.trim();
    const cost = parseInt(document.getElementById(`slot-${slot}-cost`).value.trim());
    if (!roleId || !cost) {
        alert('Please fill in both Role ID and Cost!');
        return;
    }
    const response = await fetch(`/api/guilds/${currentServer.id}/role-shop/${slot}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId, cost })
    });
    if (response.ok) {
        alert('Slot saved!');
        await loadServerRoleShop();
    } else {
        alert('Failed to save slot!');
    }
}

async function deleteSlot(slot) {
    if (!currentServer) return;
    if (!confirm('Are you sure you want to delete this slot?')) return;
    const response = await fetch(`/api/guilds/${currentServer.id}/role-shop/${slot}`, {
        method: 'DELETE'
    });
    if (response.ok) {
        alert('Slot deleted!');
        await loadServerRoleShop();
    } else {
        alert('Failed to delete slot!');
    }
}
