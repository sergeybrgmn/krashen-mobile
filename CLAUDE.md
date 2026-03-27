# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Krashen is an interactive podcast learning app built with React Native / Expo (SDK 54). Users browse podcasts, listen to episodes with real-time transcript display, tap words for explanations/translations, and ask spoken questions that get AI-generated answers.

The app is in early development. The target architecture is defined in `.code_plans/ios_app_spec.md`, which is the authoritative spec for all screens, APIs, components, and behaviors.

## Commands

```bash
npx expo start          # Start dev server (or: npm start)
npx expo start --ios    # Start on iOS simulator (or: npm run ios)
npx expo start --web    # Start web version (or: npm run web)
npm run lint            # ESLint via expo lint
```

No test framework is configured yet.

## Architecture

### Routing & Navigation

Uses **expo-router** with file-based routing. The `app/` directory defines routes:

- `app/_layout.tsx` — Root layout (Stack navigator with ThemeProvider)
- `app/(tabs)/_layout.tsx` — Tab navigator (Home, Explore tabs)
- `app/(tabs)/index.tsx` — Home screen
- `app/(tabs)/explore.tsx` — Explore screen
- `app/modal.tsx` — Modal screen

### Target App Structure (from spec)

Three screens to be built:
1. **Home** — Podcast browsing, language filter, episode selection
2. **Player** — Audio playback, transcript, voice questions, word explanations
3. **About** — Static markdown help page

### Key Conventions

- **Path alias**: `@/*` maps to project root (configured in `tsconfig.json`)
- **TypeScript**: Strict mode enabled, extends `expo/tsconfig.base`
- **Component naming**: kebab-case filenames (e.g., `themed-text.tsx`, `haptic-tab.tsx`)
- **Theme system**: `constants/theme.ts` exports `Colors` (light/dark) and `Fonts` (platform-specific font families)
- **Hooks**: Custom hooks in `hooks/` — `use-color-scheme`, `use-theme-color`
- **New Architecture**: Enabled (`newArchEnabled: true` in app.json)
- **React Compiler**: Enabled (`reactCompiler: true` experiment in app.json)
- **Typed Routes**: Enabled (`typedRoutes: true` experiment in app.json)

### Backend API

Base URL configurable via `EXPO_PUBLIC_API_BASE_URL` (default: `https://pregunta.app`). Endpoints:

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/podcasts` | No |
| GET | `/api/podcast/{id}/episodes` | No |
| GET | `/api/episode/{id}/data?target_language={lang}` | No |
| POST | `/api/ask` | Bearer JWT (Clerk) |

### Auth

Clerk via `@clerk/clerk-expo`. Key: `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`. Auth is required upfront before accessing any app content.

### Target Design

Dark mode only. Primary accent: `#06b6d4` (cyan). Secondary accent: `#f97316` (orange). See spec section 9 for full color palette and component sizing.
