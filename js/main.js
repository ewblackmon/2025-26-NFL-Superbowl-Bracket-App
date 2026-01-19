let leaderboardCache = []; // Stores the FULL data (scores + picks)
let quill; // Global variable for the rich text editor

// --- CONFIGURATION ---
const scriptURL = "https://script.google.com/macros/s/AKfycbyieXUOJqeOh3l4KkrUBYmQkptpsWf-ersSvhFe80sKoUws9fnzAreARW4CrNlpeuKW9Q/exec";

// ⚠️ DEADLINE: January 10, 2026 at 1:30 PM Pacific Standard Time
const LOCK_DATE = new Date("January 10, 2026 13:30:00 PST");
const ADMIN_EMAIL = "masterkey@masterkey.com";

// --- DATA ---
const teamFullNames = {
    "DEN": "Denver Broncos", "PIT": "Pittsburgh Steelers", "HOU": "Houston Texans",
    "JAX": "Jacksonville Jaguars", "BUF": "Buffalo Bills", "NE": "New England Patriots",
    "LAC": "Los Angeles Chargers", "SEA": "Seattle Seahawks", "CAR": "Carolina Panthers",
    "LAR": "Los Angeles Rams", "PHI": "Philadelphia Eagles", "SF": "San Francisco 49ers",
    "CHI": "Chicago Bears", "GB": "Green Bay Packers"
};

const initialData = {
    afc: {
        bye: { name: "DEN", seed: 1, logo: "https://a.espncdn.com/i/teamlogos/nfl/500/den.png" },
        wildCardMatchups: [
            { home: { name: "PIT", seed: 4, logo: "https://a.espncdn.com/i/teamlogos/nfl/500/pit.png" }, away: { name: "HOU", seed: 5, logo: "https://a.espncdn.com/i/teamlogos/nfl/500/hou.png" } },
            { home: { name: "JAX", seed: 3, logo: "https://a.espncdn.com/i/teamlogos/nfl/500/jax.png" }, away: { name: "BUF", seed: 6, logo: "https://a.espncdn.com/i/teamlogos/nfl/500/buf.png" } },
            { home: { name: "NE", seed: 2, logo: "https://a.espncdn.com/i/teamlogos/nfl/500/ne.png" }, away: { name: "LAC", seed: 7, logo: "https://a.espncdn.com/i/teamlogos/nfl/500/lac.png" } }
        ]
    },
    nfc: {
        bye: { name: "SEA", seed: 1, logo: "https://a.espncdn.com/i/teamlogos/nfl/500/sea.png" },
        wildCardMatchups: [
            { home: { name: "CAR", seed: 4, logo: "https://a.espncdn.com/i/teamlogos/nfl/500/car.png" }, away: { name: "LAR", seed: 5, logo: "https://a.espncdn.com/i/teamlogos/nfl/500/lar.png" } },
            { home: { name: "PHI", seed: 3, logo: "https://a.espncdn.com/i/teamlogos/nfl/500/phi.png" }, away: { name: "SF", seed: 6, logo: "https://a.espncdn.com/i/teamlogos/nfl/500/sf.png" } },
            { home: { name: "CHI", seed: 2, logo: "https://a.espncdn.com/i/teamlogos/nfl/500/chi.png" }, away: { name: "GB", seed: 7, logo: "https://a.espncdn.com/i/teamlogos/nfl/500/gb.png" } }
        ]
    }
};

let picks = {
    afc: { wcWinners: [], divWinners: [], champion: null },
    nfc: { wcWinners: [], divWinners: [], champion: null },
    superBowlWinner: null,
    scores: {} // NEW: Score Storage
};
let communityStats = {};

document.addEventListener('DOMContentLoaded', () => {
    // --- INITIALIZE RICH TEXT EDITOR ---
    if (document.getElementById('editor-container')) {
        quill = new Quill('#editor-container', {
            theme: 'snow',
            placeholder: 'Type message or paste from Google Docs...',
            modules: {
                toolbar: [
                    [{ 'header': [1, 2, false] }],
                    ['bold', 'italic', 'underline'],
                    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                    ['clean']
                ]
            }
        });
    }

    const savedEmail = localStorage.getItem('nflBracketEmail');
    if (savedEmail) {
        document.getElementById('useremail').value = savedEmail;
    }

    refreshAllRounds();
    fetchCommunityStats();
    checkDeadlineLock();

    const urlParams = new URLSearchParams(window.location.search);
    const spyEmail = urlParams.get('spy');

    if (spyEmail) {
        console.log("🕵️ Spy Link Detected:", spyEmail);
        ensureLeaderboardData().then(() => {
            loadBracket(decodeURIComponent(spyEmail), true);
        });
    } else {
        openLeaderboard();
    }

    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) resetBtn.addEventListener('click', resetBracket);

    const emailInput = document.getElementById('useremail');
    if (emailInput) {
        emailInput.addEventListener('input', checkDeadlineLock);
        emailInput.addEventListener('keyup', function (event) {
            if (event.key === 'Enter') loadBracket();
        });
    }
});

