import test from "node:test";
import assert from "node:assert/strict";

import { requirePlatformAdmin } from "../src/middleware/requirePlatformAdmin.js";

function run(mw, req) {
  return new Promise((resolve) => {
    const res = {
      statusCode: 200,
      _json: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(obj) {
        this._json = obj;
        resolve({ status: this.statusCode, body: obj });
      },
    };
    mw(req, res, () => resolve({ status: 204, body: null }));
  });
}

test("requirePlatformAdmin allows when req.user.isPlatformAdmin=true", async () => {
  delete process.env.AUTH_ALLOW_PLATFORM_ADMIN_EMAIL_FALLBACK;
  delete process.env.PLATFORM_ADMIN_EMAILS;

  const mw = requirePlatformAdmin();
  const out = await run(mw, { user: { isPlatformAdmin: true, email: "x@example.com" } });
  assert.equal(out.status, 204);
});

test("requirePlatformAdmin denies when non-platform and fallback OFF", async () => {
  delete process.env.AUTH_ALLOW_PLATFORM_ADMIN_EMAIL_FALLBACK;
  process.env.PLATFORM_ADMIN_EMAILS = "admin@example.com"; // should not matter

  const mw = requirePlatformAdmin();
  const out = await run(mw, { user: { isPlatformAdmin: false, email: "admin@example.com" } });
  assert.equal(out.status, 403);
  assert.equal(out.body.error, "forbidden");
});
