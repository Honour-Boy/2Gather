// Shared cost-control primitives for the guarded external API clients: the
// OpenAI-compatible LLM (verseRecommend.js) and API.Bible (bibleApi.js). Both used
// to hand-roll an identical env parser, a per-UTC-day call budget, and a circuit
// breaker — this is the single source of truth for those mechanics. Each client
// still owns its OWN budget + breaker instance (they're separate providers with
// separate limits); these factories just remove the duplication.

// Parse an integer env var, clamped to [min, max]; falls back to `def` when the
// var is unset or non-numeric.
function intEnv(name, def, min, max) {
  const n = parseInt(process.env[name], 10);
  if (Number.isNaN(n)) return def;
  return Math.max(min, Math.min(max, n));
}

// The current UTC day as YYYY-MM-DD — the budget reset boundary.
const utcDay = () => new Date().toISOString().slice(0, 10);

// A per-UTC-day call budget. `limitFn()` returns the day's allowance and is read
// live on each check, so env overrides (and tests) take effect without restart.
// In-memory: resets on restart, which is fine — the provider's own usage cap is
// the ultimate ceiling.
function createDailyBudget(limitFn) {
  const state = { day: "", count: 0 };
  const roll = () => {
    const d = utcDay();
    if (state.day !== d) {
      state.day = d;
      state.count = 0;
    }
  };
  return {
    remaining() {
      roll();
      return limitFn() - state.count;
    },
    note() {
      roll();
      state.count += 1;
    },
    reset() {
      state.day = "";
      state.count = 0;
    },
  };
}

// A simple time-based circuit breaker. `open()` is true during the cooldown that
// follows a `trip()` — callers use it to stop hammering a dead key / exhausted
// quota until the cooldown elapses.
function createBreaker(cooldownMs) {
  let until = 0;
  return {
    open: () => Date.now() < until,
    trip: () => {
      until = Date.now() + cooldownMs;
    },
    reset: () => {
      until = 0;
    },
  };
}

module.exports = { intEnv, utcDay, createDailyBudget, createBreaker };
