// ── Tab switching ──────────────────────────────────────────────────────────────
function initTabs() {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.tab;
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(target).classList.add("active");
    });
  });
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function winnerOf(game) {
  return game.homeScore > game.awayScore ? "home" : "away";
}

function pct(val) {
  return Number(val).toFixed(3).replace(/^0/, "");
}

function setHTML(id, html) {
  document.getElementById(id).innerHTML = html;
}

function loading(id, msg = "Loading...") {
  setHTML(id, `<p class="loading-msg">${msg}</p>`);
}

function errorMsg(id, msg) {
  setHTML(id, `<p class="error-msg">${msg}</p>`);
}

// ── Scores tab ─────────────────────────────────────────────────────────────────
async function initScores() {
  loading("scores-content", "Fetching live scores...");
  try {
    const raw    = await fetchScores();
    const games  = parseScores(raw);
    const isLive = games?.some(g => g.isLive);

    if (!games || games.length === 0) {
      renderFallbackScores();
      return;
    }

    const live    = games.filter(g => g.isLive);
    const final   = games.filter(g => g.isFinal);
    const upcoming = games.filter(g => !g.isLive && !g.isFinal);

    let html = buildSuperBowlBanner();

    if (live.length) {
      html += buildLiveSection(live);
    }
    if (final.length) {
      html += buildGameSection("Final", final, false);
    }
    if (upcoming.length) {
      html += buildGameSection("Upcoming", upcoming, false, true);
    }

    setHTML("scores-content", html);
  } catch (err) {
    console.warn("Live scores failed, using fallback:", err);
    renderFallbackScores();
  }
}

function renderFallbackScores() {
  const playoffs = FALLBACK.games.filter(g => g.round === "Playoffs");
  const regular  = FALLBACK.games.filter(g => g.round === "Regular Season");
  const html =
    `<div class="offseason-note">Offseason — showing 2025-26 season results. Live data returns in September.</div>` +
    buildSuperBowlBanner() +
    buildGameSection("Playoff Results", [...playoffs].reverse(), true) +
    buildGameSection("Regular Season (Week 18)", [...regular].reverse(), false);
  setHTML("scores-content", html);
}

function buildSuperBowlBanner() {
  const sb = FALLBACK.superBowl;
  return `
    <div class="sb-banner">
      <div>
        <div class="sb-label">🏆 Super Bowl LX Champion</div>
        <div class="sb-matchup">
          <span class="sb-winner">${sb.winner}</span>
          <span class="sb-score">${sb.winnerScore}–${sb.loserScore}</span>
          <span class="sb-loser">${sb.loser}</span>
        </div>
      </div>
      <div class="sb-date">${sb.date}</div>
    </div>`;
}

function buildLiveSection(games) {
  const cards = games.map(g => buildLiveCard(g)).join("");
  return `<p class="section-head"><span class="live-dot"></span> Live Now</p><div class="scores-grid">${cards}</div>`;
}

function buildLiveCard(game) {
  return `
    <div class="score-card live-card">
      <div class="game-label">
        <span class="live-badge">LIVE</span>
        <span>${game.clock ? `Q${game.period} · ${game.clock}` : ""}</span>
      </div>
      <div class="team-row">
        <span class="team-abbr">${game.away}</span>
        <span class="team-score">${game.awayScore}</span>
      </div>
      <div class="score-divider"></div>
      <div class="team-row">
        <span class="team-abbr">${game.home}</span>
        <span class="team-score">${game.homeScore}</span>
      </div>
    </div>`;
}

function buildGameSection(label, games, isPlayoff, upcoming = false) {
  const cards = games.map(g => buildScoreCard(g, isPlayoff, upcoming)).join("");
  return `<p class="section-head">${label}</p><div class="scores-grid">${cards}</div>`;
}