// --- DEADLINE CHECKER ---
function checkDeadlineLock() {
    const now = new Date();
    const saveBtn = document.getElementById('btn-save');
    const emailField = document.getElementById('useremail');
    const isMaster = emailField && emailField.value.trim().toLowerCase() === ADMIN_EMAIL;
    const isAdminMode = document.body.classList.contains('admin-mode');

    if (now > LOCK_DATE && !isMaster && !isAdminMode) {
        if (saveBtn) {
            saveBtn.innerText = "🔒 LOCKED";
            saveBtn.style.backgroundColor = "#555";
            saveBtn.style.cursor = "pointer";
            saveBtn.disabled = false;
        }
    } else {
        if (saveBtn) {
            saveBtn.innerText = "SAVE";
            saveBtn.style.backgroundColor = "";
            saveBtn.style.cursor = "pointer";
            saveBtn.disabled = false;
        }
    }
}

// --- STATS LOGIC ---
function fetchCommunityStats() {
    fetch(`${scriptURL}?cmd=stats`)
        .then(r => r.json())
        .then(data => {
            if (data.status === 'success') {
                communityStats = data.stats;
                refreshAllRounds();
            }
        });
}

function getStatBadge(teamName, round) {
    if (Object.keys(communityStats).length === 0) return '';
    if (!communityStats[teamName]) return `<span class="stat-badge">0%</span>`;
    const pct = communityStats[teamName][round];
    return `<span class="stat-badge">${pct !== undefined ? pct : 0}%</span>`;
}

// --- NEW: SCORE HTML GENERATOR ---
function getScoreHTML(conf, round, matchId, teamType) {
    const key = `${conf}-${round}-${matchId}`;
    const scoreVal = (picks.scores && picks.scores[key] && picks.scores[key][teamType]) ? picks.scores[key][teamType] : "";
    return `
        <span class="team-score">${scoreVal}</span>
        <input type="tel" class="score-input" data-key="${key}" data-type="${teamType}" value="${scoreVal}" onclick="event.stopPropagation()">
    `;
}

// --- UI MODALS ---
function openInfoModal() { document.getElementById('info-modal').style.display = 'block'; }
function closeInfoModal() { document.getElementById('info-modal').style.display = 'none'; }
function closeLeaderboard() { document.getElementById('leaderboard-modal').style.display = 'none'; }

// --- LEADERBOARD & CACHING ---
function ensureLeaderboardData() {
    if (leaderboardCache && leaderboardCache.length > 0) return Promise.resolve(leaderboardCache);
    return fetch(`${scriptURL}?cmd=leaderboard`)
        .then(r => r.json())
        .then(data => {
            if (data.status === 'success') {
                leaderboardCache = data.leaderboard;
                return leaderboardCache;
            }
            return [];
        });
}

function openLeaderboard() {
    const modal = document.getElementById('leaderboard-modal');
    modal.style.display = 'block';
    const list = document.getElementById('leaderboard-list');
    if (leaderboardCache.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding:20px;">Loading Scores...</div>';
    }
    const currentEmail = document.getElementById('useremail').value.trim().toLowerCase();
    const amIAdmin = (currentEmail === ADMIN_EMAIL);
    ensureLeaderboardData().then(participants => {
        renderLeaderboardList(participants, currentEmail, amIAdmin);
    });
}

