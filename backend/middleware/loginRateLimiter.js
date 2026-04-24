const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 10;

const attempts = new Map(); // IP → { count, resetAt }

function loginRateLimiter(req, res, next) {
  const ip = req.ip;
  const now = Date.now();
  const record = attempts.get(ip);

  if (!record || now > record.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }

  if (record.count >= MAX_ATTEMPTS) {
    const retryAfterSecs = Math.ceil((record.resetAt - now) / 1000);
    res.set('Retry-After', retryAfterSecs);
    return res.status(429).json({
      error: `Too many login attempts. Try again in ${Math.ceil(retryAfterSecs / 60)} minute(s).`
    });
  }

  record.count += 1;
  next();
}

module.exports = loginRateLimiter;
