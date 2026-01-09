// --- CONFIGURATION ---
// 1. PASTE YOUR DEPLOYED GOOGLE SCRIPT URL BETWEEN THE QUOTES BELOW:
const scriptURL = "https://script.google.com/macros/s/AKfycbyieXUOJqeOh3l4KkrUBYmQkptpsWf-ersSvhFe80sKoUws9fnzAreARW4CrNlpeuKW9Q/exec";

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

let picks = { afc: { wcWinners: [], divWinners: [], champion: null }, nfc: { wcWinners: [], divWinners: [], champion: null }, superBowlWinner: null };
let communityStats = {};

document.addEventListener('DOMContentLoaded', () => {
    refreshAllRounds();
    fetchCommunityStats();

    // Reset Button
    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) resetBtn.addEventListener('click', resetBracket);

    // Press Enter to Load
    const emailInput = document.getElementById('useremail');
    if (emailInput) {
        emailInput.addEventListener('keyup', function (event) {
            if (event.key === 'Enter') {
                loadBracket();
            }
        });
    }
});

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

// --- UI MODALS ---
function openScoringModal() { document.getElementById('scoring-modal').style.display = 'block'; }
function closeScoringModal() { document.getElementById('scoring-modal').style.display = 'none'; }
function closeLeaderboard() { document.getElementById('leaderboard-modal').style.display = 'none'; }

function openLeaderboard() {
    document.getElementById('leaderboard-modal').style.display = 'block';
    const list = document.getElementById('leaderboard-list');
    list.innerHTML = '<div style="text-align:center; padding:20px;">Loading Scores...</div>';

    fetch(`${scriptURL}?cmd=leaderboard`)
        .then(r => r.json())
        .then(data => {
            if (data.status === 'success') {
                list.innerHTML = '';
                if (data.leaderboard.length === 0) { list.innerHTML = '<div style="padding:10px;">No brackets saved yet.</div>'; return; }
                data.leaderboard.forEach((player, index) => {
                    const row = document.createElement('div');
                    row.className = 'leader-row';
                    row.innerHTML = `<div class="leader-info"><span class="leader-name">${index + 1}. ${player.name}</span><span class="leader-score">${player.score} Pts</span></div><button class="btn-spy-action" onclick="spyOnUser('${player.email}')">VIEW</button>`;
                    list.appendChild(row);
                });
            } else { list.innerHTML = 'Error loading leaderboard.'; }
        });
}

function spyOnUser(email) { closeLeaderboard(); loadBracket(email); }