function renderLeaderboardList(participants, currentEmail, amIAdmin) {
    const list = document.getElementById('leaderboard-list');
    list.innerHTML = '';
    if (participants.length === 0) { list.innerHTML = '<div style="padding:10px;">No brackets saved yet.</div>'; return; }
    if (amIAdmin) {
        const header = document.createElement('div');
        header.innerHTML = `<div style="background:#c0392b; color:white; padding:5px; text-align:center; margin-bottom:10px; font-weight:bold; border-radius:4px;">🛠️ ADMIN CONSOLE ACTIVE</div>`;
        list.appendChild(header);
    }
    participants.forEach((player) => {
        const row = document.createElement('div');
        row.className = 'leader-row';
        if (player.email.toLowerCase() === currentEmail) {
            row.style.backgroundColor = "#333300";
            row.style.border = "1px solid #FFD700";
        }
        let actionButton = '';
        if (amIAdmin) {
            actionButton = `<button class="btn-spy-action" style="background:#e74c3c; border-color:#c0392b;" onclick="editUser('${player.email}')">✏️ EDIT</button>`;
        } else {
            actionButton = `<button class="btn-spy-action" onclick="spyOnUser('${player.email}')">VIEW</button>`;
        }
        row.innerHTML = `<div class="leader-rank">${player.displayRank || '-'}</div><div class="leader-info"><span class="leader-name">${player.name}</span><span class="leader-score">${player.score} Pts</span></div>${actionButton}`;
        list.appendChild(row);
    });
}

// Handle Next/Prev Clicks
function navigateBracket(offset) {
    const currentEmail = document.getElementById('useremail').value.trim().toLowerCase();
    const isAdminMode = document.body.classList.contains('admin-mode');
    if (leaderboardCache.length === 0) return;
    const currentIndex = leaderboardCache.findIndex(p => p.email.toLowerCase() === currentEmail);
    if (currentIndex === -1) return;
    const newIndex = currentIndex + offset;
    if (newIndex >= 0 && newIndex < leaderboardCache.length) {
        const nextPlayer = leaderboardCache[newIndex];
        if (isAdminMode) editUser(nextPlayer.email);
        else spyOnUser(nextPlayer.email);
    }
}

// --- INSTANT LOAD FUNCTIONS ---
function spyOnUser(email) {
    closeLeaderboard();
    const cachedUser = leaderboardCache.find(p => p.email.toLowerCase() === email.toLowerCase());
    if (cachedUser) loadFromCache(cachedUser, true);
    else loadBracket(email, true);
}

function editUser(email) {
    closeLeaderboard();
    document.body.classList.add('admin-mode');
    const cachedUser = leaderboardCache.find(p => p.email.toLowerCase() === email.toLowerCase());
    if (cachedUser) loadFromCache(cachedUser, false);
    else { document.getElementById('useremail').value = email; loadBracket(null); }
}

function loadFromCache(userData, isSpyMode) {
    picks = userData.picks || picks;
    // Ensure scores object
    if (!picks.scores) picks.scores = {};

    document.getElementById('username').value = userData.name;
    const banner = document.getElementById('spy-banner');
    const isAdmin = document.body.classList.contains('admin-mode');

    // --- OFFICIAL VIEW TOGGLE ---
    const isOfficial = (userData.email.toLowerCase() === ADMIN_EMAIL);
    document.getElementById('btn-broadcast').style.display = isOfficial ? 'block' : 'none';
    const bracketArea = document.getElementById('bracket-area');
    if (isOfficial) bracketArea.classList.add('official-view');
    else bracketArea.classList.remove('official-view');
    // ----------------------------

    if (isSpyMode || isAdmin) {
        if (isSpyMode) document.body.classList.add('spy-mode');
        banner.style.display = 'flex';
        banner.style.background = isAdmin ? '#c0392b' : '#333';
        if (userData.email.toLowerCase() === ADMIN_EMAIL && isSpyMode) {
            document.getElementById('useremail').value = "";
            document.getElementById('useremail').placeholder = "";
        } else {
            document.getElementById('useremail').value = userData.email;
        }
        const idx = leaderboardCache.findIndex(p => p.email.toLowerCase() === userData.email.toLowerCase());
        const prevDisabled = (idx <= 0) ? 'disabled' : '';
        const nextDisabled = (idx === -1 || idx >= leaderboardCache.length - 1) ? 'disabled' : '';
        const labelText = isAdmin ? "EDITING:" : "SPYING ON:";
        const exitAction = isAdmin ? "exitEditMode" : "exitSpyMode";
        const exitLabel = isAdmin ? "DONE" : "EXIT";
        banner.innerHTML = `<button class="nav-btn" onclick="navigateBracket(-1)" ${prevDisabled}>❮</button><div class="banner-content"><span>${labelText}</span><strong id="spy-target-name">${userData.name.toUpperCase()}</strong></div><button class="nav-btn" onclick="navigateBracket(1)" ${nextDisabled}>❯</button><button class="btn-exit-spy" onclick="${exitAction}()">${exitLabel}</button>`;
    }

    const scoreDisplay = document.getElementById('user-score-display');
    scoreDisplay.style.display = 'block';
    if (userData.displayRank) {
        scoreDisplay.innerHTML = `Current Score: <span id="score-value">${userData.score}</span> <span style="color:#888">|</span> <span style="color:#FFD700">${userData.displayRank} Place</span>`;
    } else {
        scoreDisplay.innerHTML = `Current Score: <span id="score-value">${userData.score}</span>`;
    }
    refreshAllRounds();
    restoreUIFromPicks();
    checkDeadlineLock();
    const masterKey = leaderboardCache.find(p => p.email.toLowerCase() === ADMIN_EMAIL);
    if (masterKey && masterKey.picks) {
        gradeBracket(masterKey.picks);
    }
}

