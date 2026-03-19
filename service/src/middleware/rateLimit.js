const buckets = new Map();

function nowMs() {
  return Date.now();
}

export function createRateLimiter({ windowMs, max, keyFn }) {
  return (req, res, next) => {
    const key = keyFn ? keyFn(req) : req.ip;
    const bucketKey = `${req.path}:${key}`;
    const now = nowMs();

    const existing = buckets.get(bucketKey);
    if (!existing || now > existing.resetAt) {
      buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (existing.count >= max) {
      const retryAfterSec = Math.ceil((existing.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfterSec));
      return res.status(429).json({
        error: {
          code: "rate_limited",
          message: "Too many requests",
          retryAfterSec,
        },
      });
    }

    existing.count += 1;
    buckets.set(bucketKey, existing);
    return next();
  };
}
