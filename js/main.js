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

let picks = {
    afc: { wcWinners: [], divWinners: [], champion: null },
    nfc: { wcWinners: [], divWinners: [], champion: null },
    superBowlWinner: null
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    refreshAllRounds();
    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) resetBtn.addEventListener('click', resetBracket);
});

// --- RENDER LOGIC ---
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
                <span class="seed sb-seed nfc-seed">NFC</span>
                <img src="${picks.nfc.champion.logo}" alt="${picks.nfc.champion.name}" class="team-logo">
                <span class="name">${picks.nfc.champion.name}</span>
            </div>
            <div class="team" data-name="${picks.afc.champion.name}" onclick="selectWinner('sb', 'sb', 0, '${picks.afc.champion.name}', 0, this)">
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
    const teamObj = [
        initialData.afc.bye, ...initialData.afc.wildCardMatchups.flatMap(m => [m.home, m.away]),
        initialData.nfc.bye, ...initialData.nfc.wildCardMatchups.flatMap(m => [m.home, m.away])
    ].find(t => t.name === teamAbbr);

    const fullName = teamFullNames[teamAbbr] || teamAbbr;
    const logoUrl = teamObj ? teamObj.logo : "";

    champContainer.innerHTML = `
        <div class="champ-label">Predicted Champion:</div>
        <div class="champ-name">The ${fullName}!!</div>
        <img src="${logoUrl}" class="champ-big-logo" alt="${fullName}">
    `;
}

// --- HELPER FUNCTIONS ---
function createMatchupDiv(home, away, conf, round, matchId) {
    const div = document.createElement('div');
    div.className = 'matchup';
    // NOTE: Added data-name attributes for reliable selection logic
    div.innerHTML = `
        <div class="team" data-name="${away.name}" onclick="selectWinner('${conf}', '${round}', ${matchId}, '${away.name}', ${away.seed}, this)">
            <span class="seed">${away.seed}</span><img src="${away.logo}" class="team-logo"><span class="name">${away.name}</span>
        </div>
        <div class="team" data-name="${home.name}" onclick="selectWinner('${conf}', '${round}', ${matchId}, '${home.name}', ${home.seed}, this)">
            <span class="seed">${home.seed}</span><img src="${home.logo}" class="team-logo"><span class="name">${home.name}</span>
        </div>
    `;
    return div;
}

function renderDivisionalPlaceholders(conf) {
    const container = document.getElementById(`${conf}-div`);
    container.innerHTML = '';
    const bye = initialData[conf].bye;
    container.innerHTML = `
        <div class="matchup"><div class="team placeholder"><span class="name">Lowest Seed</span></div>
        <div class="team" style="cursor: default; opacity: 0.8;"><span class="seed">${bye.seed}</span><img src="${bye.logo}" class="team-logo"><span class="name">${bye.name}</span></div></div>
        <div class="matchup"><div class="team placeholder"><span class="name">Winner WC</span></div><div class="team placeholder"><span class="name">Winner WC</span></div></div>
    `;
}

function renderRoundPlaceholders(conf, round, count) {
    const container = document.getElementById(`${conf}-${round}`);
    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
        container.innerHTML += `<div class="matchup"><div class="team placeholder"><span class="name">TBD</span></div><div class="team placeholder"><span class="name">TBD</span></div></div>`;
    }
}