function exitSpyMode() {
    document.body.classList.remove('spy-mode');
    document.getElementById('spy-banner').style.display = 'none';
    document.getElementById('useremail').placeholder = "Email";
    document.getElementById('btn-broadcast').style.display = 'none';
    document.getElementById('bracket-area').classList.remove('official-view'); // Reset

    const savedEmail = localStorage.getItem('nflBracketEmail');
    window.history.replaceState({}, document.title, window.location.pathname);
    if (savedEmail) {
        document.getElementById('useremail').value = savedEmail;
        const myData = leaderboardCache.find(p => p.email.toLowerCase() === savedEmail.toLowerCase());
        if (myData) loadFromCache(myData, false);
        else loadBracket();
    } else {
        document.getElementById('useremail').value = "";
        document.getElementById('username').value = "";
        resetBracket();
    }
    openLeaderboard();
}

function exitEditMode() {
    document.body.classList.remove('admin-mode');
    document.getElementById('spy-banner').style.display = 'none';
    document.getElementById('useremail').value = ADMIN_EMAIL;
    loadBracket();
    openLeaderboard();
}

// --- CORE RENDER FUNCTIONS ---
function refreshAllRounds() {
    renderConferenceSide('afc');
    renderConferenceSide('nfc');
    renderSuperBowl();
}

function renderConferenceSide(conf) {
    renderWildCard(conf);
    const wcWinners = picks[conf].wcWinners.filter(x => x);
    if (wcWinners.length === 3) generateDivisionalRound(conf);
    else renderDivisionalPlaceholders(conf);
    const divWinners = picks[conf].divWinners.filter(x => x);
    if (divWinners.length === 2) generateConferenceRound(conf);
    else renderRoundPlaceholders(conf, 'champ', 1);
}

function renderWildCard(conf) {
    const container = document.getElementById(`${conf}-wc`);
    container.innerHTML = '';
    initialData[conf].wildCardMatchups.forEach((match, index) => {
        container.appendChild(createMatchupDiv(match.home, match.away, conf, 'wc', index));
    });
}

function generateDivisionalRound(conf) {
    const byeTeam = initialData[conf].bye;
    const winners = picks[conf].wcWinners;
    const sortedWinners = [...winners].sort((a, b) => a.seed - b.seed);
    const worstSeed = sortedWinners.pop();
    const otherTeam1 = sortedWinners[0];
    const otherTeam2 = sortedWinners[1];
    const container = document.getElementById(`${conf}-div`);
    container.innerHTML = '';
    container.appendChild(createMatchupDiv(byeTeam, worstSeed, conf, 'div', 0));
    container.appendChild(createMatchupDiv(otherTeam1, otherTeam2, conf, 'div', 1));
}

function generateConferenceRound(conf) {
    const winners = picks[conf].divWinners;
    winners.sort((a, b) => a.seed - b.seed);
    const container = document.getElementById(`${conf}-champ`);
    container.innerHTML = '';
    container.appendChild(createMatchupDiv(winners[0], winners[1], conf, 'champ', 0));
}

function renderSuperBowl() {
    const container = document.getElementById('super-bowl-matchup');
    const champContainer = document.getElementById('champion-display');
    container.innerHTML = '';
    champContainer.innerHTML = '';
    if (picks.afc.champion && picks.nfc.champion) {
        const div = document.createElement('div');
        div.className = 'matchup';
        div.innerHTML = `
            <div class="team" data-name="${picks.nfc.champion.name}" onclick="selectWinner('sb', 'sb', 0, '${picks.nfc.champion.name}', 0, this)">
                <span class="seed sb-seed nfc-seed">NFC</span><img src="${picks.nfc.champion.logo}" class="team-logo"><span class="name">${picks.nfc.champion.name}</span>
                ${getStatBadge(picks.nfc.champion.name, 'sb')}
                ${getScoreHTML('sb', 'sb', 0, 'away')}
            </div>
            <div class="team" data-name="${picks.afc.champion.name}" onclick="selectWinner('sb', 'sb', 0, '${picks.afc.champion.name}', 0, this)">
                <span class="seed sb-seed afc-seed">AFC</span><img src="${picks.afc.champion.logo}" class="team-logo"><span class="name">${picks.afc.champion.name}</span>
                ${getStatBadge(picks.afc.champion.name, 'sb')}
                ${getScoreHTML('sb', 'sb', 0, 'home')}
            </div>
        `;
        container.appendChild(div);
        if (picks.superBowlWinner) displayChampion(picks.superBowlWinner);
    } else {
        const div = document.createElement('div');
        div.className = 'matchup';
        div.innerHTML = `<div class="team placeholder"><span class="name">NFC Champ</span></div><div class="team placeholder"><span class="name">AFC Champ</span></div>`;
        container.appendChild(div);
    }
}

