import { hasDatabase, query, getPool } from "./client.js";

const CLUBS = [
  {
    name: "North Flight Basketball Club",
    shortName: "North Flight",
    slug: "north-flight-basketball",
    city: "Toronto",
    state: "Ontario",
    country: "Canada",
    emailDomain: "northflight.example.com",
  },
  {
    name: "Lakefront Elite Basketball",
    shortName: "Lakefront Elite",
    slug: "lakefront-elite-basketball",
    city: "Buffalo",
    state: "New York",
    country: "United States",
    emailDomain: "lakefrontelite.example.com",
  },
];

const TEAM_BLUEPRINTS = [
  {
    ageGroup: "U10",
    code: "u10",
    competitionLevel: "Club",
    venue: "St. James Recreation Centre",
    coaches: [
      { name: "Maya Johnson", emailLocal: "maya.johnson" },
      { name: "Isaiah Bennett", emailLocal: "isaiah.bennett" },
    ],
  },
  {
    ageGroup: "U12",
    code: "u12",
    competitionLevel: "Club",
    venue: "Harbourfront Sport Complex",
    coaches: [
      { name: "Caroline Ortega", emailLocal: "caroline.ortega" },
      { name: "Ethan Wallace", emailLocal: "ethan.wallace" },
    ],
  },
  {
    ageGroup: "U14",
    code: "u14",
    competitionLevel: "Premier",
    venue: "Maple Leaf Fieldhouse",
    coaches: [
      { name: "Marcus Avery", emailLocal: "marcus.avery" },
      { name: "Janelle Rivers", emailLocal: "janelle.rivers" },
      { name: "Corey Patel", emailLocal: "corey.patel" },
    ],
  },
  {
    ageGroup: "U16",
    code: "u16",
    competitionLevel: "Premier",
    venue: "Civic Centre Court A",
    coaches: [
      { name: "Simone Clarke", emailLocal: "simone.clarke" },
      { name: "Andre Whitaker", emailLocal: "andre.whitaker" },
      { name: "Devon Holt", emailLocal: "devon.holt" },
    ],
  },
  {
    ageGroup: "U18",
    code: "u18",
    competitionLevel: "Travel",
    venue: "Kingsway Pavilion",
    coaches: [
      { name: "Hannah Pierce", emailLocal: "hannah.pierce" },
      { name: "Lawrence Morrow", emailLocal: "lawrence.morrow" },
    ],
  },
];

const SEASONS = [
  { label: "Fall 2025", year: 2025, status: "active", start: { month: 9, day: 5 }, end: { month: 11, day: 30 } },
  { label: "Winter 2026", year: 2026, status: "draft", start: { month: 1, day: 8 }, end: { month: 3, day: 15 } },
  { label: "Spring 2026", year: 2026, status: "draft", start: { month: 4, day: 3 }, end: { month: 6, day: 9 } },
];

const PLAYER_FIRST_NAMES = [
  "Ava",
  "Liam",
  "Noah",
  "Maya",
  "Elias",
  "Zara",
  "Gavin",
  "Camila",
  "Miles",
  "Aria",
  "Julian",
  "Sienna",
  "Oliver",
  "Nova",
  "Jackson",
];

const PLAYER_LAST_NAMES = [
  "Walker",
  "Hayes",
  "Carson",
  "Grant",
  "Lopez",
  "Chambers",
  "Sullivan",
  "Nguyen",
  "Vega",
  "Reed",
  "Ellis",
  "Barnes",
  "Ford",
  "Young",
  "Price",
];

const ADULT_FIRST_NAMES = [
  "Monica",
  "David",
  "Renee",
  "Victor",
  "Allison",
  "George",
  "Latoya",
  "Omar",
  "Priya",
  "Trevor",
  "Sandra",
  "Calvin",
  "Ellen",
  "Malik",
  "Brianna",
];

