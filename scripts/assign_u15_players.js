#!/usr/bin/env node
import 'node:process';

const API_BASE = process.env.API_BASE_URL || 'https://apex-staging-api-g6dsonn6nq-uc.a.run.app';
const ADMIN_ID_TOKEN = process.env.ADMIN_ID_TOKEN || 'test:director.staging@axisone.ca';
const ORG_ID = process.env.ORG_ID || '32a6caf1-a200-408e-9a1f-4a56e7827d77';
const TEAM_ID = process.env.TEAM_ID || '9780c909-2381-4a8c-81bb-ec12db1105b7';

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

const buildKey = (f, l) => `${f}`.trim().toLowerCase() + '|' + `${l}`.trim().toLowerCase();

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

async function api(path, { method = 'GET', body, cookie } = {}) {
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

async function fetchPlayers(cookie) {
  const { items } = await api(`/admin/clubs/${ORG_ID}/players?status=all`, { cookie });
  return items || [];
}

async function assign(cookie, playerId) {
  await api(`/admin/clubs/${ORG_ID}/players/${playerId}/team`, {
    method: 'POST',
    body: { team_id: TEAM_ID },
    cookie,
  });
}

async function main() {
  const { cookie } = await login();
  const players = await fetchPlayers(cookie);
  const map = new Map(players.map((p) => [buildKey(p.first_name, p.last_name), p]));
  let updated = 0;
  for (const spec of roster) {
    const player = map.get(buildKey(spec.first, spec.last));
    if (!player) {
      console.warn(`Missing player ${spec.first} ${spec.last}`);
      continue;
    }
    if (String(player.team_id || '') !== TEAM_ID) {
      await assign(cookie, player.id);
      updated += 1;
    }
  }
  console.log(JSON.stringify({ reassigned: updated }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
