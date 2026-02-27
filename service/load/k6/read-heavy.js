import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  scenarios: {
    read_heavy: {
      executor: "ramping-vus",
      startVUs: 5,
      stages: [
        { duration: "2m", target: 30 },
        { duration: "5m", target: 60 },
        { duration: "2m", target: 0 },
      ],
      gracefulRampDown: "30s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<700", "p(99)<1200"],
  },
};

const API_BASE_URL = __ENV.API_BASE_URL || "https://apex-staging-api-g6dsonn6nq-uc.a.run.app";
const FIREBASE_API_KEY = __ENV.FIREBASE_API_KEY;

function newIdentity() {
  const suffix = Math.random().toString(36).slice(2, 10);
  return {
    email: `loadtest-${suffix}@example.com`,
    password: "ApexLoad!23456",
  };
}

export function setup() {
  if (!FIREBASE_API_KEY) throw new Error("FIREBASE_API_KEY env is required");

  const idn = newIdentity();
  const signUpRes = http.post(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
    JSON.stringify({ email: idn.email, password: idn.password, returnSecureToken: true }),
    { headers: { "Content-Type": "application/json" } },
  );

  check(signUpRes, { "firebase signup 200": (r) => r.status === 200 });
  const idToken = signUpRes.json("idToken");

  const sessionRes = http.post(
    `${API_BASE_URL}/auth/session`,
    JSON.stringify({ idToken }),
    {
      headers: {
        "Content-Type": "application/json",
        Origin: "https://apex-staging-web.web.app",
      },
    },
  );

  check(sessionRes, { "session created": (r) => r.status === 200 });

  const cookie = sessionRes.cookies.apex_session && sessionRes.cookies.apex_session[0]?.value;
  if (!cookie) throw new Error("No apex_session cookie returned");

  return { cookie };
}

export default function (data) {
  const params = {
    headers: {
      Cookie: `apex_session=${data.cookie}`,
      Origin: "https://apex-staging-web.web.app",
    },
  };

  const me = http.get(`${API_BASE_URL}/auth/me`, params);
  check(me, { "auth/me 200": (r) => r.status === 200 });

  const teams = http.get(`${API_BASE_URL}/teams?limit=20&offset=0`, params);
  check(teams, { "teams 200": (r) => r.status === 200 });

  const players = http.get(`${API_BASE_URL}/players?limit=20&offset=0`, params);
  check(players, { "players 200": (r) => r.status === 200 });

  const matches = http.get(`${API_BASE_URL}/matches?limit=20&offset=0`, params);
  check(matches, { "matches 200": (r) => r.status === 200 });

  sleep(1);
}