const PRACTICE_PLAN_LIBRARY = [
  {
    title: "Ball Security & Spacing",
    durationMinutes: 90,
    focusAreas: ["ball_handling", "spacing", "passing"],
    summary: "Progressive guard + wing work that ends in 4-out spacing reps.",
    blocks: [
      {
        name: "Dynamic activation",
        focusAreas: ["mobility"],
        durationMinutes: 12,
        instructions: "Band series, lateral slides, ankle skips, and partner close-outs.",
        equipment: "Bands, cones",
      },
      {
        name: "Handle under pressure",
        focusAreas: ["ball_handling"],
        durationMinutes: 20,
        instructions: "2-ball pound + cross, into trap-escape progressions ending with live 1v1 full court.",
        equipment: "Basketballs",
      },
      {
        name: "Advantage passing",
        focusAreas: ["passing", "decision_making"],
        durationMinutes: 25,
        instructions: "3-player advantage keep-away, touch passes, then 4-out drive-and-kick feel.",
        equipment: "Basketballs, markers",
      },
      {
        name: "Spacing game to score",
        focusAreas: ["spacing", "finishing"],
        durationMinutes: 20,
        instructions: "4v4 + coach, paint touches required before shot, emphasize drift + shake spacing.",
        equipment: "Scoreboard",
      },
      {
        name: "Cool-down + reflect",
        focusAreas: ["recovery"],
        durationMinutes: 13,
        instructions: "Breathing reset, partner stretch, 2 key takeaways on whiteboard.",
        equipment: "Mats",
      },
    ],
  },
  {
    title: "Transition Defense Tune-Up",
    durationMinutes: 95,
    focusAreas: ["transition", "communication", "conditioning"],
    summary: "Sharpen conversion defense and early-clock poise.",
    blocks: [
      {
        name: "3-lane build-up",
        focusAreas: ["conditioning"],
        durationMinutes: 15,
        instructions: "Continuous 3-lane break with score/stops emphasis.",
        equipment: "Basketballs",
      },
      {
        name: "Numbered conversion",
        focusAreas: ["transition", "communication"],
        durationMinutes: 25,
        instructions: "Number call 5v4/4v3 conversion with touch-the-logo rule for trailers.",
        equipment: "Whistle",
      },
      {
        name: "Early-clock reads",
        focusAreas: ["decision_making"],
        durationMinutes: 25,
        instructions: "Hit-ahead into drag screens, vs. drop/switch coverages.",
        equipment: "Cones",
      },
      {
        name: "Special situations",
        focusAreas: ["BLOB", "SLOB"],
        durationMinutes: 20,
        instructions: "Sideline and baseline plays out of timeout with time/score analytics cue.",
        equipment: "Board",
      },
      {
        name: "Recovery reset",
        focusAreas: ["recovery"],
        durationMinutes: 10,
        instructions: "Foam-roll lower half + guided box breathing.",
        equipment: "Foam rollers",
      },
    ],
  },
  {
    title: "Late-Game Execution",
    durationMinutes: 88,
    focusAreas: ["clutch", "communication", "finishing"],
    summary: "Situational reps for two-for-one math and foul/timeout control.",
    blocks: [
      {
        name: "Score/clock scenarios",
        focusAreas: ["timeouts", "communication"],
        durationMinutes: 30,
        instructions: "Run 6 situational possessions (down 3, up 2, sideline 1.8s) with film tags.",
        equipment: "Clock remote",
      },
      {
        name: "ATO package",
        focusAreas: ["execution"],
        durationMinutes: 25,
        instructions: "Introduce 2 quick-hitter sets for both clubs plus counter vs. switch.",
        equipment: "Board",
      },
      {
        name: "Free-throw routine under stress",
        focusAreas: ["finishing"],
        durationMinutes: 18,
        instructions: "Heartbeat race into free throws, teammates create noise.",
        equipment: "Speakers",
      },
      {
        name: "Debrief + accountability",
        focusAreas: ["leadership"],
        durationMinutes: 15,
        instructions: "Captains lead huddle, recap cues, commit to personal closing habits.",
        equipment: "Notebook",
      },
    ],
  },
];

const PLAYERS_PER_TEAM = 12;

export async function seedDomainDemo() {
  if (!hasDatabase()) {
    return { applied: false, reason: "DATABASE_URL not set" };
  }

  const pool = getPool();
  const roleMap = await ensureRoles(["OrgAdmin", "ManagerCoach"]);
  const slugs = CLUBS.map((club) => club.slug);
  await query("DELETE FROM organizations WHERE slug = ANY($1::text[])", [slugs]);

  const results = [];
  for (const club of CLUBS) {
    const seeded = await seedClub(club, roleMap);
    results.push(seeded);
  }

  if (pool) {
    await pool.end();
  }

  return { applied: true, clubsSeeded: results };
}