function displayChampion(teamAbbr) {
    const champContainer = document.getElementById('champion-display');
    const teamObj = [initialData.afc.bye, ...initialData.afc.wildCardMatchups.flatMap(m => [m.home, m.away]), initialData.nfc.bye, ...initialData.nfc.wildCardMatchups.flatMap(m => [m.home, m.away])].find(t => t.name === teamAbbr);
    const fullName = teamFullNames[teamAbbr] || teamAbbr;
    const logoUrl = teamObj ? teamObj.logo : "";
    champContainer.innerHTML = `<div class="champ-label">Predicted Champion:</div><div class="champ-name">The ${fullName}!!</div><img src="${logoUrl}" class="champ-big-logo">`;
}

function createMatchupDiv(home, away, conf, round, matchId) {
    const div = document.createElement('div');
    div.className = 'matchup';
    div.innerHTML = `
        <div class="team" data-name="${away.name}" onclick="selectWinner('${conf}', '${round}', ${matchId}, '${away.name}', ${away.seed}, this)">
            <span class="seed">${away.seed}</span><img src="${away.logo}" class="team-logo"><span class="name">${away.name}</span>
            ${getStatBadge(away.name, round)}
            ${getScoreHTML(conf, round, matchId, 'away')}
        </div>
        <div class="team" data-name="${home.name}" onclick="selectWinner('${conf}', '${round}', ${matchId}, '${home.name}', ${home.seed}, this)">
            <span class="seed">${home.seed}</span><img src="${home.logo}" class="team-logo"><span class="name">${home.name}</span>
            ${getStatBadge(home.name, round)}
            ${getScoreHTML(conf, round, matchId, 'home')}
        </div>
    `;
    return div;
}

function renderDivisionalPlaceholders(conf) {
    const container = document.getElementById(`${conf}-div`);
    container.innerHTML = `<div class="matchup"><div class="team placeholder"><span class="name">Lowest Seed</span></div><div class="team" style="cursor: default; opacity: 0.8;"><span class="seed">${initialData[conf].bye.seed}</span><img src="${initialData[conf].bye.logo}" class="team-logo"><span class="name">${initialData[conf].bye.name}</span>${getStatBadge(initialData[conf].bye.name, 'div')}</div></div><div class="matchup"><div class="team placeholder"><span class="name">Winner WC</span></div><div class="team placeholder"><span class="name">Winner WC</span></div></div>`;
}

function renderRoundPlaceholders(conf, round, count) {
    const container = document.getElementById(`${conf}-${round}`);
    container.innerHTML = '';
    for (let i = 0; i < count; i++) container.innerHTML += `<div class="matchup"><div class="team placeholder"><span class="name">TBD</span></div><div class="team placeholder"><span class="name">TBD</span></div></div>`;
}

function findTeamElement(conf, round, matchIndex, teamName) {
    const container = document.getElementById(round === 'sb' ? 'super-bowl-matchup' : `${conf}-${round}`);
    if (!container) return document.createElement('div');
    const element = container.querySelector(`.team[data-name="${teamName}"]`);
    return element || document.createElement('div');
}

function toggleZoom() {
    const bracket = document.getElementById('bracket-area');
    const btn = document.getElementById('btn-zoom');
    bracket.classList.toggle('zoomed-out');
    if (bracket.classList.contains('zoomed-out')) {
        btn.innerText = "🔍 ZOOM IN";
        btn.style.backgroundColor = "#555";
    } else {
        btn.innerText = "🔍 ZOOM OUT";
        btn.style.backgroundColor = "#e67e22";
    }
}