function findTeamElement(conf, round, matchIndex, teamName) {
    const container = document.getElementById(round === 'sb' ? 'super-bowl-matchup' : `${conf}-${round}`);
    if (!container) return document.createElement('div'); // dummy

    // Find precise match via data tag
    const element = container.querySelector(`.team[data-name="${teamName}"]`);
    return element || document.createElement('div');
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

    // 1. Try finding by data tag (The Clean Way)
    let teamDiv = container.querySelector(`.team[data-name="${teamName}"]`);

    // 2. Fallback: Find by Text Content (The "Backup" Way)
    // If the data tag is missing for any reason, this loop finds the team by reading its name.
    if (!teamDiv) {
        const allTeams = container.querySelectorAll('.team');
        for (let t of allTeams) {
            // We use 'includes' to match "BUF" inside "BUF Buffalo Bills" if needed
            if (t.innerText.includes(teamName)) {
                teamDiv = t;
                console.log(`Fallback used for ${teamName}`); // This will tell us if fallback is needed
                break;
            }
        }
    }

    // 3. Apply Style (The "Nuclear Option")
    if (teamDiv) {
        // Add the class for standard CSS handling
        teamDiv.classList.add('selected');

        // MANUALLY Force the colors (Bypasses any CSS conflicts)
        teamDiv.style.setProperty('background-color', '#ffffff', 'important');
        teamDiv.style.setProperty('border-color', '#ffffff', 'important');
        teamDiv.style.setProperty('opacity', '1', 'important');

        // Force the text to be black so it's readable on white
        const nameSpan = teamDiv.querySelector('.name');
        if (nameSpan) {
            nameSpan.style.setProperty('color', '#000000', 'important');
            nameSpan.style.setProperty('font-weight', '800', 'important');
        }
    } else {
        console.error(`Could not find element for team: ${teamName} in ${round}`);
    }
}

function resetBracket() {
    if (!confirm("Clear picks?")) return;
    picks = { afc: { wcWinners: [], divWinners: [], champion: null }, nfc: { wcWinners: [], divWinners: [], champion: null }, superBowlWinner: null };
    document.getElementById('champion-display').innerHTML = '';
    refreshAllRounds();
}

// --- SAVE / LOAD / GRADING ---

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
                // 1. Load Data
                picks = data.picks;
                document.getElementById('username').value = data.name;

                // 2. Refresh UI
                refreshAllRounds();
                restoreUIFromPicks();
                if (msg) msg.innerText = "Loaded!";

                // 3. Trigger Grading (SAFE MODE)
                try {
                    if (data.masterPicks) {
                        gradeBracket(data.masterPicks);
                    }
                } catch (err) {
                    console.log("Grading skipped (Master Key incomplete or empty)");
                }
            } else {
                alert("Not found.");
                if (msg) msg.innerText = "Not found.";
            }
        });
}

function gradeBracket(master) {
    // 1. Identify who has ACTUALLY lost (The "Kill List")
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

    // 2. Loop through User Picks and Grade
    ['afc', 'nfc'].forEach(conf => {
        // WC Grading
        picks[conf].wcWinners.forEach((uPick, i) => {
            if (!uPick) return;
            const uiElement = findTeamElement(conf, 'wc', i, uPick.name);

            if (master[conf] && master[conf].wcWinners && master[conf].wcWinners[i]) {
                const mPick = master[conf].wcWinners[i];
                if (uPick.name === mPick.name) uiElement.classList.add('correct');
                else uiElement.classList.add('incorrect');
            }
        });

        // Div Grading
        picks[conf].divWinners.forEach((uPick, i) => {
            if (!uPick) return;
            const uiElement = findTeamElement(conf, 'div', i, uPick.name);

            if (deadTeams.has(uPick.name)) {
                uiElement.classList.add('eliminated');
            } else if (master[conf] && master[conf].divWinners) {
                if (master[conf].divWinners[i] && master[conf].divWinners[i].name === uPick.name) {
                    uiElement.classList.add('correct');
                } else if (master[conf].divWinners[i]) {
                    uiElement.classList.add('incorrect');
                }
            }
        });

        // Champ Grading
        if (picks[conf].champion) {
            const uPick = picks[conf].champion;
            const uiElement = findTeamElement(conf, 'champ', 0, uPick.name);
            if (deadTeams.has(uPick.name)) uiElement.classList.add('eliminated');
            else if (master[conf] && master[conf].champion) {
                if (master[conf].champion.name === uPick.name) uiElement.classList.add('correct');
                else uiElement.classList.add('incorrect');
            }
        }
    });

    // SB Grading
    if (picks.superBowlWinner) {
        const uiElement = document.querySelector('#super-bowl-matchup .team.selected');
        if (uiElement) {
            if (deadTeams.has(picks.superBowlWinner)) uiElement.classList.add('eliminated');
            else if (master.superBowlWinner) {
                if (master.superBowlWinner === picks.superBowlWinner) uiElement.classList.add('correct');
                else uiElement.classList.add('incorrect');
            }
        }
    }
}