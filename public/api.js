// All API calls go through here. Every function returns parsed JSON or throws.
// The base URL works both locally (firebase emulators) and on the live site.

const BASE = "/api";  // Netlify redirects /api/* → /.netlify/functions/api/*

async function apiFetch(path) {
  const res = await fetch(BASE + path);
  if (!res.ok) throw new Error(`API error ${res.status} on ${path}`);
  return res.json();
}

// ── Scores ────────────────────────────────────────────────────────────────────
async function fetchScores() {
  return apiFetch("/scores");
}

// ── Standings ─────────────────────────────────────────────────────────────────
async function fetchStandings() {
  return apiFetch("/standings");
}

// ── Player search ──────────────────────────────────────────────────────────────
async function searchPlayers(query) {
  return apiFetch(`/players?q=${encodeURIComponent(query)}`);
}

// ── Player detail + stats ──────────────────────────────────────────────────────
async function fetchPlayerStats(playerId) {
  const [info, stats] = await Promise.all([
    apiFetch(`/player/${playerId}`),
    apiFetch(`/player/${playerId}/stats`)
  ]);
  return { info, stats };
}

// ── Parse ESPN scoreboard into simple game objects ─────────────────────────────
function parseScores(espnData) {
  if (!espnData?.events) return null;
  return espnData.events.map(event => {
    const comp   = event.competitions?.[0];
    const home   = comp?.competitors?.find(c => c.homeAway === "home");
    const away   = comp?.competitors?.find(c => c.homeAway === "away");
    const status = event.status?.type;
    return {
      id:        event.id,
      title:     event.name,
      date:      new Date(event.date).toLocaleDateString("en-CA", { month: "short", day: "numeric" }),
      status:    status?.description ?? "Unknown",
      isLive:    status?.state === "in",
      isFinal:   status?.completed === true,
      home:      home?.team?.abbreviation ?? "?",
      away:      away?.team?.abbreviation ?? "?",
      homeScore: parseInt(home?.score ?? 0),
      awayScore: parseInt(away?.score ?? 0),
      clock:     event.status?.displayClock ?? "",
      period:    event.status?.period ?? 0,
    };
  });
}

// ── Parse ESPN standings into simple team objects ──────────────────────────────
function parseStandings(espnData) {
  if (!espnData?.children) return null;
  const teams = [];
  espnData.children.forEach(conf => {
    conf.children?.forEach(div => {
      div.standings?.entries?.forEach(entry => {
        const stats = {};
        entry.stats?.forEach(s => { stats[s.name] = s.value; });
        teams.push({
          team:     entry.team?.displayName ?? "Unknown",
          abbr:     entry.team?.abbreviation ?? "?",
          conf:     conf.name?.includes("American") ? "AFC" : "NFC",
          div:      div.name ?? "",
          w:        stats.wins ?? 0,
          l:        stats.losses ?? 0,
          pct:      stats.winPercent ?? 0,
          clinched: entry.team?.clincher ?? "none",
        });
      });
    });
  });
  return teams.length ? teams : null;
}

// ── Parse ESPN player search results ──────────────────────────────────────────
function parsePlayerSearch(espnData) {
  if (!espnData?.items) return [];
  return espnData.items
    .filter(item => item.type === "athlete")
    .map(item => ({
      id:       item.id,
      name:     item.displayName ?? item.description,
      team:     item.teamName ?? "",
      position: item.position ?? "",
      headshot: item.headshot?.href ?? null,
    }));
}

// ── Parse ESPN player stats into display-ready sections ───────────────────────
function parsePlayerStats(info, statsData) {
  const athlete = info.athlete ?? info;
  const result = {
    id:       athlete.id,
    name:     athlete.displayName ?? athlete.fullName ?? "Unknown",
    position: athlete.position?.abbreviation ?? "",
    team:     athlete.team?.displayName ?? "",
    teamAbbr: athlete.team?.abbreviation ?? "",
    headshot: athlete.headshot?.href ?? null,
    jersey:   athlete.jersey ?? "",
    experience: athlete.experience?.years ?? 0,
    college:  athlete.college?.name ?? "",
    height:   athlete.displayHeight ?? "",
    weight:   athlete.displayWeight ?? "",
    birthPlace: athlete.birthPlace
      ? `${athlete.birthPlace.city ?? ""}, ${athlete.birthPlace.state ?? ""}`.replace(/^, |, $/, "")
      : "",
    statCategories: []
  };

  const splits = statsData?.statistics?.splits ?? statsData?.splits;
  if (splits) {
    splits.categories?.forEach(cat => {
      const statLines = cat.stats?.map(s => ({
        label: s.displayName ?? s.name,
        value: s.displayValue ?? String(s.value ?? "--")
      })) ?? [];
      if (statLines.length) {
        result.statCategories.push({ name: cat.displayName ?? cat.name, stats: statLines });
      }
    });
  }

  return result;
}
