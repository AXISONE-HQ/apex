#!/usr/bin/env node
import 'node:process';

const API_BASE = process.env.API_BASE_URL || 'https://apex-staging-api-g6dsonn6nq-uc.a.run.app';
const ADMIN_ID_TOKEN = process.env.ADMIN_ID_TOKEN || 'test:director.staging@axisone.ca';
const ORG_ID = process.env.ORG_ID || '32a6caf1-a200-408e-9a1f-4a56e7827d77';
const TEAM_NAME = 'U15 Boys Team A';

const roster = [
  {
    first: 'Liam',
    last: 'Parker',
    display: 'Liam Parker',
    position: 'GK',
    jersey: 1,
    birthYear: 2011,
    guardians: [
      { first: 'Emma', last: 'Parker', relationship: 'Mother', email: 'emma.parker+u15a@axisone.family', phone: '416-555-1101' },
      { first: 'David', last: 'Parker', relationship: 'Father', email: 'david.parker+u15a@axisone.family', phone: '416-555-1102' },
    ],
  },
  {
    first: 'Ethan',
    last: 'Morales',
    display: 'Ethan Morales',
    position: 'RB',
    jersey: 2,
    birthYear: 2011,
    guardians: [
      { first: 'Sofia', last: 'Morales', relationship: 'Mother', email: 'sofia.morales+u15a@axisone.family', phone: '416-555-1103' },
      { first: 'Gabriel', last: 'Morales', relationship: 'Father', email: 'gabriel.morales+u15a@axisone.family', phone: '416-555-1104' },
    ],
  },
  {
    first: 'Noah',
    last: 'Sinclair',
    display: 'Noah Sinclair',
    position: 'CB',
    jersey: 3,
    birthYear: 2010,
    guardians: [
      { first: 'Katherine', last: 'Sinclair', relationship: 'Mother', email: 'katherine.sinclair+u15a@axisone.family', phone: '416-555-1105' },
      { first: 'Mark', last: 'Sinclair', relationship: 'Father', email: 'mark.sinclair+u15a@axisone.family', phone: '416-555-1106' },
    ],
  },
  {
    first: 'Oliver',
    last: 'Bennett',
    display: 'Oliver Bennett',
    position: 'CB',
    jersey: 4,
    birthYear: 2011,
    guardians: [
      { first: 'Rachel', last: 'Bennett', relationship: 'Mother', email: 'rachel.bennett+u15a@axisone.family', phone: '416-555-1107' },
      { first: 'Simon', last: 'Bennett', relationship: 'Father', email: 'simon.bennett+u15a@axisone.family', phone: '416-555-1108' },
    ],
  },
  {
    first: 'Mason',
    last: 'Duarte',
    display: 'Mason Duarte',
    position: 'LB',
    jersey: 5,
    birthYear: 2011,
    guardians: [
      { first: 'Camila', last: 'Duarte', relationship: 'Mother', email: 'camila.duarte+u15a@axisone.family', phone: '416-555-1109' },
      { first: 'Luis', last: 'Duarte', relationship: 'Father', email: 'luis.duarte+u15a@axisone.family', phone: '416-555-1110' },
    ],
  },
  {
    first: 'Lucas',
    last: 'Ibrahim',
    display: 'Lucas Ibrahim',
    position: 'CDM',
    jersey: 6,
    birthYear: 2011,
    guardians: [
      { first: 'Amira', last: 'Ibrahim', relationship: 'Mother', email: 'amira.ibrahim+u15a@axisone.family', phone: '416-555-1111' },
      { first: 'Kareem', last: 'Ibrahim', relationship: 'Father', email: 'kareem.ibrahim+u15a@axisone.family', phone: '416-555-1112' },
    ],
  },
  {
    first: 'Caleb',
    last: "O'Connor",
    display: "Caleb O'Connor",
    position: 'CM',
    jersey: 8,
    birthYear: 2010,
    guardians: [
      { first: 'Megan', last: "O'Connor", relationship: 'Mother', email: 'megan.oconnor+u15a@axisone.family', phone: '416-555-1113' },
      { first: 'Patrick', last: "O'Connor", relationship: 'Father', email: 'patrick.oconnor+u15a@axisone.family', phone: '416-555-1114' },
    ],
  },
  {
    first: 'Aiden',
    last: 'Petrov',
    display: 'Aiden Petrov',
    position: 'CM',
    jersey: 10,
    birthYear: 2011,
    guardians: [
      { first: 'Elena', last: 'Petrov', relationship: 'Mother', email: 'elena.petrov+u15a@axisone.family', phone: '416-555-1115' },
      { first: 'Viktor', last: 'Petrov', relationship: 'Father', email: 'viktor.petrov+u15a@axisone.family', phone: '416-555-1116' },
    ],
  },
  {
    first: 'Julian',
    last: 'Mendes',
    display: 'Julian Mendes',
    position: 'RW',
    jersey: 7,
    birthYear: 2011,
    guardians: [
      { first: 'Daniela', last: 'Mendes', relationship: 'Mother', email: 'daniela.mendes+u15a@axisone.family', phone: '416-555-1117' },
      { first: 'Sergio', last: 'Mendes', relationship: 'Father', email: 'sergio.mendes+u15a@axisone.family', phone: '416-555-1118' },
    ],
  },
  {
    first: 'Xavier',
    last: 'Dupont',
    display: 'Xavier Dupont',
    position: 'LW',
    jersey: 11,
    birthYear: 2011,
    guardians: [
      { first: 'Sandrine', last: 'Dupont', relationship: 'Mother', email: 'sandrine.dupont+u15a@axisone.family', phone: '416-555-1119' },
      { first: 'Luc', last: 'Dupont', relationship: 'Father', email: 'luc.dupont+u15a@axisone.family', phone: '416-555-1120' },
    ],
  },
  {
    first: 'Finley',
    last: 'Harrington',
    display: 'Finley Harrington',
    position: 'ST',
    jersey: 9,
    birthYear: 2011,
    guardians: [
      { first: 'Allison', last: 'Harrington', relationship: 'Mother', email: 'allison.harrington+u15a@axisone.family', phone: '416-555-1121' },
      { first: 'Bradley', last: 'Harrington', relationship: 'Father', email: 'bradley.harrington+u15a@axisone.family', phone: '416-555-1122' },
    ],
  },
  {
    first: 'Mateo',
    last: 'Solano',
    display: 'Mateo Solano',
    position: 'ST',
    jersey: 14,
    birthYear: 2011,
    guardians: [
      { first: 'Valeria', last: 'Solano', relationship: 'Mother', email: 'valeria.solano+u15a@axisone.family', phone: '416-555-1123' },
      { first: 'Diego', last: 'Solano', relationship: 'Father', email: 'diego.solano+u15a@axisone.family', phone: '416-555-1124' },
    ],
  },
  {
    first: 'Declan',
    last: 'Rhodes',
    display: 'Declan Rhodes',
    position: 'CB',
    jersey: 15,
    birthYear: 2010,
    guardians: [
      { first: 'Michelle', last: 'Rhodes', relationship: 'Mother', email: 'michelle.rhodes+u15a@axisone.family', phone: '416-555-1125' },
      { first: 'Steven', last: 'Rhodes', relationship: 'Father', email: 'steven.rhodes+u15a@axisone.family', phone: '416-555-1126' },
    ],
  },
  {
    first: 'Carter',
    last: 'Levesque',
    display: 'Carter Levesque',
    position: 'CAM',
    jersey: 12,
    birthYear: 2011,
    guardians: [
      { first: 'Renee', last: 'Levesque', relationship: 'Mother', email: 'renee.levesque+u15a@axisone.family', phone: '416-555-1127' },
      { first: 'Marc', last: 'Levesque', relationship: 'Father', email: 'marc.levesque+u15a@axisone.family', phone: '416-555-1128' },
    ],
  },
  {
    first: 'Sebastian',
    last: 'Almeida',
    display: 'Sebastian Almeida',
    position: 'Winger',
    jersey: 13,
    birthYear: 2011,
    guardians: [
      { first: 'Teresa', last: 'Almeida', relationship: 'Mother', email: 'teresa.almeida+u15a@axisone.family', phone: '416-555-1129' },
      { first: 'Paulo', last: 'Almeida', relationship: 'Father', email: 'paulo.almeida+u15a@axisone.family', phone: '416-555-1130' },
    ],
  },
];