async function seedClub(club, roleMap) {
  await query("BEGIN");
  try {
    const orgRes = await query(
      `INSERT INTO organizations (name, slug, state_province, country, sport_type, subscription_plan)
       VALUES ($1,$2,$3,$4,'basketball','pro')
       RETURNING id`,
      [club.name, club.slug, club.state, club.country]
    );
    const orgId = orgRes.rows[0].id;
    await query("SET LOCAL app.current_org_id = $1", [orgId]);

    const adminUser = await ensureUser({ name: `${club.shortName} Director`, email: `director@${club.emailDomain}` });
    const adminMembership = await ensureMembership(orgId, adminUser.id);
    await ensureMembershipRole(adminMembership, roleMap.OrgAdmin);

    const coachUsers = await seedCoaches(orgId, club, roleMap.ManagerCoach);
    const seasons = await seedSeasons(orgId);

    const seededTeams = [];
    const tryoutTargets = [];

    for (const seasonSpec of SEASONS) {
      const seasonRecord = seasons[seasonSpec.label];
      let ageOffset = 0;
      for (const blueprint of TEAM_BLUEPRINTS) {
        const headCoachEmail = blueprint.coaches[0].emailLocal + `@${club.emailDomain}`;
        const headCoachId = coachUsers.get(headCoachEmail);
        const teamName = `${club.shortName} ${blueprint.ageGroup} ${seasonSpec.label}`;
        const team = await upsertTeam({
          orgId,
          name: teamName,
          code: `${club.slug}-${blueprint.code}-${seasonSpec.label.replace(/\s+/g, "-" ).toLowerCase()}`,
          season: seasonSpec,
          blueprint,
          headCoachId,
        });

        const roster = generateRoster({
          club,
          season: seasonSpec,
          blueprint,
          seedOffset: ageOffset,
        });
        const playerRecords = await seedPlayers({ orgId, teamId: team.id, roster });
        await seedGuardians({ orgId, players: playerRecords });
        await seedRegistrations({ orgId, seasonId: seasonRecord.id, players: playerRecords });
        await seedPracticePlans({ orgId, teamId: team.id, coachId: headCoachId, season: seasonSpec, blueprint });

        if (blueprint.ageGroup === "U16" && seasonSpec.label === "Winter 2026") {
          tryoutTargets.push({ team, coachId: headCoachId, players: playerRecords, season: seasonSpec });
        }

        seededTeams.push({ teamId: team.id, season: seasonSpec.label, ageGroup: blueprint.ageGroup });
        ageOffset += 3;
      }
    }

    for (const target of tryoutTargets) {
      await seedTryoutEvent({ orgId, target });
    }

    await query("COMMIT");
    return { orgId, slug: club.slug, teams: seededTeams.length };
  } catch (error) {
    await query("ROLLBACK");
    throw error;
  }
}

async function ensureRoles(codes) {
  const map = {};
  for (const code of codes) {
    const res = await query(
      `INSERT INTO roles (code)
       VALUES ($1)
       ON CONFLICT (code) DO UPDATE SET code = EXCLUDED.code
       RETURNING id`,
      [code]
    );
    map[code] = res.rows[0].id;
  }
  return map;
}

