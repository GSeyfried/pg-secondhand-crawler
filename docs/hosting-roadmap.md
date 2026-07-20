# Git, Vercel, and scheduling roadmap

The project is currently local-first. The planner core under `src/planner/` is environment-independent, while `src/dashboard/server.js` is intentionally local because it launches child processes.

Before hosting:

1. Initialize Git and review ignored raw/cache/error data before the first commit.
2. Move durable listing history, plans, purchases, alerts, and job state to a managed database or object store. Vercel's filesystem is ephemeral.
3. Serve the dashboard as static assets and expose read-only planner data through authenticated serverless endpoints.
4. Replace child-process command buttons with authenticated job-enqueue endpoints. Never expose arbitrary command execution.
5. Run crawl/planner work in a suitable background worker. Vercel Cron can trigger an authenticated endpoint, but long crawls may need a queue or external worker because function duration is limited.
6. Add an idempotency key and distributed lock per source/run so overlapping schedules cannot duplicate observations.
7. Store user-agent contact details, database credentials, notification secrets, and cron secrets as environment variables.
8. Keep robots checks, request pacing, retry limits, and dry-run support in scheduled execution.
9. Add authentication before exposing kit plans, purchase history, seller notes, or command controls.
10. Add deployment CI that runs `npm test` and a fixture-only crawl; do not run a live crawl on every build.

Suggested schedule flow:

```text
Vercel Cron → authenticated enqueue endpoint → background crawl worker
             → immutable observations → statistics/watch/plan/report jobs
             → saved alerts → dashboard refresh / optional notifications
```

Do not configure notifications until alert deduplication, user preferences, and delivery retries are persisted.