const coachInvites = [
  { first: 'Marcus', last: 'Reid', email: 'marcus.reid@northlakesc.ca', coach_type: 'head' },
  { first: 'Derek', last: 'Lopez', email: 'derek.lopez@northlakesc.ca', coach_type: 'assistant' },
  { first: 'Andre', last: 'Nguyen', email: 'andre.nguyen@northlakesc.ca', coach_type: 'assistant' },
];

async function login() {
  const res = await fetch(`${API_BASE}/auth/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: ADMIN_ID_TOKEN }),
  });
  if (!res.ok) {
    throw new Error(`Login failed: ${res.status}`);
  }
  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) throw new Error('Missing auth cookie');
  const match = setCookie.match(/apex_session=([^;]+)/);
  if (!match) throw new Error('Unable to parse session cookie');
  const data = await res.json();
  return { cookie: `apex_session=${match[1]}`, sessionUser: data.user };
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
    throw new Error(`Invalid JSON for ${path}: ${text}`);
  }
  if (!res.ok) {
    const msg = json?.error || json?.message || res.statusText;
    throw new Error(`Request failed ${res.status} ${path}: ${msg}`);
  }
  return json;
}

async function ensureTeam(cookie) {
  const { items } = await apiFetch(`/admin/clubs/${ORG_ID}/teams`, { cookie });
  let team = items.find((t) => t.name === TEAM_NAME);
  if (!team) {
    const payload = {
      name: TEAM_NAME,
      season_year: 2026,
      season_label: '2026 Outdoor',
      sport: 'soccer',
      team_level: 'Regional Premier',
      competition_level: 'Regional Premier',
      age_category: 'U15 Boys',
      training_frequency_per_week: 3,
      default_training_duration_min: 90,
      home_venue: {
        name: 'AxisOne Training Center',
        address_line1: '55 Progress Ave',
        city: 'Scarborough',
        state_province: 'ON',
        country: 'Canada',
      },
    };
    const { item } = await apiFetch(`/admin/clubs/${ORG_ID}/teams`, {
      method: 'POST',
      body: payload,
      cookie,
    });
    team = item;
  } else {
    const patch = {
      season_year: 2026,
      season_label: '2026 Outdoor',
      sport: 'soccer',
      team_level: 'Regional Premier',
      competition_level: 'Regional Premier',
      age_category: 'U15 Boys',
      training_frequency_per_week: 3,
      default_training_duration_min: 90,
      home_venue: team.home_venue ?? {
        name: 'AxisOne Training Center',
        city: 'Scarborough',
        state_province: 'ON',
        country: 'Canada',
      },
    };
    await apiFetch(`/admin/clubs/${ORG_ID}/teams/${team.id}`, { method: 'PATCH', body: patch, cookie });
    team = { ...team, ...patch };
  }
  return team;
}

function buildPlayerKey(first, last) {
  return `${first}`.trim().toLowerCase() + '|' + `${last}`.trim().toLowerCase();
}

async function loadExistingPlayers(cookie) {
  const res = await apiFetch(`/admin/clubs/${ORG_ID}/players`, { cookie });
  const players = res.items || res.players || [];
  const map = new Map();
  for (const p of players) {
    map.set(buildPlayerKey(p.first_name, p.last_name), p);
  }
  return map;
}

async function loadExistingGuardians(cookie) {
  const { guardians } = await apiFetch(`/admin/clubs/${ORG_ID}/guardians`, { cookie });
  const map = new Map();
  for (const g of guardians) {
    if (g.email) {
      map.set(String(g.email).toLowerCase(), g);
    }
  }
  return map;
}

async function createPlayer(cookie, spec, teamId) {
  const payload = {
    first_name: spec.first,
    last_name: spec.last,
    display_name: spec.display,
    team_id: teamId,
    jersey_number: spec.jersey,
    birth_year: spec.birthYear,
    position: spec.position,
    status: 'active',
    notes: 'Seeded via OpenClaw import 2026-03-11',
  };
  const { item } = await apiFetch(`/admin/clubs/${ORG_ID}/players`, {
    method: 'POST',
    body: payload,
    cookie,
  });
  return item;
}

async function createGuardian(cookie, guardian) {
  const payload = {
    first_name: guardian.first,
    last_name: guardian.last,
    display_name: `${guardian.first} ${guardian.last}`,
    email: guardian.email,
    phone: guardian.phone,
    relationship: guardian.relationship,
    status: 'active',
  };
  const { guardian: created } = await apiFetch(`/admin/clubs/${ORG_ID}/guardians`, {
    method: 'POST',
    body: payload,
    cookie,
  });
  return created;
}

async function linkGuardian(cookie, playerId, guardianId) {
  await apiFetch(`/admin/clubs/${ORG_ID}/players/${playerId}/guardians`, {
    method: 'POST',
    body: { guardian_id: guardianId },
    cookie,
  });
}

async function listPlayerGuardians(cookie, playerId) {
  const { guardians } = await apiFetch(`/admin/clubs/${ORG_ID}/players/${playerId}/guardians`, {
    cookie,
  });
  return guardians;
}

async function inviteCoach(cookie, teamId, spec) {
  const body = {
    email: spec.email,
    coach_type: spec.coach_type,
    team_ids: [teamId],
  };
  const res = await apiFetch(`/admin/clubs/${ORG_ID}/coaches/invite`, {
    method: 'POST',
    body,
    cookie,
  });
  return res;
}

async function main() {
  const { cookie, sessionUser } = await login();
  console.log(`Authenticated as ${sessionUser?.email}`);

  const team = await ensureTeam(cookie);
  console.log(`Using team: ${team.name} (${team.id})`);

  const existingPlayers = await loadExistingPlayers(cookie);
  const existingGuardians = await loadExistingGuardians(cookie);

  const createdPlayers = [];
  const reusedPlayers = [];
  const guardianRecords = new Map(existingGuardians);
  const guardianCreations = [];
  const guardianLinks = [];

  for (const spec of roster) {
    const key = buildPlayerKey(spec.first, spec.last);
    let player = existingPlayers.get(key);
    if (!player) {
      player = await createPlayer(cookie, spec, team.id);
      createdPlayers.push({ id: player.id, name: `${player.first_name} ${player.last_name}` });
      existingPlayers.set(key, player);
    } else {
      reusedPlayers.push({ id: player.id, name: `${player.first_name} ${player.last_name}` });
    }

    const linkedGuardians = await listPlayerGuardians(cookie, player.id);
    const linkedIds = new Set(linkedGuardians.map((g) => g.id));

    for (const gSpec of spec.guardians) {
      const emailKey = gSpec.email.toLowerCase();
      let guardian = guardianRecords.get(emailKey);
      if (!guardian) {
        guardian = await createGuardian(cookie, gSpec);
        guardianRecords.set(emailKey, guardian);
        guardianCreations.push({ id: guardian.id, email: guardian.email });
      }
      if (!linkedIds.has(guardian.id)) {
        await linkGuardian(cookie, player.id, guardian.id);
        guardianLinks.push({ playerId: player.id, guardianId: guardian.id });
        linkedIds.add(guardian.id);
      }
    }
  }

  const coachInviteResults = [];
  for (const coach of coachInvites) {
    const result = await inviteCoach(cookie, team.id, coach);
    coachInviteResults.push({ email: coach.email, coach_type: coach.coach_type, inviteId: result.inviteId });
  }

  const summary = {
    team: { id: team.id, name: team.name },
    createdPlayers,
    reusedPlayers,
    guardianCreations,
    guardianLinks: guardianLinks.length,
    coachInvites: coachInviteResults,
  };

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
