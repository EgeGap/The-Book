# Trading Journal

A local-first Expo React Native app for tracking recurring expenses and an investment portfolio. The app keeps the UI in Turkish, stores data on-device first, and can optionally sync a signed-in user's snapshot through Firebase.

> Data is local by default. Native builds use `expo-sqlite`; web uses AsyncStorage. Firebase Auth/Firestore are optional and enabled only when the `EXPO_PUBLIC_FIREBASE_*` environment variables are present.

## Features

- **Expenses:** track fixed recurring costs such as rent, software, streaming, phone, and utilities.
- **Expense analytics:** monthly/yearly totals, active subscription count, upcoming payments, category breakdowns, price history, and review prompts.
- **Import/export:** back up or move expense data with JSON export/import.
- **Portfolio:** track BIST, US, and commodity holdings with quantity, cost basis, notes, and latest fetched price.
- **Portfolio analytics:** total cost, current value, all-time gain/loss, and daily movement when quote data is available.
- **Market-aware quotes:** skip closed markets, keep BIST prices 15 minutes delayed, and avoid repeated Yahoo rate-limit hits.
- **Currency support:** TRY/USD base currency settings with manual USD to TRY conversion.
- **Auth and sync:** Firebase-backed email/password sessions when configured, guest mode otherwise, and best-effort cross-device cloud sync for signed-in users.
- **Theme support:** dark/light mode through app settings.

## Tech Stack

React Native + Expo SDK 51, Expo Router, TypeScript, Zustand, NativeWind, Jest (`jest-expo`), `expo-sqlite`, AsyncStorage, Firebase, `react-native-gifted-charts`, `date-fns`, and Expo vector icons.

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Expo Go, Android emulator, or iOS simulator

### Install

```bash
npm install
```

If Expo reports native package mismatches:

```bash
npx expo install --fix
```

### Run Locally

```bash
npm start
npm run android
npm run ios
npm run web
npm run proxy
```

`npm start` opens the Expo dev server. Use the platform-specific commands when you want Expo to launch a target directly. `npm run web` starts both Expo web and the local CORS proxy sidecar; `npm run proxy` runs only that proxy on port `8788`.

### Test and Validate

```bash
npm test
npx tsc --noEmit
npm run lint
```

Unit tests cover pure analytics logic under `lib/__tests__/`.

## Project Structure

```text
app/
  _layout.tsx            Root layout, bootstrap, auth gate
  (tabs)/                Main tab screens
  expense/               Expense create/edit routes
  portfolio/             Portfolio create/edit routes
  auth/                  Local sign-in flow
components/
  ui/                    Shared UI primitives
  *.tsx                  Feature components
lib/
  db.ts                  Platform-aware data access
  db.sqlite.ts           Native SQLite implementation
  dbWeb.ts               Web AsyncStorage implementation
  cloudSync.ts           Optional Firebase snapshot sync
  firebase.ts            Lazy Firebase Auth/Firestore bootstrap
  marketHours.ts         Quote refresh market-window checks
  priceDelay.ts          BIST 15-minute delayed display cache
  proxyUrl.ts            Web quote/FX proxy routing
  expenseAnalytics.ts    Pure expense calculations
  portfolioAnalytics.ts  Pure portfolio calculations
  stockPrices.ts         Best-effort quote fetching
  strings.ts             Turkish UI copy
  __tests__/             Jest tests for pure logic
store/                   Zustand stores
scripts/
  cors-proxy.js          Local dev CORS proxy for web quote/FX calls
workers/
  quote-proxy.js         Deployable Cloudflare Worker proxy twin
```

## Storage Model

| Data | Native | Web | Store/module |
| --- | --- | --- | --- |
| Expenses | SQLite `expenses` | AsyncStorage | `useExpenseStore` |
| Holdings | SQLite `holdings` | AsyncStorage | `usePortfolioStore` |
| Holding transactions | SQLite `holding_transactions` | AsyncStorage | `usePortfolioStore` |
| BIST price snapshots | SQLite `price_snapshots` | AsyncStorage | `lib/priceDelay.ts` |
| Settings | AsyncStorage | AsyncStorage | `useSettingsStore` |
| Local auth | AsyncStorage | AsyncStorage | `useAuthStore` |
| Cloud sync snapshot | Firestore `users/{uid}` | Firestore `users/{uid}` | `lib/cloudSync.ts` |

## Notes

- Quote fetching uses Yahoo Finance public chart endpoints through best-effort requests. On web, quote and FX requests route through `viaProxy()`: local development uses `scripts/cors-proxy.js`; production web builds can set `EXPO_PUBLIC_QUOTE_PROXY_URL` to a deployed `workers/quote-proxy.js` URL.
- Cloud sync stores one backup-shaped Firestore document per signed-in, non-guest user. Local SQLite/AsyncStorage remain the source of truth on each device, and conflicts are reconciled as last-write-wins snapshots with a first-sync merge.
- User-facing text should live in `lib/strings.ts`.
- Missing Firebase config should keep the app usable in guest/local mode.
- To reset local demo data, use the Settings screen. The `reset-db` script only prints that reminder.

## Contributor Guide

See `AGENTS.md` for repository guidelines, commands, testing expectations, and PR notes.
