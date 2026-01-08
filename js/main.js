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

const realResults = { superBowl: null, afcChamp: null, nfcChamp: null };

// --- STATE ---
let picks = {
    afc: { wcWinners: [], divWinners: [], champion: null },
    nfc: { wcWinners: [], divWinners: [], champion: null },
    superBowlWinner: null
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    refreshAllRounds();
});

function refreshAllRounds() {
    renderConferenceSide('afc');
    renderConferenceSide('nfc');
    renderSuperBowl();
}

function renderConferenceSide(conf) {
    renderWildCard(conf);

    const wcWinners = picks[conf].wcWinners.filter(x => x);
    if (wcWinners.length === 3) {
        generateDivisionalRound(conf);
    } else {
        renderDivisionalPlaceholders(conf);
    }

    const divWinners = picks[conf].divWinners.filter(x => x);
    if (divWinners.length === 2) {
        generateConferenceRound(conf);
    } else {
        renderRoundPlaceholders(conf, 'champ', 1);
    }
}

// --- RENDER FUNCTIONS ---
function renderWildCard(conf) {
    const container = document.getElementById(`${conf}-wc`);
    container.innerHTML = '';
    initialData[conf].wildCardMatchups.forEach((match, index) => {
        const div = createMatchupDiv(match.home, match.away, conf, 'wc', index);
        container.appendChild(div);
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
            <div class="team" onclick="selectWinner('sb', 'sb', 0, '${picks.nfc.champion.name}', 0, this)">
                <span class="seed sb-seed nfc-seed">NFC</span>
                <img src="${picks.nfc.champion.logo}" alt="${picks.nfc.champion.name}" class="team-logo">
                <span class="name">${picks.nfc.champion.name}</span>
            </div>
            <div class="team" onclick="selectWinner('sb', 'sb', 0, '${picks.afc.champion.name}', 0, this)">
                <span class="seed sb-seed afc-seed">AFC</span>
                <img src="${picks.afc.champion.logo}" alt="${picks.afc.champion.name}" class="team-logo">
                <span class="name">${picks.afc.champion.name}</span>
            </div>
        `;
        container.appendChild(div);

        if (picks.superBowlWinner) {
            displayChampion(picks.superBowlWinner);
        }
    } else {
        const div = document.createElement('div');
        div.className = 'matchup';
        div.innerHTML = `
            <div class="team placeholder"><span class="name">NFC Champ</span></div>
            <div class="team placeholder"><span class="name">AFC Champ</span></div>
        `;
        container.appendChild(div);
    }
}

function displayChampion(teamAbbr) {
    const champContainer = document.getElementById('champion-display');
    const fullName = teamFullNames[teamAbbr] || teamAbbr;
    let logoUrl = "";

    const allTeams = [
        initialData.afc.bye, ...initialData.afc.wildCardMatchups.flatMap(m => [m.home, m.away]),
        initialData.nfc.bye, ...initialData.nfc.wildCardMatchups.flatMap(m => [m.home, m.away])
    ];
    const teamObj = allTeams.find(t => t.name === teamAbbr);
    if (teamObj) logoUrl = teamObj.logo;

    champContainer.innerHTML = `
        <div class="champ-label">Predicted Champion:</div>
        <div class="champ-name">The ${fullName}!!</div>
        <img src="${logoUrl}" class="champ-big-logo" alt="${fullName}">
    `;
}

// --- PLACEHOLDER FUNCTIONS ---
function renderDivisionalPlaceholders(conf) {
    const container = document.getElementById(`${conf}-div`);
    container.innerHTML = '';

    const byeTeam = initialData[conf].bye;
    const div1 = document.createElement('div');
    div1.className = 'matchup';
    div1.innerHTML = `
        <div class="team placeholder"><span class="name">Lowest Seed</span></div>
        <div class="team" style="cursor: default; opacity: 0.8;">
            <span class="seed">${byeTeam.seed}</span>
            <img src="${byeTeam.logo}" alt="${byeTeam.name}" class="team-logo">
            <span class="name">${byeTeam.name}</span>
        </div>
    `;

    const div2 = document.createElement('div');
    div2.className = 'matchup';
    div2.innerHTML = `
        <div class="team placeholder"><span class="name">Winner WC</span></div>
        <div class="team placeholder"><span class="name">Winner WC</span></div>
    `;
    container.appendChild(div1);
    container.appendChild(div2);
}

function renderRoundPlaceholders(conf, round, count) {
    const container = document.getElementById(`${conf}-${round}`);
    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const div = document.createElement('div');
        div.className = 'matchup';
        div.innerHTML = `
            <div class="team placeholder"><span class="name">TBD</span></div>
            <div class="team placeholder"><span class="name">TBD</span></div>
        `;
        container.appendChild(div);
    }
}

// --- SHARED HELPERS ---
function createMatchupDiv(home, away, conf, round, matchId) {
    const div = document.createElement('div');
    div.className = 'matchup';
    div.innerHTML = `
        <div class="team" onclick="selectWinner('${conf}', '${round}', ${matchId}, '${away.name}', ${away.seed}, this)">
            <span class="seed">${away.seed}</span>
            <img src="${away.logo}" alt="${away.name}" class="team-logo">
            <span class="name">${away.name}</span>
        </div>
        <div class="team" onclick="selectWinner('${conf}', '${round}', ${matchId}, '${home.name}', ${home.seed}, this)">
            <span class="seed">${home.seed}</span>
            <img src="${home.logo}" alt="${home.name}" class="team-logo">
            <span class="name">${home.name}</span>
        </div>
    `;
    return div;
}

// --- SELECTION LOGIC ---
function selectWinner(conf, round, matchId, teamName, seed, element) {
    const logoImg = element.querySelector('.team-logo');
    const logoPath = logoImg ? logoImg.getAttribute('src') : '';

    if (round === 'wc') {
        picks[conf].wcWinners[matchId] = { name: teamName, seed: seed, logo: logoPath };
    }
    else if (round === 'div') {
        picks[conf].divWinners[matchId] = { name: teamName, seed: seed, logo: logoPath };
    }
    else if (round === 'champ') {
        picks[conf].champion = { name: teamName, seed: seed, logo: logoPath };
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

    const allTeamsInRound = container.getElementsByClassName('team');
    for (let team of allTeamsInRound) {
        const nameSpan = team.querySelector('.name');
        if (nameSpan && nameSpan.innerText === teamName) {
            team.classList.add('selected');
        }
    }
}

// --- RESET LOGIC ---
function resetBracket() {
    if (!confirm("Are you sure you want to clear your picks?")) return;

    // Clear State
    picks = {
        afc: { wcWinners: [], divWinners: [], champion: null },
        nfc: { wcWinners: [], divWinners: [], champion: null },
        superBowlWinner: null
    };

    // Clear Champion Display
    const champDisplay = document.getElementById('champion-display');
    if (champDisplay) champDisplay.innerHTML = '';

    // Re-render
    refreshAllRounds();
}

// --- SAVE / LOAD ---
function submitBracket() {
    const user = document.getElementById('username').value;
    const email = document.getElementById('useremail').value;
    const msg = document.getElementById('status-message');
    if (!user || !email) { alert("Name and Email required!"); return; }

    const payload = { name: user, email: email, picks: picks };
    if (msg) msg.innerText = "Saving...";

    fetch(scriptURL, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }).then(() => {
        if (msg) msg.innerText = "Saved!";
        localStorage.setItem('nflBracketEmail', email);
        alert("Bracket Saved!");
    });
}

function loadBracket() {
    let email = document.getElementById('useremail').value || localStorage.getItem('nflBracketEmail');
    if (!email) { alert("Enter email."); return; }
    document.getElementById('useremail').value = email;

    const msg = document.getElementById('status-message');
    if (msg) msg.innerText = "Loading...";

    fetch(`${scriptURL}?email=${encodeURIComponent(email)}`)
        .then(r => r.json())
        .then(data => {
            if (data.status === "found") {
                picks = data.picks;
                document.getElementById('username').value = data.name;
                refreshAllRounds();
                restoreUIFromPicks();
                if (msg) msg.innerText = "Loaded!";
            } else {
                alert("Not found.");
                if (msg) msg.innerText = "Not found.";
            }
        });
}

function restoreUIFromPicks() {
    ['afc', 'nfc'].forEach(conf => {
        picks[conf].wcWinners.forEach((w, i) => { if (w) restoreSelection(conf, 'wc', i, w.name); });
        picks[conf].divWinners.forEach((w, i) => { if (w) restoreSelection(conf, 'div', i, w.name); });
        if (picks[conf].champion) restoreSelection(conf, 'champ', 0, picks[conf].champion.name);
    });
    if (picks.superBowlWinner) restoreSelection('sb', 'sb', 0, picks.superBowlWinner);
}