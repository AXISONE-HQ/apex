#!/usr/bin/env node
import 'node:process';

const API_BASE = process.env.API_BASE_URL || 'https://apex-staging-api-g6dsonn6nq-uc.a.run.app';
const ADMIN_ID_TOKEN = process.env.ADMIN_ID_TOKEN || 'test:director.staging@axisone.ca';
const ORG_ID = process.env.ORG_ID || '32a6caf1-a200-408e-9a1f-4a56e7827d77';
const TEAM_NAME = 'U15 Boys Team A';

const roster = [
  { first: 'Liam', last: 'Parker' },
  { first: 'Ethan', last: 'Morales' },
  { first: 'Noah', last: 'Sinclair' },
  { first: 'Oliver', last: 'Bennett' },
  { first: 'Mason', last: 'Duarte' },
  { first: 'Lucas', last: 'Ibrahim' },
  { first: 'Caleb', last: "O'Connor" },
  { first: 'Aiden', last: 'Petrov' },
  { first: 'Julian', last: 'Mendes' },
  { first: 'Xavier', last: 'Dupont' },
  { first: 'Finley', last: 'Harrington' },
  { first: 'Mateo', last: 'Solano' },
  { first: 'Declan', last: 'Rhodes' },
  { first: 'Carter', last: 'Levesque' },
  { first: 'Sebastian', last: 'Almeida' },
];

function buildKey(first, last) {
  return `${first}`.trim().toLowerCase() + '|' + `${last}`.trim().toLowerCase();
}

async function login() {
  const res = await fetch(`${API_BASE}/auth/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: ADMIN_ID_TOKEN }),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  const setCookie = res.headers.get('set-cookie');
  const match = setCookie?.match(/apex_session=([^;]+)/);
  if (!match) throw new Error('Missing session cookie');
  const data = await res.json();
  return { cookie: `apex_session=${match[1]}`, user: data.user };
}

async function apiFetch(path, { method = 'GET', body, cookie } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch (err) {
    throw new Error(`Invalid JSON from ${path}: ${text}`);
  }
  if (!res.ok) {
    const msg = json?.error || json?.message || res.statusText;
    throw new Error(`Request failed ${res.status} ${path}: ${msg}`);
  }
  return json;
}

async function fetchTeams(cookie) {
  const { items } = await apiFetch(`/admin/clubs/${ORG_ID}/teams?includeArchived=true`, { cookie });
  return items;
}

async function fetchPlayers(cookie, status = 'all') {
  const query = new URLSearchParams();
  query.set('status', status);
  const { items } = await apiFetch(`/admin/clubs/${ORG_ID}/players?${query.toString()}`, { cookie });
  return items;
}

async function assignPlayerToTeam(cookie, playerId, teamId) {
  await apiFetch(`/admin/clubs/${ORG_ID}/players/${playerId}/team`, {
    method: 'POST',
    body: { team_id: teamId },
    cookie,
  });
}

async function archiveTeam(cookie, teamId) {
  await apiFetch(`/admin/clubs/${ORG_ID}/teams/${teamId}`, {
    method: 'PATCH',
    body: { is_archived: true },
    cookie,
  });
}

async function deactivatePlayer(cookie, playerId, note) {
  const patch = { status: 'inactive', notes: note };
  await apiFetch(`/admin/clubs/${ORG_ID}/players/${playerId}`, {
    method: 'PATCH',
    body: patch,
    cookie,
  });
}

async function clearPlayerTeam(cookie, playerId) {
  await apiFetch(`/admin/clubs/${ORG_ID}/players/${playerId}/team`, {
    method: 'DELETE',
    cookie,
  });
}

async function runWithConcurrency(items, limit, handler) {
  const queue = [...items];
  const workers = Array.from({ length: limit }).map(async () => {
    while (queue.length) {
      const item = queue.shift();
      await handler(item);
    }
  });
  await Promise.all(workers);
}

async function main() {
  const { cookie, user } = await login();
  console.log(`Authenticated as ${user?.email}`);

  const [teams, players] = await Promise.all([
    fetchTeams(cookie),
    fetchPlayers(cookie, 'all'),
  ]);

  const team = teams.find((t) => t.name === TEAM_NAME);
  if (!team) throw new Error(`Team ${TEAM_NAME} not found`);

  const playerMap = new Map(players.map((p) => [buildKey(p.first_name, p.last_name), p]));

  let reassigned = 0;
  for (const target of roster) {
    const player = playerMap.get(buildKey(target.first, target.last));
    if (!player) {
      console.warn(`Missing player ${target.first} ${target.last}`);
      continue;
    }
    if (String(player.team_id || '') !== String(team.id)) {
      await assignPlayerToTeam(cookie, player.id, team.id);
      reassigned += 1;
    }
  }

  const loadTeams = teams.filter((t) => typeof t.name === 'string' && t.name.startsWith('Load') && !t.is_archived);
  let archivedTeams = 0;
  await runWithConcurrency(loadTeams, 10, async (t) => {
    await archiveTeam(cookie, t.id);
    archivedTeams += 1;
  });

  const loadPlayers = players.filter((p) => typeof p.first_name === 'string' && p.first_name.startsWith('Load'));
  let playersDeactivated = 0;
  let teamsCleared = 0;
  const note = 'Deactivated seeded load data — 2026-03-11 cleanup';
  await runWithConcurrency(loadPlayers, 15, async (player) => {
    if (player.status !== 'inactive' || player.notes !== note) {
      await deactivatePlayer(cookie, player.id, note);
      playersDeactivated += 1;
    }
    if (player.team_id) {
      await clearPlayerTeam(cookie, player.id);
      teamsCleared += 1;
    }
  });

  const summary = {
    reassignedPlayers: reassigned,
    archivedTeams,
    loadPlayersProcessed: loadPlayers.length,
    loadPlayersDeactivated: playersDeactivated,
    loadPlayersClearedFromTeams: teamsCleared,
  };
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