function exitSpyMode() {
    document.body.classList.remove('spy-mode');
    document.getElementById('spy-banner').style.display = 'none';
    const currentEmail = document.getElementById('useremail').value;
    if (currentEmail) { loadBracket(); }
    else {
        const savedEmail = localStorage.getItem('nflBracketEmail');
        if (savedEmail) { document.getElementById('useremail').value = savedEmail; loadBracket(); }
        else { resetBracket(); }
    }
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
    container.innerHTML = '';
    if (picks.afc.champion && picks.nfc.champion) {
        const div = document.createElement('div');
        div.className = 'matchup';
        div.innerHTML = `
            <div class="team" data-name="${picks.nfc.champion.name}" onclick="selectWinner('sb', 'sb', 0, '${picks.nfc.champion.name}', 0, this)">
                <span class="seed sb-seed nfc-seed">NFC</span><img src="${picks.nfc.champion.logo}" class="team-logo"><span class="name">${picks.nfc.champion.name}</span>
                ${getStatBadge(picks.nfc.champion.name, 'sb')}
            </div>
            <div class="team" data-name="${picks.afc.champion.name}" onclick="selectWinner('sb', 'sb', 0, '${picks.afc.champion.name}', 0, this)">
                <span class="seed sb-seed afc-seed">AFC</span><img src="${picks.afc.champion.logo}" class="team-logo"><span class="name">${picks.afc.champion.name}</span>
                ${getStatBadge(picks.afc.champion.name, 'sb')}
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
    const teamObj = [
        initialData.afc.bye, ...initialData.afc.wildCardMatchups.flatMap(m => [m.home, m.away]),
        initialData.nfc.bye, ...initialData.nfc.wildCardMatchups.flatMap(m => [m.home, m.away])
    ].find(t => t.name === teamAbbr);
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
        </div>
        <div class="team" data-name="${home.name}" onclick="selectWinner('${conf}', '${round}', ${matchId}, '${home.name}', ${home.seed}, this)">
            <span class="seed">${home.seed}</span><img src="${home.logo}" class="team-logo"><span class="name">${home.name}</span>
            ${getStatBadge(home.name, round)}
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

    // Toggle the class
    bracket.classList.toggle('zoomed-out');

    // Update Button Text
    if (bracket.classList.contains('zoomed-out')) {
        // User just clicked Zoom, so offer them the way back
        btn.innerText = "🔍 NORMAL";
        btn.style.backgroundColor = "#555";
    } else {
        // User is in normal mode, offer them the "Map View"
        btn.innerText = "🔍 VIEW ALL";
        btn.style.backgroundColor = "#e67e22"; // Orange
    }
}

// --- SELECTION LOGIC ---
function selectWinner(conf, round, matchId, teamName, seed, element) {
    const logoImg = element.querySelector('.team-logo');
    const logoPath = logoImg ? logoImg.getAttribute('src') : '';

    if (round === 'wc') {
        picks[conf].wcWinners[matchId] = { name: teamName, seed: seed, logo: logoPath };
        picks[conf].divWinners = []; picks[conf].champion = null; picks.superBowlWinner = null;
        document.getElementById('champion-display').innerHTML = '';
    }
    else if (round === 'div') {
        picks[conf].divWinners[matchId] = { name: teamName, seed: seed, logo: logoPath };
        picks[conf].champion = null; picks.superBowlWinner = null;
        document.getElementById('champion-display').innerHTML = '';
    }
    else if (round === 'champ') {
        picks[conf].champion = { name: teamName, seed: seed, logo: logoPath };
        picks.superBowlWinner = null;
        document.getElementById('champion-display').innerHTML = '';
    }
    else if (round === 'sb') {
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
        for (let t of allTeams) { if (t.innerText.includes(teamName)) { teamDiv = t; break; } }
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
        // Force the badge to match theme (dark text)
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
        picks[conf].wcWinners.forEach((w, i) => { if (w) restoreSelection(conf, 'wc', i, w.name); });
        picks[conf].divWinners.forEach((w, i) => { if (w) restoreSelection(conf, 'div', i, w.name); });
        if (picks[conf].champion) restoreSelection(conf, 'champ', 0, picks[conf].champion.name);
    });
    if (picks.superBowlWinner) restoreSelection('sb', 'sb', 0, picks.superBowlWinner);
}

function resetBracket() {
    if (!confirm("Clear picks?")) return;
    picks = { afc: { wcWinners: [], divWinners: [], champion: null }, nfc: { wcWinners: [], divWinners: [], champion: null }, superBowlWinner: null };
    document.getElementById('champion-display').innerHTML = '';
    document.getElementById('user-score-display').style.display = 'none';
    refreshAllRounds();
}

// --- SUBMIT BRACKET (SAFEGUARDED) ---
function submitBracket() {
    if (document.body.classList.contains('spy-mode')) {
        alert("You are spying! Exit spy mode to save your own bracket.");
        return;
    }

    const user = document.getElementById('username').value;
    const email = document.getElementById('useremail').value;
    const msg = document.getElementById('status-message');

    if (!user || !email) {
        alert("Name and Email required!");
        return;
    }

    if (msg) msg.innerText = "Checking for existing bracket...";

    // BACKGROUND CHECK
    fetch(`${scriptURL}?email=${encodeURIComponent(email)}`)
        .then(r => r.json())
        .then(data => {
            if (data.status === "found") {
                const confirmOverwrite = confirm(
                    `⚠️ EXISTING BRACKET FOUND\n\n` +
                    `We found a saved bracket for "${data.name}" under this email.\n\n` +
                    `Do you want to OVERWRITE it with what is currently on your screen?\n\n` +
                    `• Click OK to Save (This deletes your old bracket)\n` +
                    `• Click Cancel to Stop`
                );
                if (confirmOverwrite) { executeSave(user, email, msg); }
                else { if (msg) msg.innerText = "Save Cancelled."; }
            } else {
                executeSave(user, email, msg);
            }
        })
        .catch(err => {
            console.error(err);
            executeSave(user, email, msg);
        });
}

function executeSave(user, email, msg) {
    if (msg) msg.innerText = "Saving...";
    const payload = { name: user, email: email, picks: picks };

    fetch(scriptURL, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }).then(() => {
        if (msg) msg.innerText = "Saved!";
        localStorage.setItem('nflBracketEmail', email);
        alert("Bracket Saved Successfully!");
    });
}

function loadBracket(spyEmail = null) {
    const isSpying = !!spyEmail;
    let email = spyEmail || document.getElementById('useremail').value || localStorage.getItem('nflBracketEmail');
    if (!email) { alert("Enter email."); return; }

    if (!isSpying) document.getElementById('useremail').value = email;
    const msg = document.getElementById('status-message');
    if (msg && !isSpying) msg.innerText = "Loading...";

    fetch(`${scriptURL}?email=${encodeURIComponent(email)}`)
        .then(r => r.json())
        .then(data => {
            if (data.status === "found") {
                picks = data.picks;
                if (isSpying) {
                    document.body.classList.add('spy-mode');
                    document.getElementById('spy-banner').style.display = 'block';
                    document.getElementById('spy-target-name').innerText = data.name.toUpperCase();
                } else { document.getElementById('username').value = data.name; }

                if (data.score !== undefined) {
                    document.getElementById('user-score-display').style.display = 'block';
                    document.getElementById('score-value').innerText = data.score;
                }
                refreshAllRounds();
                restoreUIFromPicks();
                if (msg && !isSpying) msg.innerText = "Loaded!";
                try { if (data.masterPicks) gradeBracket(data.masterPicks); } catch (err) { }
            } else {
                alert("Not found.");
                if (msg) msg.innerText = "Not found.";
            }
        });
}

function gradeBracket(master) {
    let deadTeams = new Set();
    ['afc', 'nfc'].forEach(conf => {
        if (master[conf] && master[conf].wcWinners) {
            master[conf].wcWinners.forEach((mWin, i) => {
                if (mWin) {
                    const match = initialData[conf].wildCardMatchups[i];
                    const loser = (match.home.name === mWin.name) ? match.away.name : match.home.name;
                    deadTeams.add(loser);
                }
            });
        }
    });

    ['afc', 'nfc'].forEach(conf => {
        // WC Round
        picks[conf].wcWinners.forEach((uPick, i) => {
            if (!uPick) return;
            const uiElement = findTeamElement(conf, 'wc', i, uPick.name);
            if (master[conf] && master[conf].wcWinners && master[conf].wcWinners[i]) {
                const mPick = master[conf].wcWinners[i];
                if (uPick.name === mPick.name) uiElement.classList.add('correct', 'wc');
                else uiElement.classList.add('incorrect');
            }
        });

        // Div Round
        picks[conf].divWinners.forEach((uPick, i) => {
            if (!uPick) return;
            const uiElement = findTeamElement(conf, 'div', i, uPick.name);
            if (deadTeams.has(uPick.name)) {
                // ZOMBIE LOGIC
                uiElement.classList.add('eliminated');
                uiElement.style.setProperty('background-color', '#2a2a2a', 'important');
                uiElement.style.setProperty('border-color', '#444444', 'important');
                uiElement.style.setProperty('opacity', '0.5', 'important');
                const nameSpan = uiElement.querySelector('.name');
                if (nameSpan) nameSpan.style.setProperty('color', '#888888', 'important');
            }
            else if (master[conf] && master[conf].divWinners) {
                if (master[conf].divWinners[i] && master[conf].divWinners[i].name === uPick.name) uiElement.classList.add('correct', 'div');
                else if (master[conf].divWinners[i]) uiElement.classList.add('incorrect');
            }
        });

        // Champ Round
        if (picks[conf].champion) {
            const uPick = picks[conf].champion;
            const uiElement = findTeamElement(conf, 'champ', 0, uPick.name);
            if (deadTeams.has(uPick.name)) {
                // ZOMBIE LOGIC
                uiElement.classList.add('eliminated');
                uiElement.style.setProperty('background-color', '#2a2a2a', 'important');
                uiElement.style.setProperty('border-color', '#444444', 'important');
                uiElement.style.setProperty('opacity', '0.5', 'important');
                const nameSpan = uiElement.querySelector('.name');
                if (nameSpan) nameSpan.style.setProperty('color', '#888888', 'important');
            }
            else if (master[conf] && master[conf].champion) {
                if (master[conf].champion.name === uPick.name) uiElement.classList.add('correct', 'champ');
                else uiElement.classList.add('incorrect');
            }
        }
    });

    if (picks.superBowlWinner) {
        const uiElement = document.querySelector('#super-bowl-matchup .team.selected');
        if (uiElement) {
            if (deadTeams.has(picks.superBowlWinner)) {
                // ZOMBIE LOGIC
                uiElement.classList.add('eliminated');
                uiElement.style.setProperty('background-color', '#2a2a2a', 'important');
                uiElement.style.setProperty('border-color', '#444444', 'important');
                uiElement.style.setProperty('opacity', '0.5', 'important');
                const nameSpan = uiElement.querySelector('.name');
                if (nameSpan) nameSpan.style.setProperty('color', '#888888', 'important');
            }
            else if (master.superBowlWinner) {
                if (master.superBowlWinner === picks.superBowlWinner) uiElement.classList.add('correct', 'sb');
                else uiElement.classList.add('incorrect');
            }
        }
    }
}

window.onclick = function (event) {
    if (event.target == document.getElementById('scoring-modal')) closeScoringModal();
    if (event.target == document.getElementById('leaderboard-modal')) closeLeaderboard();
}