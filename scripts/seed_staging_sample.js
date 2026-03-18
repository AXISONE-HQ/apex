#!/usr/bin/env node
import 'node:process';

/**
 * Seed three showcase teams (plus named players) on staging.
 *
 * Usage:
 *   HEAD_COACH_IDS="uuid1,uuid2,uuid3" \
 *   API_BASE_URL="https://apex-staging-api-g6dsonn6nq-uc.a.run.app" \
 *   ADMIN_ID_TOKEN="test:director.staging@axisone.ca" \
 *   node scripts/seed_staging_sample.js
 *
 * HEAD_COACH_IDS is optional; when omitted, teams remain unassigned.
 */

const API_BASE = process.env.API_BASE_URL || 'https://apex-staging-api-g6dsonn6nq-uc.a.run.app';
const ADMIN_ID_TOKEN = process.env.ADMIN_ID_TOKEN || 'test:director.staging@axisone.ca';
const ORG_ID = process.env.ORG_ID || '32a6caf1-a200-408e-9a1f-4a56e7827d77';
const HEAD_COACH_IDS = (process.env.HEAD_COACH_IDS || '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);

const SAMPLE_TEAMS = [
  {
    name: 'U13 Boys Blue',
    sport: 'basketball',
    teamLevel: 'Regional Premier',
    seasonLabel: '2026 Spring',
    ageCategory: 'U13',
    coachIndex: 0,
    players: ['Alex Parker', 'Noah Singh', 'Leo Vidal', 'Evan Harris', 'Caleb Omari', 'Miles Dupont'],
  },
  {
    name: 'U15 Girls Gold',
    sport: 'basketball',
    teamLevel: 'Elite',
    seasonLabel: '2026 Summer',
    ageCategory: 'U15',
    coachIndex: 1,
    players: ['Maya Boudreau', 'Isla Chen', 'Sofia Mendes', 'Harper Quinn', 'Zoe Laurent'],
  },
  {
    name: 'U17 Elite',
    sport: 'basketball',
    teamLevel: 'National Showcase',
    seasonLabel: '2026 Winter',
    ageCategory: 'U17',
    coachIndex: 2,
    players: ['Jordan Ellis', 'Riley Morgan', 'Parker James', 'Taylor Fox'],
  },
];

async function apiFetch(path, { method = 'GET', body, cookie } = {}) {
  const headers = {
    'content-type': 'application/json',
    ...(cookie ? { cookie } : {}),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
    redirect: 'manual',
  });

  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch (err) {
    throw new Error(`Invalid JSON for ${path}: ${text}`);
  }
  if (!res.ok) {
    const msg = json?.error || json?.message || res.statusText;
    throw new Error(`Request failed ${res.status} ${path}: ${msg}`);
  }
  return { json, headers: res.headers };
}

function extractCookie(headers) {
  if (headers.getSetCookie) {
    const values = headers.getSetCookie();
    if (values?.length) return values[0];
  }
  const direct = headers.get?.('set-cookie');
  if (direct) return direct;
  if (headers.raw) {
    const raw = headers.raw()['set-cookie'];
    if (raw?.length) return raw[0];
  }
  return null;
}

async function loginAsAdmin() {
  const { json, headers } = await apiFetch('/auth/session', {
    method: 'POST',
    body: { idToken: ADMIN_ID_TOKEN },
  });
  const cookie = extractCookie(headers);
  if (!cookie) throw new Error('Admin session cookie missing');
  console.log(`Authenticated as ${json?.user?.email}`);
  return cookie.split(';')[0];
}

async function listTeams(cookie) {
  const { json } = await apiFetch(`/admin/clubs/${ORG_ID}/teams?includeArchived=true`, { cookie });
  return json.items || [];
}

async function listPlayers(cookie) {
  const { json } = await apiFetch(`/admin/clubs/${ORG_ID}/players`, { cookie });
  return json.items || json.players || [];
}

async function ensureTeam(cookie, spec) {
  const existingTeams = await listTeams(cookie);
  const match = existingTeams.find((team) => team.name === spec.name);
  const headCoachId = HEAD_COACH_IDS[spec.coachIndex] || null;

  const payload = {
    name: spec.name,
    season_label: spec.seasonLabel,
    season_year: spec.seasonYear || 2026,
    sport: spec.sport,
    team_level: spec.teamLevel,
    age_category: spec.ageCategory,
    head_coach_user_id: headCoachId,
  };

  if (match) {
    await apiFetch(`/admin/clubs/${ORG_ID}/teams/${match.id}`, { method: 'PATCH', body: payload, cookie });
    console.log(`Updated team ${spec.name}`);
    return match.id;
  }

  const { json } = await apiFetch(`/admin/clubs/${ORG_ID}/teams`, { method: 'POST', body: payload, cookie });
  const teamId = json?.item?.id;
  console.log(`Created team ${spec.name}`);
  return teamId;
}
function splitName(fullName) {
  const parts = fullName.trim().split(/\s+/);
  const firstName = parts.shift() || 'Player';
  const lastName = parts.length ? parts.join(' ') : 'Sample';
  return { firstName, lastName };
}

function playerKey(first, last) {
  return `${String(first || '').toLowerCase()}|${String(last || '').toLowerCase()}`;
}

async function ensurePlayers(cookie, teamId, names = []) {
  if (!names.length) return;
  const existing = await listPlayers(cookie);
  const lookup = new Map(existing.map((player) => [playerKey(player.first_name, player.last_name), player]));

  for (const fullName of names) {
    const { firstName, lastName } = splitName(fullName);
    const key = playerKey(firstName, lastName);
    const match = lookup.get(key);

    if (!match) {
      await apiFetch(`/admin/clubs/${ORG_ID}/players`, {
        method: 'POST',
        body: {
          first_name: firstName,
          last_name: lastName,
          team_id: teamId,
        },
        cookie,
      });
      console.log(`  Created player ${fullName}`);
      continue;
    }

    if (match.team_id !== teamId) {
      await apiFetch(`/admin/clubs/${ORG_ID}/players/${match.id}`, {
        method: 'PATCH',
        body: { team_id: teamId },
        cookie,
      });
      console.log(`  Reassigned player ${fullName}`);
    } else {
      console.log(`  Player ${fullName} already linked`);
    }
  }
}

async function main() {
  try {
    const cookie = await loginAsAdmin();
    const summary = [];
    for (const spec of SAMPLE_TEAMS) {
      if (!HEAD_COACH_IDS[spec.coachIndex]) {
        console.warn(`No head coach ID provided for ${spec.name}.`);
      }
      const teamId = await ensureTeam(cookie, spec);
      if (teamId) {
        await ensurePlayers(cookie, teamId, spec.players);
        summary.push({ name: spec.name, teamId });
      }
    }
    console.table(summary);
    console.log('Seed complete.');
  } catch (err) {
    console.error(err.message || err);
    process.exit(1);
  }
}

main();