async function ensureUser({ name, email }) {
  const externalUid = `seed-${email}`;
  const res = await query(
    `INSERT INTO users (external_uid, email, name)
     VALUES ($1,$2,$3)
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [externalUid, email, name]
  );
  return { id: res.rows[0].id, email };
}

async function ensureMembership(orgId, userId) {
  const insert = await query(
    `INSERT INTO memberships (user_id, org_id)
     VALUES ($1,$2)
     ON CONFLICT (user_id, org_id) DO NOTHING
     RETURNING id`,
    [userId, orgId]
  );
  if (insert.rows.length) return insert.rows[0];
  const existing = await query(`SELECT id FROM memberships WHERE user_id = $1 AND org_id = $2`, [userId, orgId]);
  return existing.rows[0];
}

async function ensureMembershipRole(membershipId, roleId) {
  await query(
    `INSERT INTO membership_roles (membership_id, role_id)
     VALUES ($1,$2)
     ON CONFLICT DO NOTHING`,
    [membershipId, roleId]
  );
}

async function seedCoaches(orgId, club, coachRoleId) {
  const map = new Map();
  for (const blueprint of TEAM_BLUEPRINTS) {
    for (const coach of blueprint.coaches) {
      const email = `${coach.emailLocal}@${club.emailDomain}`;
      if (map.has(email)) continue;
      const user = await ensureUser({ name: coach.name, email });
      const membership = await ensureMembership(orgId, user.id);
      await ensureMembershipRole(membership.id, coachRoleId);
      map.set(email, user.id);
    }
  }
  return map;
}

async function seedSeasons(orgId) {
  const map = {};
  for (const season of SEASONS) {
    const startDate = isoDate(season.year, season.start.month, season.start.day);
    const endDate = isoDate(season.year, season.end.month, season.end.day);
    const res = await query(
      `INSERT INTO seasons (org_id, label, year, status, starts_on, ends_on)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (org_id, label) DO UPDATE
         SET year = EXCLUDED.year,
             status = EXCLUDED.status,
             starts_on = EXCLUDED.starts_on,
             ends_on = EXCLUDED.ends_on
       RETURNING id`,
      [orgId, season.label, season.year, season.status, startDate, endDate]
    );
    map[season.label] = { id: res.rows[0].id, ...season };
  }
  return map;
}

async function upsertTeam({ orgId, name, code, season, blueprint, headCoachId }) {
  const res = await query(
    `INSERT INTO teams (
       org_id, name, code, season_year, season_label, competition_level, age_category, sport, head_coach_user_id,
       training_frequency_per_week, default_training_duration_min, home_venue
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,'basketball',$8,3,90,$9)
     ON CONFLICT (org_id, name) DO UPDATE
       SET code = EXCLUDED.code,
           head_coach_user_id = EXCLUDED.head_coach_user_id,
           home_venue = EXCLUDED.home_venue
     RETURNING id`,
    [
      orgId,
      name,
      code,
      season.year,
      season.label,
      blueprint.competitionLevel,
      blueprint.ageGroup,
      headCoachId,
      blueprint.venue,
    ]
  );
  return { id: res.rows[0].id, name };
}

function generateRoster({ club, season, blueprint, seedOffset }) {
  const roster = [];
  for (let idx = 0; idx < PLAYERS_PER_TEAM; idx += 1) {
    const first = PLAYER_FIRST_NAMES[(idx + seedOffset) % PLAYER_FIRST_NAMES.length];
    const last = PLAYER_LAST_NAMES[(idx * 3 + seedOffset) % PLAYER_LAST_NAMES.length];
    const number = 10 + ((idx + seedOffset) % 20);
    const email = `${blueprint.code}-${season.label.replace(/\s+/g, "-").toLowerCase()}-p${String(idx + 1).padStart(2, "0")}@${club.emailDomain}`;
    const guardianFirst = ADULT_FIRST_NAMES[(idx + seedOffset + 2) % ADULT_FIRST_NAMES.length];
    const guardianEmail = `${blueprint.code}-${season.label.replace(/\s+/g, "-").toLowerCase()}-g${String(idx + 1).padStart(2, "0")}@${club.emailDomain}`;
    roster.push({
      player: { firstName: first, lastName: last, email, jersey: number },
      guardian: {
        firstName: guardianFirst,
        lastName: last,
        email: guardianEmail,
        phone: `555-01${String((idx + seedOffset) % 100).padStart(2, "0")}`,
      },
    });
  }
  return roster;
}

async function seedPlayers({ orgId, teamId, roster }) {
  const players = [];
  for (const entry of roster) {
    const res = await query(
      `INSERT INTO players (org_id, team_id, first_name, last_name, email, status)
       VALUES ($1,$2,$3,$4,$5,'active')
       ON CONFLICT (org_id, email) DO UPDATE
         SET team_id = EXCLUDED.team_id
       RETURNING id`,
      [orgId, teamId, entry.player.firstName, entry.player.lastName, entry.player.email]
    );
    players.push({ id: res.rows[0].id, ...entry });
  }
  return players;
}

async function seedGuardians({ orgId, players }) {
  for (const entry of players) {
    const guardianRes = await query(
      `INSERT INTO guardians (id, org_id, first_name, last_name, display_name, email, phone, relationship, status)
       VALUES (gen_random_uuid(), $1,$2,$3,$4,$5,$6,'Parent','active')
       RETURNING id`,
      [
        orgId,
        entry.guardian.firstName,
        entry.guardian.lastName,
        `${entry.guardian.firstName} ${entry.guardian.lastName}`,
        entry.guardian.email,
        entry.guardian.phone,
      ]
    );
    await query(
      `INSERT INTO guardian_players (guardian_id, player_id, org_id)
       VALUES ($1,$2,$3)
       ON CONFLICT (guardian_id, player_id) DO NOTHING`,
      [guardianRes.rows[0].id, entry.id, orgId]
    );
  }
}

async function seedRegistrations({ orgId, seasonId, players }) {
  for (const entry of players) {
    await query(
      `INSERT INTO registrations (org_id, season_id, player_id, guardian_id, status, submitted_at, reviewed_at)
       VALUES ($1,$2,$3, (SELECT guardian_id FROM guardian_players WHERE player_id = $3 LIMIT 1), 'approved', NOW(), NOW())
       ON CONFLICT (org_id, season_id, player_id) DO UPDATE
         SET status = 'approved', reviewed_at = NOW()`,
      [orgId, seasonId, entry.id]
    );
  }
}

async function seedPracticePlans({ orgId, teamId, coachId, season, blueprint }) {
  let dayOffset = 7;
  for (const template of PRACTICE_PLAN_LIBRARY) {
    const practiceDate = isoDate(season.year, season.start.month, season.start.day + dayOffset);
    const notes = `[seed:${blueprint.ageGroup}] ${template.summary}`;
    const planRes = await query(
      `INSERT INTO practice_plans (org_id, team_id, coach_user_id, title, practice_date, duration_minutes, focus_areas, notes, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'draft')
       RETURNING id`,
      [orgId, teamId, coachId, `${blueprint.ageGroup} ${template.title}`, practiceDate, template.durationMinutes, template.focusAreas, notes]
    );
    const planId = planRes.rows[0].id;
    let position = 1;
    for (const block of template.blocks) {
      await query(
        `INSERT INTO practice_plan_blocks (plan_id, name, description, focus_areas, duration_minutes, start_offset_minutes, player_grouping, position)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [planId, block.name, block.instructions, block.focusAreas, block.durationMinutes, (position - 1) * 15, block.equipment, position]
      );
      position += 1;
    }
    dayOffset += 10;
  }
}

