# pg-secondhand-crawler

A conservative, modular Node.js crawler that catalogs public paragliding-equipment listings and retains only listings located in North America. It compares marketplace full kits with cost scenarios assembled from individual wings, harnesses, and reserves. The first source adapter targets `paraglidingsecondhand.com`; add future sources behind the same adapter interface only after this one is stable.

## Architecture

- `src/core/`: source-independent HTTP, batching, storage, validation, deduplication, and location logic.
- `src/sources/paragliding-secondhand.js`: index URL discovery and listing parsing for the sole initial source.
- `data/fixtures/paragliding-secondhand/`: offline representative pages used by tests and `--fixture-only`.
- `data/dry-run/`: isolated raw, staging, error, checkpoint, and preview output for dry runs.
- `data/normalized/listings.json`: production database; never touched by dry runs.
- `data/normalized/kit-comparisons.json`: complete-kit versus component-cost scenarios; dry runs use `kit-comparisons-preview.json`.

The repository was initially empty; there was no incomplete implementation to migrate.

## Usage

Requires Node 20 or newer. Dependencies are installed only inside this project with `npm install`; nothing is installed globally.

```bash
npm test
npm run crawl:five
npm run crawl -- --source paragliding-secondhand --dry-run --max-listings 5 --batch-size 2 --verbose
npm run crawl -- --source paragliding-secondhand --resume --batch-size 10 --no-dry-run
npm run crawl -- --source paragliding-secondhand --full-site --max-listings 5000 --batch-size 25 --resume --no-dry-run
npm run update-market-stats
npm run evaluate-watchlist
npm run build-acquisition-plan -- --kit-plan griffin-primary-kit --target-date 2026-09-30 --max-budget 3000
npm run acquisition-report -- --kit-plan griffin-primary-kit
npm run dashboard
npm run upload-baseline
```

Live crawling checks `robots.txt` before fetching index/listing pages. If the policy cannot be retrieved, crawling stops safely. The crawler never bypasses authentication, CAPTCHAs, or blocking.

CLI settings have `PG_CRAWLER_` environment equivalents: `DRY_RUN`, `BATCH_SIZE`, `MAX_LISTINGS`, `START_OFFSET`, `CONCURRENCY`, `DELAY_MS`, `SOURCE`, `RESUME`, `FORCE_REFRESH`, and `VERBOSE`. For example, `PG_CRAWLER_MAX_LISTINGS=5`. A JSON config can be supplied with `--config path.json`; precedence is CLI, environment, config file, defaults. Boolean CLI flags accept `--flag`, `--no-flag`, or `--flag=true|false`.

Defaults are dry-run enabled, batch size 10, maximum 25, concurrency 2, and a 1000 ms per-request delay. Useful additional options are `--fixture-only`, `--timeout-ms`, `--max-retries`, and `--index-pages`.

`--full-site` discovers listing URLs from the source's published sitemap instead of category pages. Use it for an initial baseline; keep `--resume` enabled so an interrupted run skips completed URLs. It still checks `robots.txt` before fetching any listing.

By default the source index covers `full-kits,paragliders,harnesses,reserves,helmets` and round-robins discovered URLs so a small run samples every required category. Override this with `--categories`, for example `--categories full-kits,paragliders,harnesses,reserves,instruments,helmets`.

## Data guarantees

Raw envelopes retain source, source ID, URL, retrieval time, status, body, and SHA-256 content hash. A listing failure is isolated from its batch. Checkpoints are written after every batch and `--resume` skips completed URLs. Normalized records are validated before database writes. Exact deduplication uses source ID, then canonical URL, then raw content/image hashes. Potential fuzzy matches are warnings only and are never merged.

Dry-run files live entirely below `data/dry-run/`, use non-overwriting filenames, and culminate in `normalized-preview.json`. The production database is not read for mutation or written in dry-run mode.

Kit comparisons never convert currencies and never claim that generated combinations are technically compatible. Each assembled scenario includes source URLs for its wing, harness, and reserve plus a human-review warning. Marketplace full kits preserve both the source's claim and which core components were actually detected in the listing text.

## Local acquisition dashboard

Run `npm run dashboard` and open `http://127.0.0.1:4173`. The Overview shows the countdown, budget state, three acquisition strategies, watch matches, price drops, market ranges, deadline risk, and recommended action. The Command Center has buttons for the relevant local workflows.

Dashboard command execution is intentionally constrained to a server-side allowlist. There is no arbitrary command textbox, every crawl button uses dry-run, and the server listens only on `127.0.0.1` by default. Jobs run in the background and expose captured status/output to the local page.

The editable goal and watch rules are in [`config/kit-plans/griffin-primary-kit.json`](config/kit-plans/griffin-primary-kit.json) and [`config/watchlist.json`](config/watchlist.json). Generated planner artifacts are isolated below `data/dry-run/planner/` until production mode is explicitly requested.

Vercel recognizes the root `server.js` through `package.json.main`. Hosted deployments automatically enter read-only mode: planner data and static assets remain available, while child-process command execution returns HTTP 403. See [`docs/hosting-roadmap.md`](docs/hosting-roadmap.md) before adding persistence or scheduled automation.

## Weekly hosted crawl

Vercel calls `GET /api/cron/weekly` every Monday at 15:00 UTC. The authenticated job checks `robots.txt`, samples up to 25 listings across full kits, wings, harnesses, reserves, and helmets, then stores normalized listings, source URLs, listing age, history changes, and kit comparisons in a private Vercel Blob snapshot. Set `PG_CRAWLER_WEEKLY_MAX_LISTINGS` to a value from 1–100 to adjust the cap.

The endpoint requires Vercel's `CRON_SECRET` bearer header. Hosted state requires a private Blob store connected to the project. Cron jobs run only from production deployments; preview deployments do not register or execute the schedule.

## Pilot profiles

The dashboard's Pilot Profiles page keeps the tracked listings shared while applying independent acquisition settings for each pilot. A profile includes pilot and all-up weight, total budget, target date, wing class, porosity and inspection requirements, component price ranges, and watch rules. Griffin's tracked repository config remains the fallback profile.

Hosted profile edits are saved inside the same private Blob snapshot as crawler history. Writes require the `CRON_SECRET` bearer value; the browser asks for it when saving and retains it only in that tab's session storage. Profile reads and the selected dashboard view do not expose the secret.

After a local `--full-site` crawl completes, `npm run upload-baseline` sends only the normalized listings and history to the authenticated production import endpoint. The payload is compressed, merged with existing Blob records, and never includes cached pages or raw HTML.

## Normalized schema

See [`docs/schema.md`](docs/schema.md). Unknown facts remain `null`; parsers do not infer missing facts.