// --- SELECTION LOGIC ---
function selectWinner(conf, round, matchId, teamName, seed, element) {
    const logoImg = element.querySelector('.team-logo');
    const logoPath = logoImg ? logoImg.getAttribute('src') : '';
    if (round === 'wc') {
        picks[conf].wcWinners[matchId] = {
            name: teamName,
            seed: seed,
            logo: logoPath
        };
        picks[conf].divWinners = [];
        picks[conf].champion = null;
        picks.superBowlWinner = null;
        document.getElementById('champion-display').innerHTML = '';
    } else if (round === 'div') {
        picks[conf].divWinners[matchId] = {
            name: teamName,
            seed: seed,
            logo: logoPath
        };
        picks[conf].champion = null;
        picks.superBowlWinner = null;
        document.getElementById('champion-display').innerHTML = '';
    } else if (round === 'champ') {
        picks[conf].champion = {
            name: teamName,
            seed: seed,
            logo: logoPath
        };
        picks.superBowlWinner = null;
        document.getElementById('champion-display').innerHTML = '';
    } else if (round === 'sb') {
        picks.superBowlWinner = teamName;
    }
    refreshAllRounds();
    restoreUIFromPicks();
}

function restoreSelection(conf, round, matchId, teamName) {
    const container = document.getElementById(round === 'sb' ? 'super-bowl-matchup' : `${conf}-${round}`);
    if (!container) return;
    let teamDiv = container.querySelector(`.team[data-name="${teamName}"]`);
    if (!teamDiv) {
        const allTeams = container.querySelectorAll('.team');
        for (let t of allTeams) {
            if (t.innerText.includes(teamName)) {
                teamDiv = t;
                break;
            }
        }
    }
    if (teamDiv) {
        teamDiv.classList.add('selected');
        teamDiv.style.setProperty('background-color', '#ffffff', 'important');
        teamDiv.style.setProperty('border-color', '#ffffff', 'important');
        teamDiv.style.setProperty('opacity', '1', 'important');
        const nameSpan = teamDiv.querySelector('.name');
        if (nameSpan) {
            nameSpan.style.setProperty('color', '#000000', 'important');
            nameSpan.style.setProperty('font-weight', '800', 'important');
        }
        const badge = teamDiv.querySelector('.stat-badge');
        if (badge) {
            badge.style.setProperty('background', '#ddd', 'important');
            badge.style.setProperty('color', '#333', 'important');
            badge.style.setProperty('border-color', '#ccc', 'important');
            badge.style.setProperty('font-weight', 'bold', 'important');
        }
    }
}

function restoreUIFromPicks() {
    ['afc', 'nfc'].forEach(conf => {
        picks[conf].wcWinners.forEach((w, i) => {
            if (w) restoreSelection(conf, 'wc', i, w.name);
        });
        picks[conf].divWinners.forEach((w, i) => {
            if (w) restoreSelection(conf, 'div', i, w.name);
        });
        if (picks[conf].champion) restoreSelection(conf, 'champ', 0, picks[conf].champion.name);
    });
    if (picks.superBowlWinner) restoreSelection('sb', 'sb', 0, picks.superBowlWinner);
}

function resetBracket() {
    if (!confirm("Clear picks?")) return;
    picks = {
        afc: { wcWinners: [], divWinners: [], champion: null },
        nfc: { wcWinners: [], divWinners: [], champion: null },
        superBowlWinner: null,
        scores: {}
    };
    document.getElementById('champion-display').innerHTML = '';
    document.getElementById('user-score-display').style.display = 'none';
    refreshAllRounds();
}

