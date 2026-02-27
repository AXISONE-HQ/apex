import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  scenarios: {
    mixed_write: {
      executor: "ramping-vus",
      startVUs: 2,
      stages: [
        { duration: "2m", target: 10 },
        { duration: "4m", target: 20 },
        { duration: "2m", target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.02"],
    http_req_duration: ["p(95)<1000", "p(99)<1800"],
  },
};

const API_BASE_URL = __ENV.API_BASE_URL || "https://apex-staging-api-g6dsonn6nq-uc.a.run.app";
const FIREBASE_API_KEY = __ENV.FIREBASE_API_KEY;

function newIdentity() {
  const suffix = Math.random().toString(36).slice(2, 10);
  return {
    email: `loadwrite-${suffix}@example.com`,
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
  const idToken = signUpRes.json("idToken");

  const sessionRes = http.post(
    `${API_BASE_URL}/auth/session`,
    JSON.stringify({ idToken }),
    { headers: { "Content-Type": "application/json", Origin: "https://apex-staging-web.web.app" } },
  );

  const cookie = sessionRes.cookies.apex_session && sessionRes.cookies.apex_session[0]?.value;
  if (!cookie) throw new Error("No apex_session cookie returned");
  return { cookie };
}

export default function (data) {
  const params = {
    headers: {
      Cookie: `apex_session=${data.cookie}`,
      Origin: "https://apex-staging-web.web.app",
      "Content-Type": "application/json",
    },
  };

  const suffix = Math.random().toString(36).slice(2, 8);
  const teamARes = http.post(`${API_BASE_URL}/teams`, JSON.stringify({ name: `Load Team A ${suffix}` }), params);
  const teamBRes = http.post(`${API_BASE_URL}/teams`, JSON.stringify({ name: `Load Team B ${suffix}` }), params);
  check(teamARes, { "team A created": (r) => r.status === 201 });
  check(teamBRes, { "team B created": (r) => r.status === 201 });

  const homeTeamId = teamARes.json("id");
  const awayTeamId = teamBRes.json("id");

  const playerRes = http.post(
    `${API_BASE_URL}/players`,
    JSON.stringify({ firstName: "Load", lastName: suffix, email: `p-${suffix}@example.com`, teamId: homeTeamId }),
    params,
  );
  check(playerRes, { "player created": (r) => r.status === 201 });

  const matchRes = http.post(
    `${API_BASE_URL}/matches`,
    JSON.stringify({ homeTeamId, awayTeamId }),
    params,
  );
  check(matchRes, { "match created": (r) => r.status === 201 });

  sleep(1);
}