function buildScoreCard(game, isPlayoff, upcoming = false) {
  const hw = winnerOf(game) === "home";
  const titleHtml = (game.title || game.round)
    ? `<span class="game-title">${game.title ?? game.round}</span>`
    : "";
  if (upcoming) {
    return `
      <div class="score-card">
        <div class="game-label"><span>${game.date}</span>${titleHtml}</div>
        <div class="team-row"><span class="team-abbr">${game.away}</span><span class="upcoming-time">Away</span></div>
        <div class="score-divider"></div>
        <div class="team-row"><span class="team-abbr">${game.home}</span><span class="upcoming-time">Home</span></div>
      </div>`;
  }
  return `
    <div class="score-card ${isPlayoff ? "playoff" : ""}">
      <div class="game-label"><span>${game.date}</span>${titleHtml}</div>
      <div class="team-row">
        <span class="team-abbr">${game.away}</span>
        <span class="team-score ${hw ? "loser" : "winner"}">${game.awayScore}</span>
      </div>
      <div class="score-divider"></div>
      <div class="team-row">
        <span class="team-abbr">${game.home}</span>
        <span class="team-score ${hw ? "winner" : "loser"}">${game.homeScore}</span>
      </div>
    </div>`;
}

// ── Standings tab ──────────────────────────────────────────────────────────────
async function initStandings() {
  loading("standings-content", "Fetching standings...");
  try {
    const raw   = await fetchStandings();
    const teams = parseStandings(raw);
    renderStandings(teams ?? FALLBACK.standings);
  } catch (err) {
    console.warn("Live standings failed, using fallback:", err);
    renderStandings(FALLBACK.standings);
  }
}

function renderStandings(teams) {
  const afc = buildConferenceTable("AFC", teams);
  const nfc = buildConferenceTable("NFC", teams);
  setHTML("standings-content", `
    <div class="standings-cols">
      <div class="conf-block">${afc}</div>
      <div class="conf-block">${nfc}</div>
    </div>
    <p class="legend">
      <strong class="c-gold">C</strong> Conference ·
      <strong class="c-green">D</strong> Division ·
      <strong class="c-blue">W</strong> Wild Card
    </p>`);
}

