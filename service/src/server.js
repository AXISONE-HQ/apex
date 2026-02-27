import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.js";
import teamsRoutes from "./routes/domain/teams.js";
import playersRoutes from "./routes/domain/players.js";
import matchesRoutes from "./routes/domain/matches.js";
import aiJobsRoutes from "./routes/aiJobs.js";
import { requireSession } from "./middleware/requireSession.js";
import { requirePermission } from "./middleware/requirePermission.js";
import { getSession } from "./repositories/sessionsRepo.js";
import { getUserById } from "./repositories/usersRepo.js";
import { runMigrations } from "./db/migrate.js";
import { seedRbac } from "./db/seedRbac.js";

const app = express();

const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || "")
  .split(",")
  .map((x) => x.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (!allowedOrigins.length || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true
  })
);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const originAllowed = !origin || !allowedOrigins.length || allowedOrigins.includes(origin);

  if (!originAllowed) {
    return res.status(403).json({ error: "cors_origin_not_allowed" });
  }

  if (origin) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
  }

  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  return next();
});

app.use(express.json());
app.use(cookieParser());

app.use(async (req, _res, next) => {
  const sid = req.cookies?.apex_session;
  if (sid) {
    const session = await getSession(sid);
    if (session) {
      const user = await getUserById(session.userId);
      if (user) {
        req.user = {
          id: user.id,
          email: user.email,
          name: user.name,
          roles: session.roles,
          permissions: session.permissions,
          activeOrgId: session.activeOrgId,
          orgScopes: session.activeOrgId ? [session.activeOrgId] : [],
          teamScopes: []
        };
      }
    }
  }

  // Temporary testing override header (dev/test only).
  const allowHeaderAuth = process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";
  if (allowHeaderAuth) {
    const userHeader = req.header("x-user");
    if (userHeader) {
      try {
        req.user = JSON.parse(userHeader);
      } catch {
        req.user = { id: "usr_invalid", roles: [] };
      }
    }
  }

  next();
});

app.use("/auth", authRoutes);
app.use("/teams", teamsRoutes);
app.use("/players", playersRoutes);
app.use("/matches", matchesRoutes);
app.use("/ai", aiJobsRoutes);

app.get(
  "/secure/teams",
  requireSession,
  requirePermission("teams.page.view"),
  (_req, res) => res.status(200).json({ ok: true })
);

app.get(
  "/secure/org/:orgId/teams",
  requireSession,
  requirePermission("teams.page.view", async (req) => ({ type: "organization", id: req.params.orgId })),
  (_req, res) => res.status(200).json({ ok: true })
);

app.post("/admin/bootstrap-db", async (req, res) => {
  const token = req.header("x-bootstrap-token");
  if (!process.env.BOOTSTRAP_TOKEN || token !== process.env.BOOTSTRAP_TOKEN) {
    return res.status(403).json({ error: "forbidden" });
  }

  try {
    const migrated = await runMigrations();
    const seeded = await seedRbac();
    return res.status(200).json({ ok: true, migrated, seeded });
  } catch (err) {
    return res.status(500).json({ error: "bootstrap_failed", message: err.message });
  }
});

app.get("/healthz", (_req, res) => res.status(200).json({ status: "ok" }));

if (["staging", "production"].includes(process.env.NODE_ENV || "") && !process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required in staging/production");
}

if (process.env.NODE_ENV !== "test") {
  const port = process.env.PORT || 8080;
  app.listen(port, () => {
    console.log(`apex-v1-service listening on :${port}`);
  });
}

export default app;
