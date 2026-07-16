
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
    await loadServerRoleShop();
    showPage('server-management');
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
