#!/usr/bin/env node

/**
 * Apex v2 Dashboard helper server
 *
 * Serves the dashboard and provides a local endpoint to generate a CTO tech brief
 * based on the selected EPIC + current repo state.
 *
 * Run:
 *   cd projects/apex-v1/docs/v2/dashboard
 *   node server.js
 *   # open http://localhost:7331
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..'); // docs/v2
const DASH = path.resolve(__dirname);       // docs/v2/dashboard
const PORT = process.env.PORT ? Number(process.env.PORT) : 7331;

function send(res, code, body, headers={}){
  res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8', ...headers });
  res.end(body);
}

function sendJson(res, code, obj){
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj, null, 2));
}

function safeRead(filePath){
  return fs.readFileSync(filePath, 'utf8');
}

function sh(cmd, cwd){
  return execSync(cmd, { cwd, stdio: ['ignore','pipe','pipe'], encoding: 'utf8' }).trim();
}

function nowStamp(){
  const d = new Date();
  const pad = n => String(n).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function slug(s){
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'').slice(0,80) || 'epic';
}

function buildCodeSnapshot(repoRoot){
  // Fast, cheap signals. This is not exhaustive; it’s a starting point for a CTO brief.
  const snapshot = {};
  try {
    snapshot.branch = sh('git rev-parse --abbrev-ref HEAD', repoRoot);
    snapshot.head = sh('git log -1 --oneline', repoRoot);
  } catch {}

  // Quick route/UI hints
  const hints = [];
  const grep = (pattern, rel) => {
    try {
      const out = sh(`rg -n --hidden --glob '!.git/**' "${pattern}" ${rel} || true`, repoRoot);
      if (out) hints.push({ pattern, rel, sample: out.split('\n').slice(0, 12).join('\n') });
    } catch {}
  };

  // Likely areas (expanded)
  grep('organizations|memberships|roles|permissions', 'service/src');
  grep('admin/clubs|organizationsRepo|listOrganizations', 'service/src');
  grep('admin\.clubs\.create|admin\.page\.clubs', 'service/src');
  grep('organizations', 'service/sql/migrations');
  grep('apex/admin/clubs|apex/admin/onboarding', 'frontend/src');
  grep('invite|onboard', 'service/src');
  grep('payment|stripe|subscription', 'service/src');
  grep('email|sendgrid|postmark|mail', 'service/src');

  // Existing shipped areas
  grep('apex/schedule', 'frontend');
  grep('attendance', 'frontend');
  grep('announc', 'service');
  grep('team_messages|team messages', 'service');
  grep('rbac|permission|role', 'service');
  grep('events/:id|GET /events', 'service');

  snapshot.hints = hints;
  return snapshot;
}

function generateBriefMarkdown(payload, code){
  const epic = payload.epic || {};
  const workflows = payload.workflows || [];

  const title = `CTO Tech Brief — EPIC ${epic.epicNumber || '?'}: ${epic.title || 'Untitled'}`;

  const wfList = workflows.map(w => `- Workflow ${w.workflowNumber}: ${w.title} — Status: ${w.status}`).join('\n') || '- (No workflows found for this epic)';

  const hintBlock = (code.hints || []).map(h => {
    return `Pattern: ${h.pattern}\nArea: ${h.rel}\nSample:\n${h.sample}`;
  }).join('\n\n---\n\n') || '(no quick hints captured)';

  return `# ${title}

**Generated:** ${nowStamp()}  
**Repo branch/head:** ${code.branch || 'unknown'} • ${code.head || 'unknown'}

## 1) Executive summary
- What we’re building in this epic (1–2 paragraphs):
  - 

## 2) Current code reality (signals)
- Notes:
  - This is a quick snapshot (grep-based). Validate with targeted file reads + running the app.

\n\n### Grep hints
\n\n\
\
\
\
\
\
\`\`\`
${hintBlock}
\`\`\`

## 3) Scope (from product roadmap)
### Epic
- EPIC ${epic.epicNumber || '?'} — ${epic.title || ''}

### Workflows included
${wfList}

## 4) Proposed technical approach
- Architecture decisions:
  - 
- Data model changes:
  - 
- API surface (routes/contracts):
  - 
- Frontend changes (screens/components):
  - 
- Permissions/RBAC:
  - 
- Notifications/async (if relevant):
  - 

## 5) Implementation plan (PR-sized)
- PR1:
- PR2:
- PR3:

## 6) Test plan
- Unit:
- Integration:
- Negative RBAC tests:
- E2E smoke:

## 7) Rollout plan
- Staging validation:
- Controlled rollout:
- Backout plan:

## 8) Risks / open questions
- 
`;
}

function parseBody(req){
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; if (data.length > 3_000_000) req.destroy(); });
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch (e){ reject(e); }
    });
  });
}

function serveFile(res, filePath){
  const ext = path.extname(filePath).toLowerCase();
  const type = ext === '.html' ? 'text/html; charset=utf-8'
            : ext === '.css'  ? 'text/css; charset=utf-8'
            : ext === '.js'   ? 'application/javascript; charset=utf-8'
            : ext === '.md'   ? 'text/markdown; charset=utf-8'
            : 'application/octet-stream';
  try{
    const buf = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': type });
    res.end(buf);
  } catch {
    send(res, 404, 'Not found');
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'POST' && url.pathname === '/api/brief'){
    try{
      const payload = await parseBody(req);
      const repoRoot = path.resolve(ROOT, '..', '..'); // docs/v2 -> apex-v1
      const code = buildCodeSnapshot(repoRoot);
      const md = generateBriefMarkdown(payload, code);

      const outDir = path.resolve(ROOT, 'briefs');
      fs.mkdirSync(outDir, { recursive: true });
      const filename = `CTO-BRIEF-EPIC-${payload?.epic?.epicNumber || 'X'}-${slug(payload?.epic?.title || '')}.md`;
      const outPath = path.join(outDir, filename);
      fs.writeFileSync(outPath, md, 'utf8');

      sendJson(res, 200, { ok: true, file: `/briefs/${filename}` });
    } catch (e){
      sendJson(res, 500, { ok: false, error: String(e) });
    }
    return;
  }

  // Serve dashboard at /dashboard/ and v2 files from root
  if (url.pathname === '/' || url.pathname === '/dashboard' || url.pathname === '/dashboard/'){
    return serveFile(res, path.join(DASH, 'index.html'));
  }

  // Map /dashboard/* to dashboard folder
  if (url.pathname.startsWith('/dashboard/')){
    const rel = url.pathname.slice('/dashboard/'.length);
    const file = path.join(DASH, rel);
    if (!file.startsWith(DASH)) return send(res, 400, 'Bad path');
    return serveFile(res, file);
  }

  // Everything else served from docs/v2
  const file = path.join(ROOT, url.pathname);
  if (!file.startsWith(ROOT)) return send(res, 400, 'Bad path');
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()){
    // no directory listing
    return send(res, 403, 'Forbidden');
  }
  return serveFile(res, file);
});

server.listen(PORT, () => {
  console.log(`Apex v2 dashboard server running on http://localhost:${PORT}/dashboard/`);
});