function buildConferenceTable(conf, teams) {
  const confTeams = teams.filter(t => t.conf === conf);
  const divOrder  = [...new Set(confTeams.map(t => t.div))];
  let rows = "";
  divOrder.forEach(div => {
    const divTeams = confTeams.filter(t => t.div === div).sort((a, b) => b.w - a.w);
    rows += `<tr class="div-separator"><td colspan="4">${div}</td></tr>`;
    divTeams.forEach(t => {
      rows += `
        <tr>
          <td>${t.team}${clinchBadge(t.clinched)}</td>
          <td>${t.w}</td><td>${t.l}</td>
          <td class="pct">${pct(t.pct)}</td>
        </tr>`;
    });
  });
  return `
    <div class="conf-title ${conf.toLowerCase()}">${conf}</div>
    <table class="standings-table">
      <thead><tr><th>Team</th><th>W</th><th>L</th><th>PCT</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function clinchBadge(status) {
  if (!status || status === "eliminated" || status === "none") return "";
  const map = { conference: ["C", "conference"], division: ["D", "division"], wildcard: ["W", "wildcard"] };
  const [label, cls] = map[status] ?? ["", ""];
  return label ? `<span class="clinched-badge ${cls}">${label}</span>` : "";
}

// ── Playoffs tab ───────────────────────────────────────────────────────────────
function initPlayoffs() {
  const rounds = [
    { label: "Wild Card",  ids: [8, 9, 10, 11, 12, 13] },
    { label: "Divisional", ids: [14, 15, 16, 17] },
    { label: "Conference", ids: [18, 19] },
    { label: "Super Bowl", ids: [20] },
  ];
  const roundsHtml = rounds.map(r => {
    const cards = r.ids.map(id => {
      const g = FALLBACK.games.find(x => x.id === id);
      return buildBracketGame(g);
    }).join("");
    return `
      <div class="bracket-round">
        <div class="round-label">${r.label}</div>
        <div class="round-games">${cards}</div>
      </div>`;
  }).join("");
  setHTML("playoffs-content", `<div class="bracket-wrap"><div class="bracket">${roundsHtml}</div></div>`);
}

function buildBracketGame(game) {
  const hw  = winnerOf(game) === "home";
  const isSB = game.title === "Super Bowl LX";
  return `
    <div class="bracket-game ${isSB ? "sb-game" : ""}">
      ${game.title ? `<div class="b-round-tag">${game.title}</div>` : ""}
      <div class="b-team">
        <span class="b-team-name ${hw ? "loser" : "winner"}">${game.away}</span>
        <span class="b-team-score ${hw ? "loser" : "winner"}">${game.awayScore}</span>
      </div>
      <div class="b-divider"></div>
      <div class="b-team">
        <span class="b-team-name ${hw ? "winner" : "loser"}">${game.home}</span>
        <span class="b-team-score ${hw ? "winner" : "loser'}">${game.homeScore}</span>
      </div>
    </div>`;
}

// ── Players tab ────────────────────────────────────────────────────────────────
const NFL_TEAMS = [
  { name: "Arizona Cardinals",      abbr: "ari", conf: "NFC West" },
  { name: "Atlanta Falcons",        abbr: "atl", conf: "NFC South" },
  { name: "Baltimore Ravens",       abbr: "bal", conf: "AFC North" },
  { name: "Buffalo Bills",          abbr: "buf", conf: "AFC East" },
  { name: "Carolina Panthers",      abbr: "car", conf: "NFC South" },
  { name: "Chicago Bears",          abbr: "chi", conf: "NFC North" },
  { name: "Cincinnati Bengals",     abbr: "cin", conf: "AFC North" },
  { name: "Cleveland Browns",       abbr: "cle", conf: "AFC North" },
  { name: "Dallas Cowboys",         abbr: "dal", conf: "NFC East" },
  { name: "Denver Broncos",         abbr: "den", conf: "AFC West" },
  { name: "Detroit Lions",          abbr: "det", conf: "NFC North" },
  { name: "Green Bay Packers",      abbr: "gb",  conf: "NFC North" },
  { name: "Houston Texans",         abbr: "hou", conf: "AFC South" },
  { name: "Indianapolis Colts",     abbr: "ind", conf: "AFC South" },
  { name: "Jacksonville Jaguars",   abbr: "jac", conf: "AFC South" },
  { name: "Kansas City Chiefs",     abbr: "kc",  conf: "AFC West" },
  { name: "Las Vegas Raiders",      abbr: "lv",  conf: "AFC West" },
  { name: "Los Angeles Chargers",   abbr: "lac", conf: "AFC West" },
  { name: "Los Angeles Rams",       abbr: "lar", conf: "NFC West" },
  { name: "Miami Dolphins",         abbr: "mia", conf: "AFC East" },
  { name: "Minnesota Vikings",      abbr: "min", conf: "NFC North" },
  { name: "New England Patriots",   abbr: "ne",  conf: "AFC East" },
  { name: "New Orleans Saints",     abbr: "no",  conf: "NFC South" },
  { name: "New York Giants",        abbr: "nyg", conf: "NFC East" },
  { name: "New York Jets",          abbr: "nyj", conf: "AFC East" },
  { name: "Philadelphia Eagles",    abbr: "phi", conf: "NFC East" },
  { name: "Pittsburgh Steelers",    abbr: "pit", conf: "AFC North" },
  { name: "San Francisco 49ers",    abbr: "sf",  conf: "NFC West" },
  { name: "Seattle Seahawks",       abbr: "sea", conf: "NFC West" },
  { name: "Tampa Bay Buccaneers",   abbr: "tb",  conf: "NFC South" },
  { name: "Tennessee Titans",       abbr: "ten", conf: "AFC South" },
  { name: "Washington Commanders",  abbr: "wsh", conf: "NFC East" },
];

// Store current roster so we can go back to it
let currentRosterAbbr = null;

function initPlayers() {
  const select = document.getElementById("team-select");
  const btn    = document.getElementById("load-roster-btn");

  const groups = {};
  NFL_TEAMS.forEach(t => {
    if (!groups[t.conf]) groups[t.conf] = [];
    groups[t.conf].push(t);
  });

  Object.keys(groups).sort().forEach(conf => {
    const optgroup = document.createElement("optgroup");
    optgroup.label = conf;
    groups[conf].forEach(t => {
      const opt = document.createElement("option");
      opt.value = t.abbr;
      opt.textContent = t.name;
      optgroup.appendChild(opt);
    });
    select.appendChild(optgroup);
  });

  btn.addEventListener("click", () => {
    if (select.value) loadRoster(select.value);
  });

  select.addEventListener("change", () => {
    if (select.value) loadRoster(select.value);
  });
}

async function loadRoster(abbr) {
  currentRosterAbbr = abbr;
  const teamName = NFL_TEAMS.find(t => t.abbr === abbr)?.name ?? abbr.toUpperCase();
  loading("player-results", `Loading ${teamName} roster...`);
  try {
    const res  = await fetch(`/api/roster/${abbr}`);
    const data = await res.json();
    const athletes = data.athletes ?? [];

    if (!athletes.length) {
      setHTML("player-results", `<p class="muted-msg">No roster data available for ${teamName}.</p>`);
      return;
    }

    const allPlayers = athletes.flatMap(group => group.items ?? []);

    const cards = allPlayers.map(p => {
      const player = {
        name:        p.fullName ?? p.displayName ?? "Unknown",
        position:    p.position?.displayName ?? "",
        posAbbr:     p.position?.abbreviation ?? "",
        jersey:      p.jersey ?? "",
        height:      p.displayHeight ?? "",
        weight:      p.displayWeight ?? "",
        age:         p.age ?? "",
        experience:  p.experience?.years ?? "",
        college:     p.college?.name ?? "",
        headshot:    p.headshot?.href ?? null,
        team:        teamName,
        teamAbbr:    abbr,
      };
      // Encode as base64 to safely pass through onclick
      const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(player))));
      return `
        <div class="player-card" onclick="showPlayerFromRoster('${encoded}')">
          ${player.headshot
            ? `<img class="player-thumb" src="${player.headshot}" alt="${player.name}" onerror="this.style.display='none'">`
            : `<div class="player-thumb-placeholder"></div>`}
          <div class="player-card-info">
            <span class="player-card-name">${player.name}</span>
            <span class="player-card-meta">${[player.posAbbr, player.jersey ? "#" + player.jersey : ""].filter(Boolean).join(" · ")}</span>
          </div>
          <span class="player-card-arrow">›</span>
        </div>`;
    }).join("");

    setHTML("player-results", `
      <p class="section-head">${teamName} — ${allPlayers.length} players</p>
      <div class="player-list">${cards}</div>`);
  } catch (err) {
    errorMsg("player-results", "Could not load roster.");
    console.error(err);
  }
}

function showPlayerFromRoster(encoded) {
  const p = JSON.parse(decodeURIComponent(escape(atob(encoded))));

  const bio = [
    p.posAbbr      && `<span class="bio-tag">${p.posAbbr}</span>`,
    p.position     && `<span class="bio-tag">${p.position}</span>`,
    p.jersey       && `<span class="bio-tag">#${p.jersey}</span>`,
    p.height       && `<span class="bio-tag">${p.height}</span>`,
    p.weight       && `<span class="bio-tag">${p.weight}</span>`,
    p.age          && `<span class="bio-tag">Age ${p.age}</span>`,
    p.experience !== "" && `<span class="bio-tag">${p.experience} yr${p.experience !== 1 ? "s" : ""} exp</span>`,
    p.college      && `<span class="bio-tag">${p.college}</span>`,
  ].filter(Boolean).join("");

  setHTML("player-results", `
    <button class="back-btn" onclick="loadRoster('${p.teamAbbr}')">← Back to ${p.team}</button>
    <div class="player-profile">
      <div class="profile-header">
        ${p.headshot ? `<img class="profile-headshot" src="${p.headshot}" alt="${p.name}" onerror="this.style.display='none'">` : ""}
        <div>
          <h2 class="profile-name">${p.name}</h2>
          <p class="profile-team">${p.team}</p>
          <div class="bio-tags">${bio}</div>
        </div>
      </div>
      <p class="muted-msg" style="margin-top:1rem;">
        Detailed season stats are unavailable during the offseason. Check back in September when the 2026 season starts.
      </p>
    </div>`);
}

// ── Init ───────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  initScores();
  initStandings();
  initPlayoffs();
  initPlayers();
});