// --- SUBMIT ---
function submitBracket() {
    const now = new Date();
    const emailField = document.getElementById('useremail');
    const isMaster = emailField && emailField.value.trim().toLowerCase() === ADMIN_EMAIL;
    const inAdminMode = document.body.classList.contains('admin-mode');

    if (now > LOCK_DATE && !isMaster && !inAdminMode) {
        alert("⛔ DEADLINE PASSED ⛔\n\nThis bracket is locked.\n\nPlease contact the administrator to request changes.");
        return;
    }

    if (document.body.classList.contains('spy-mode')) {
        alert("You are spying! Exit spy mode to save your own bracket.");
        return;
    }

    const user = document.getElementById('username').value;
    const email = document.getElementById('useremail').value;
    const msg = document.getElementById('status-message');

    // --- HARVEST SCORES IF ADMIN ---
    if (inAdminMode && email.toLowerCase() === ADMIN_EMAIL) {
        if (!picks.scores) picks.scores = {};
        document.querySelectorAll('.score-input').forEach(input => {
            const key = input.dataset.key;
            const type = input.dataset.type;
            if (input.value) {
                if (!picks.scores[key]) picks.scores[key] = {};
                picks.scores[key][type] = input.value;
            }
        });
    }
    // -------------------------------

    if (!user || !email) {
        alert("Name and Email required!");
        return;
    }

    if (msg) msg.innerText = "Checking for existing bracket...";

    fetch(`${scriptURL}?email=${encodeURIComponent(email)}`)
        .then(r => r.json())
        .then(data => {
            if (data.status === "found") {
                if (inAdminMode) {
                    runActualSave(user, email, msg);
                } else {
                    const confirmOverwrite = confirm(
                        `⚠️ EXISTING BRACKET FOUND\n\nWe found a saved bracket for "${data.name}" under this email.\n\nDo you want to OVERWRITE it with what is currently on your screen?\n\n• Click OK to Save (This OVERWRITES your old bracket)\n• Click Cancel to Stop`
                    );
                    if (confirmOverwrite) {
                        runActualSave(user, email, msg);
                    } else {
                        if (msg) msg.innerText = "Save Cancelled.";
                    }
                }
            } else {
                runActualSave(user, email, msg);
            }
        })
        .catch(err => {
            console.error(err);
            runActualSave(user, email, msg);
        });
}

function runActualSave(user, email, msg) {
    if (msg) msg.innerText = "Saving...";
    const payload = {
        name: user,
        email: email,
        picks: picks
    };
    fetch(scriptURL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    }).then(() => {
        if (msg) msg.innerText = "Saved!";
        const amIAdmin = document.body.classList.contains('admin-mode');
        if (!amIAdmin) {
            localStorage.setItem('nflBracketEmail', email);
        }
        alert("Bracket Saved Successfully!");
    }).catch(e => {
        alert("Error saving: " + e);
        if (msg) msg.innerText = "Error.";
    });
}

// --- LOAD ---
function loadBracket(spyEmail = null, isSpyMode = false) {
    let email = spyEmail || document.getElementById('useremail').value || localStorage.getItem('nflBracketEmail');
    if (!email) {
        alert("Enter email.");
        return;
    }
    if (!isSpyMode) document.getElementById('useremail').value = email;
    const msg = document.getElementById('status-message');
    if (msg && !isSpyMode) msg.innerText = "Loading...";

    fetch(`${scriptURL}?email=${encodeURIComponent(email)}`)
        .then(r => r.json())
        .then(data => {
            if (data.status === "found") {
                loadFromCache(data, isSpyMode);
                if (msg && !isSpyMode) {
                    msg.innerText = "Loaded!";
                    setTimeout(() => {
                        msg.innerText = "";
                    }, 2000);
                }
            } else {
                alert("Not found.");
                if (msg) msg.innerText = "Not found.";
            }
        });
}

