# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install               # install deps
npx expo install --fix    # fix native package version mismatches after an SDK bump

npm start                 # Expo dev server (pick a platform interactively)
npm run android           # launch on Android
npm run ios               # launch on iOS
npm run web                # web build — runs the cors-proxy sidecar + Metro together (see below)

npm test                  # Jest once (jest-expo preset)
npm run test:watch        # Jest watch mode
npx jest lib/__tests__/portfolioAnalytics.test.ts   # run a single test file
npx tsc --noEmit           # type-check (no separate build step; this is the CI gate)
npm run lint               # expo lint
```

There is no production build/deploy step in this repo beyond `eas.json` build profiles (`eas build`). `npm run reset-db` just prints a reminder — actually wiping local data is a Settings-screen action, not a script.

## Architecture

**Local-first with optional Firebase sync.** Expo Router (SDK 51) + Zustand + a platform-dispatched storage layer. User data (expenses, holdings, transactions, settings, auth metadata) is stored on-device first. Firebase Auth/Firestore are optional and configured only through `EXPO_PUBLIC_FIREBASE_*` env vars; when config is absent the app must keep working in guest/local mode.

### Platform-dispatched data layer

`lib/db.ts` re-exports the same function names from either `lib/db.sqlite.ts` (native, `expo-sqlite`) or `lib/dbWeb.ts` (web, AsyncStorage), selected at runtime via `Platform.OS` — **not** via Metro's `.web.ts` resolution, because that resolution can be bypassed through the `@/` path alias and has previously caused the web build to crash by pulling in native `expo-sqlite`. Keep the web implementation named `dbWeb.ts`, not `db.web.ts`, so the dispatcher and sync wrappers in `db.ts` are never bypassed. When adding a new persisted entity, add it to both `db.sqlite.ts` (SQL table + migration via `ALTER TABLE ... ADD COLUMN` wrapped in try/catch — this is the only migration mechanism, there's no migration runner) and `dbWeb.ts` (AsyncStorage JSON blob), then re-export from `db.ts`.

Stores (`store/useXStore.ts`, Zustand) are the only things that call into `lib/db.ts`; components/screens go through stores, never through `lib/db*` directly. Mutating exports in `db.ts` notify `lib/syncEvents.ts` so `lib/cloudSync.ts` can schedule debounced pushes; reads, `replaceAllData`, and price-snapshot cache writes intentionally do not notify.

### Firebase auth and cloud sync

`lib/firebase.ts` lazily initializes Firebase Auth and Firestore only when all required `EXPO_PUBLIC_FIREBASE_*` values exist. Native Auth uses React Native AsyncStorage persistence; web uses the browser default. Firestore on native uses long-polling auto-detection.

`lib/cloudSync.ts` syncs signed-in, non-guest users through one Firestore document at `users/{uid}`. The document has the same snapshot shape as Settings backup/export (`expenses`, `holdings`, `transactions`, plus metadata). On first sync it merges local and remote so neither side is clobbered; after that it uses snapshot-level last-write-wins. Remote pulls apply through `replaceAllData` while `syncEvents` are suppressed, then stores are rehydrated. Guests never sync.

### Stock price fetching (`lib/stockPrices.ts`)

Prices come from Yahoo Finance's unofficial public chart endpoint (`query1.finance.yahoo.com/v8/finance/chart/*`) — no docs, no SLA, no key, and it IP-rate-limits with a bare `429`. Every function here swallows errors and returns `null`/unchanged data; a quote failure must never break the portfolio screen since cost-basis tracking still works without live prices.

- **Web CORS:** browsers block Yahoo directly (no `Access-Control-Allow-Origin`). `npm run web` runs `concurrently` to start both Metro (`expo start --web`) and a small standalone Node sidecar, `scripts/cors-proxy.js`, on port `8788`. `lib/stockPrices.ts` and `lib/fxRates.ts` route web requests through `http://localhost:8788/proxy?url=...` (native fetches Yahoo directly, no CORS issue there). The sidecar allow-lists hosts (`query1.finance.yahoo.com`, `api.frankfurter.dev`) and follows redirects itself (Node's `https.get` doesn't).
  - `lib/proxyUrl.ts` centralizes proxy wrapping. For published web builds set `EXPO_PUBLIC_QUOTE_PROXY_URL` to a deployed `workers/quote-proxy.js` URL; otherwise web defaults to the local sidecar.
  - This was deliberately **not** built as an Expo Router API route (`+api.ts`). API routes require `web.output` to be `"static"` or `"server"` in `app.json`, both of which pre-render every screen in Node at request time — this app's Zustand `persist` middleware calls `AsyncStorage` (→ `window.localStorage`) during store rehydration, which crashes immediately under Node SSR (`window is not defined`). Keep `app.json`'s `web.output` as `"single"`.
  - `api.frankfurter.app` (FX rate source) permanently redirects to `api.frankfurter.dev/v1/latest` now — use the `.dev` host directly.
- **Rate-limit handling:** `fetchJson` retries a `429` with short backoff (1s, 2.5s); if still rate-limited after that, it sets a 5-minute cooldown (`rateLimitedUntil`, module-level) during which it returns `null` immediately without hitting Yahoo at all, so the 1-minute auto-refresh loop doesn't keep re-triggering/extending the ban.
- **BIST 15-minute delay (`lib/priceDelay.ts`):** BIST quotes are deliberately shown ~15 minutes stale — a compliance choice (informational display only, not a trading feature), independent of however fresh Yahoo's data actually is. Every live-fetched BIST price is logged to a `price_snapshots` table (native SQLite / web AsyncStorage, same dispatch pattern as above, pruned past 30 minutes), and `applyBistDelay()` looks up the snapshot from ≥15 minutes ago instead of returning what was just fetched. When no old-enough snapshot exists (cold start after >15 min away) it returns `null` and callers keep the previously shown price — or show nothing — rather than the fresh one; never "fall back" to the just-fetched price, that would defeat the delay exactly when it matters. Both the main refresh path (`usePortfolioStore.refreshPrices`) and the daily-quote path (`fetchAllDailyQuotes`, used by "Günlük" mode) go through this same helper — don't duplicate the delay logic at either call site. US and commodity holdings are never delayed.
- Auto-refresh is foreground-only and runs every 60s (`app/(tabs)/portfolio.tsx`, `AppState.currentState !== "active"` guard) — there's no manual refresh button.
- `lib/marketHours.ts` skips quote fetches while BIST/US/commodity markets are closed, except for first fetches and stale post-close prices. Keep this broad and conservative; it is a rate-limit guard, not a holiday calendar.

### Everything else

- User-facing text is Turkish and lives in `lib/strings.ts` as `S.<section>.<key>`; never hardcode copy in components.
- Pure calculations belong in `lib/*Analytics.ts` (`expenseAnalytics.ts`, `portfolioAnalytics.ts`) — these are what's unit-tested under `lib/__tests__/`.
- Import/export: `lib/export.ts` (`exportAll` writes one JSON envelope with `{ expenses, holdings, transactions }`) and `lib/importData.ts` (`validateUnifiedBackup` restores all three, tolerant of partial/malformed data) power the Settings-screen backup/restore flow. Cloud sync reuses the same envelope shape for signed-in accounts, but manual backup remains the portable/offline path.
- `expo-notifications` (`lib/notifications.ts`) fires local, immediate (`trigger: null`) notifications for target-price/stop-loss alerts; once triggered, the holding's `targetPrice`/`stopLoss` is cleared (one-shot, not recurring).
- NativeWind is pinned to `4.1.23` — do not bump without checking that the app still bundles (it depends on the reanimated/worklets babel plugin ordering in `babel.config.js`, where `react-native-reanimated/plugin` **must** be listed last).

## Storage Model

| Data | Native | Web | Store/module |
| --- | --- | --- | --- |
| Expenses | SQLite `expenses` | AsyncStorage | `useExpenseStore` |
| Holdings | SQLite `holdings` | AsyncStorage | `usePortfolioStore` |
| Holding transactions | SQLite `holding_transactions` | AsyncStorage | `usePortfolioStore` |
| BIST price snapshots | SQLite `price_snapshots` | AsyncStorage | `lib/priceDelay.ts` (internal, not store-owned) |
| Settings | AsyncStorage | AsyncStorage | `useSettingsStore` |
| Local auth | AsyncStorage | AsyncStorage | `useAuthStore` |
| Cloud sync snapshot | Firestore `users/{uid}` | Firestore `users/{uid}` | `lib/cloudSync.ts` |

## Conventions

- PascalCase components, camelCase functions/variables, `useXStore` for Zustand stores; route components named by screen purpose (e.g. `PortfolioScreen`).
- Styling is NativeWind class names — match existing spacing/color patterns before introducing new ones.
- Commits follow Conventional Commits (`feat(scope): ...`), scoped and action-oriented.
- Call out storage/migration/platform-specific behavior changes in PRs, especially anything touching `lib/db.*`, `app.json` web config, or quote-fetching.