async function seedTryoutEvent({ orgId, target }) {
  if (!target.players.length) return;
  const { team, coachId, players, season } = target;
  const startsAt = `${season.year}-02-10T18:00:00-05:00`;
  const endsAt = `${season.year}-02-10T20:00:00-05:00`;
  const eventRes = await query(
    `INSERT INTO events (org_id, team_id, type, starts_at, ends_at, location, notes, created_by)
     VALUES ($1,$2,'tryout',$3,$4,$5,$6,$7)
     RETURNING id`,
    [orgId, team.id, startsAt, endsAt, `${team.name} - Main Court`, "Seeded tryout evaluation block", coachId]
  );
  const eventId = eventRes.rows[0].id;

  for (const entry of players) {
    await query(
      `INSERT INTO event_attendance (event_id, player_id, status, note)
       VALUES ($1,$2,'yes','Seed tryout attendance')
       ON CONFLICT (event_id, player_id) DO UPDATE SET status = 'yes'`,
      [eventId, entry.id]
    );
  }

  const planRes = await query(
    `INSERT INTO evaluation_plans (org_id, team_id, name, sport, age_group, evaluation_category, scope, created_by_user_id)
     VALUES ($1,$2,$3,'basketball',$4,'tryout','team',$5)
     RETURNING id`,
    [orgId, team.id, `${team.name} Tryout Rubric`, team.name.match(/U\d+/)?.[0] ?? null, coachId]
  );
  const evaluationPlanId = planRes.rows[0].id;

  const sessionRes = await query(
    `INSERT INTO evaluation_sessions (org_id, team_id, event_id, evaluation_plan_id, created_by_user_id)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [orgId, team.id, eventId, evaluationPlanId, coachId]
  );

  for (let idx = 0; idx < players.length; idx += 1) {
    const player = players[idx];
    const rating = 3 + (idx % 3);
    await query(
      `INSERT INTO player_evaluations (org_id, player_id, event_id, author_user_id, title, summary, rating, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'published')
       ON CONFLICT DO NOTHING`,
      [
        orgId,
        player.id,
        eventId,
        coachId,
        `${team.name} Tryout Report`,
        `Seeded evaluation for ${player.player.firstName}`,
        rating,
      ]
    );
  }
}

function isoDate(year, month, day) {
  const safeDay = Math.max(1, Math.min(day, 28));
  const mm = String(month).padStart(2, "0");
  const dd = String(safeDay).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedDomainDemo()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
