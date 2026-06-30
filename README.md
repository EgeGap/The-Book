# Trading Journal

A local-first Expo React Native app for tracking recurring expenses and a simple investment portfolio. The app stores data on the device, keeps the UI in Turkish, and is designed to work without a backend.

> Data is local by default. Native builds use `expo-sqlite`; web uses AsyncStorage. Optional Firebase integration is stubbed in `lib/firebase.ts` and is off by default.

## Features

- **Expenses:** track fixed recurring costs such as rent, software, streaming, phone, and utilities.
- **Expense analytics:** monthly/yearly totals, active subscription count, upcoming payments, category breakdowns, price history, and review prompts.
- **Import/export:** back up or move expense data with JSON export/import.
- **Portfolio:** track BIST, US, and commodity holdings with quantity, cost basis, notes, and latest fetched price.
- **Portfolio analytics:** total cost, current value, all-time gain/loss, and daily movement when quote data is available.
- **Currency support:** TRY/USD base currency settings with manual USD to TRY conversion.
- **Local auth flow:** email/password and guest sessions are local-only.
- **Theme support:** dark/light mode through app settings.

## Tech Stack

React Native + Expo SDK 51, Expo Router, TypeScript, Zustand, NativeWind, Jest (`jest-expo`), `expo-sqlite`, AsyncStorage, `react-native-gifted-charts`, `date-fns`, and Expo vector icons.

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
```

`npm start` opens the Expo dev server. Use the platform-specific commands when you want Expo to launch a target directly.

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
  db.web.ts              Web AsyncStorage implementation
  expenseAnalytics.ts    Pure expense calculations
  portfolioAnalytics.ts  Pure portfolio calculations
  stockPrices.ts         Best-effort quote fetching
  strings.ts             Turkish UI copy
store/                   Zustand stores
```

## Storage Model

| Data | Native | Web | Store/module |
| --- | --- | --- | --- |
| Expenses | SQLite `expenses` | AsyncStorage | `useExpenseStore` |
| Holdings | SQLite `holdings` | AsyncStorage | `usePortfolioStore` |
| Settings | AsyncStorage | AsyncStorage | `useSettingsStore` |
| Local auth | AsyncStorage | AsyncStorage | `useAuthStore` |

## Notes

- Quote fetching uses Yahoo Finance public chart endpoints through best-effort requests. On web, CORS proxies may fail or rate-limit; the portfolio still works with manually entered cost basis and last known prices.
- User-facing text should live in `lib/strings.ts`.
- The local email/password flow is not a security boundary. Replace it with real Firebase Auth before using cloud accounts.
- To reset local demo data, use the Settings screen. The `reset-db` script only prints that reminder.

## Contributor Guide

See `AGENTS.md` for repository guidelines, commands, testing expectations, and PR notes.
