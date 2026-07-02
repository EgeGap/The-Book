# Repository Guidelines

## Project Structure & Module Organization

This is an Expo Router React Native app. Route files live under `app/`: tab screens are in `app/(tabs)/`, modal/detail screens are in feature folders such as `app/portfolio/` and `app/expense/`, and global navigation setup is in `app/_layout.tsx`.

Reusable UI belongs in `components/`, with shared primitives in `components/ui/`. State is managed with Zustand stores in `store/`. Business logic, data access, analytics, constants, strings, and utilities live in `lib/`. Platform-specific persistence is split between `lib/db.sqlite.ts` for native and `lib/dbWeb.ts` for web, dispatched through `lib/db.ts`. Optional Firebase sync lives in `lib/cloudSync.ts`, quote proxy helpers live in `lib/proxyUrl.ts`, and tests live in `lib/__tests__/`.

## Build, Test, and Development Commands

- `npm start`: start the Expo development server.
- `npm run android`: launch the app through Expo on Android.
- `npm run ios`: launch the app through Expo on iOS.
- `npm run web`: run the web app locally with the CORS proxy sidecar.
- `npm run proxy`: run only the local quote/FX CORS proxy on port `8788`.
- `npm test`: run Jest once with `jest-expo`.
- `npm run test:watch`: run Jest in watch mode.
- `npm run lint`: run Expo lint checks.
- `npx tsc --noEmit`: type-check the TypeScript project.

## Coding Style & Naming Conventions

Use TypeScript and React function components. Keep route components named by their screen purpose, for example `PortfolioScreen`. Use PascalCase for components, camelCase for functions and variables, and `useXStore` for Zustand stores. Prefer colocating feature components in `components/` and pure calculations in `lib/*Analytics.ts`.

Use `S` from `lib/strings.ts` for user-facing Turkish text instead of hardcoding copy in components. Keep comments short and useful. Styling primarily uses NativeWind class names; follow existing spacing, color, and component patterns before introducing new abstractions.

## Testing Guidelines

Jest uses the `jest-expo` preset. Add tests under `lib/__tests__/` with the `*.test.ts` naming pattern, especially for pure functions in analytics, formatting, conversion, and data transformation modules. Run `npm test` and `npx tsc --noEmit` before submitting changes.

## Commit & Pull Request Guidelines

Recent commits use concise Conventional Commit style, such as `feat(expenses): ...` and `feat(analiz): ...`. Keep messages scoped and action-oriented.

Pull requests should include a short summary, test results, and screenshots or screen recordings for visible UI changes. Link related issues when available. Call out storage, migration, or platform-specific behavior changes, especially changes touching `lib/db.*`, Expo config, or quote-fetching logic.

## Security & Configuration Tips

Do not commit secrets or API keys. Firebase client identifiers belong in local `EXPO_PUBLIC_FIREBASE_*` environment variables when sync/auth is needed. Local app data is stored on-device through SQLite or AsyncStorage depending on platform, and signed-in users may sync a backup-shaped snapshot to Firestore. Treat public finance endpoints and CORS proxies as best-effort dependencies; failures should not break portfolio or expense workflows.