// --- UPDATED GRADING LOGIC (BUFFALO FIX) ---
function gradeBracket(master) {
    // 1. Identify ALL teams that have been eliminated in Reality
    let dead = new Set();

    ['afc', 'nfc'].forEach(conf => {
        // A. Find Wild Card Losers
        if (master[conf]?.wcWinners) {
            master[conf].wcWinners.forEach((mWin, i) => {
                if (mWin) {
                    const match = initialData[conf].wildCardMatchups[i];
                    const loser = (match.home.name === mWin.name) ? match.away.name : match.home.name;
                    dead.add(loser);
                }
            });
        }

        // B. Find Divisional Losers (Simulate Reality)
        const mWcWinners = master[conf]?.wcWinners?.filter(w => w);
        if (mWcWinners && mWcWinners.length === 3) {
            const sorted = [...mWcWinners].sort((a, b) => a.seed - b.seed);
            const worst = sorted.pop();
            const best = sorted[0];
            const mid = sorted[1];
            const byeTeam = initialData[conf].bye;
            const officialMatchups = [{
                p1: byeTeam,
                p2: worst
            }, {
                p1: best,
                p2: mid
            }];
            if (master[conf].divWinners) {
                officialMatchups.forEach((match, i) => {
                    const mWin = master[conf].divWinners[i];
                    if (mWin) {
                        const loser = (match.p1.name === mWin.name) ? match.p2.name : match.p1.name;
                        dead.add(loser);
                    }
                });
            }
        }

        // C. Find Conference Losers
        if (master[conf]?.champion) {
            const mChamp = master[conf].champion;
            const mDivs = master[conf].divWinners;
            if (mDivs && mDivs.length === 2 && mDivs[0] && mDivs[1]) {
                const loser = (mDivs[0].name === mChamp.name) ? mDivs[1].name : mDivs[0].name;
                dead.add(loser);
            }
        }

        // D. Find Super Bowl Loser
        if (master.superBowlWinner) {
            const mSb = master.superBowlWinner;
            const afcChamp = master.afc?.champion;
            const nfcChamp = master.nfc?.champion;
            if (afcChamp && nfcChamp) {
                const loser = (afcChamp.name === mSb) ? nfcChamp.name : afcChamp.name;
                dead.add(loser);
            }
        }
    });

    // 2. Grade the User's Bracket
    ['afc', 'nfc'].forEach(c => {
        // WC Grading
        picks[c].wcWinners.forEach((u, i) => {
            if (u) {
                const e = findTeamElement(c, 'wc', i, u.name);
                if (master[c].wcWinners[i]) {
                    e.classList.add(u.name === master[c].wcWinners[i].name ? 'correct' : 'incorrect', 'wc');
                }
            }
        });

        // Div Grading
        picks[c].divWinners.forEach((u, i) => {
            if (u) {
                const e = findTeamElement(c, 'div', i, u.name);
                if (dead.has(u.name)) {
                    e.classList.add('eliminated', 'incorrect');
                } else {
                    const masterDivs = master[c].divWinners || [];
                    const userWon = masterDivs.some(mw => mw && mw.name === u.name);
                    if (userWon) e.classList.add('correct', 'div');
                }
            }
        });

        // Champ Grading
        if (picks[c].champion) {
            const u = picks[c].champion;
            const e = findTeamElement(c, 'champ', 0, u.name);
            if (dead.has(u.name)) {
                e.classList.add('eliminated', 'incorrect');
            } else {
                const masterChamp = master[c].champion;
                if (masterChamp && masterChamp.name === u.name) e.classList.add('correct', 'champ');
            }
        }
    });

    // Super Bowl Grading
    if (picks.superBowlWinner) {
        const u = picks.superBowlWinner;
        const e = document.querySelector('#super-bowl-matchup .team.selected');
        if (e) {
            if (dead.has(u)) {
                e.classList.add('eliminated', 'incorrect');
            } else if (master.superBowlWinner === u) {
                e.classList.add('correct', 'sb');
            }
        }
    }
}

// --- BROADCAST LOGIC ---
function openBroadcastModal() {
    document.getElementById('broadcast-modal').style.display = 'block';
}

function closeBroadcastModal() {
    document.getElementById('broadcast-modal').style.display = 'none';
}

// NEW: Toggle Button Style based on Checkbox
function toggleBroadcastMode() {
    const isTest = document.getElementById('broadcast-test-toggle').checked;
    const btn = document.getElementById('btn-send-broadcast');
    if (isTest) {
        btn.style.backgroundColor = "#e67e22"; // Orange for Test
        btn.innerText = "SEND TEST EMAIL";
    } else {
        btn.style.backgroundColor = "#2ecc71"; // Green for Broadcast
        btn.innerText = "SEND EMAIL";
    }
}

function sendAppBroadcast() {
    const headline = document.getElementById('broadcast-headline').value;
    const email = document.getElementById('useremail').value;

    // CHANGED: Get HTML content from Quill
    const commentary = quill.root.innerHTML;
    const isTest = document.getElementById('broadcast-test-toggle').checked; // NEW

    if (!headline) {
        alert("Headline required.");
        return;
    }
    if (email.toLowerCase() !== ADMIN_EMAIL) {
        alert("Unauthorized.");
        return;
    }

    // Logic to confirm ONLY if not a test
    if (!isTest) {
        if (!confirm("⚠️ SEND MASS EMAIL?\n\nThis will send an email to ALL players on the leaderboard.")) return;
    }

    const btn = document.getElementById('btn-send-broadcast');
    const originalText = btn.innerText;
    btn.disabled = true;
    btn.innerText = "Sending...";

    fetch(scriptURL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            action: "broadcast",
            email: email,
            headline: headline,
            commentary: commentary,
            testMode: isTest // NEW
        })
    }).then(() => {
        alert(isTest ? "Test Sent!" : "Broadcast Request Sent!");
        closeBroadcastModal();
        btn.disabled = false;
        btn.innerText = originalText;
    }).catch(e => {
        alert("Error: " + e);
        btn.disabled = false;
        btn.innerText = originalText;
    });
}

window.onclick = function (event) {
    if (event.target == document.getElementById('info-modal')) closeInfoModal();
    if (event.target == document.getElementById('leaderboard-modal')) closeLeaderboard();
    if (event.target == document.getElementById('broadcast-modal')) closeBroadcastModal();
}