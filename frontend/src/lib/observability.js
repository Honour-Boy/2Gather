// Observability (frontend) — Sentry for errors, PostHog for product analytics.
// Both are OFF unless their env var is set, and the SDKs are dynamically imported
// only when configured, so a build without keys ships none of this code at runtime.
// Set VITE_SENTRY_DSN / VITE_POSTHOG_KEY (+ optional VITE_POSTHOG_HOST) to enable.

export function initObservability() {
  const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
  const posthogKey = import.meta.env.VITE_POSTHOG_KEY;
  const posthogHost = import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com";

  if (sentryDsn) {
    import("@sentry/react")
      .then((Sentry) => {
        Sentry.init({
          dsn: sentryDsn,
          environment: import.meta.env.MODE,
          tracesSampleRate: 0.1,
        });
      })
      .catch(() => {});
  }

  if (posthogKey) {
    import("posthog-js")
      .then(({ default: posthog }) => {
        posthog.init(posthogKey, {
          api_host: posthogHost,
          capture_pageview: true,
          person_profiles: "identified_only",
        });
      })
      .catch(() => {});
  }
}
