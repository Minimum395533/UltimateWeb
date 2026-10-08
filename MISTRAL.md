# UltimateWeb environment guide for Mistral

This document describes the repository as it exists today. Treat the code and
`package.json` as the source of truth if this guide becomes outdated.

## What this project is

UltimateWeb is a browser-based, Smash-inspired game interface prototype. It is a
frontend-only React application. It currently provides menus and player setup
screens; it is not a playable fighting game and has no online service.

## Development environment

- Runtime: Node.js with npm.
- Framework: React 19 and TypeScript.
- Development/build tool: Vite 8.
- Routing: React Router.
- Dependencies are declared in `package.json` and pinned by `package-lock.json`.
- There is no application server, API, database, or external service configured.
- No app-specific environment variables are currently needed by the frontend.
  Never place secrets in client-side `VITE_*` variables; browser code is public.

### Start in Replit

The Replit web preview expects a server on port `5000`. Vite is configured to
listen on `0.0.0.0:5000` and allow the proxied preview host.

```sh
npm ci
npm run dev
```

The Replit workflow should run `npm run dev` and wait for port `5000`.

### Useful commands

```sh
npm run build   # Type-check and create the production bundle in dist/
npm run lint    # Run Oxlint
npm run preview # Preview an existing production build locally
```

For a clean local install, use `npm ci` so dependencies match the lockfile.

## Application map

- `src/main.tsx` — React browser entry point.
- `src/App.tsx` — routes and top-level app shell.
- `src/screens/` — start menu, local player setup, keybinds, settings, training,
  and online screens.
- `src/components/PlayerSelection.tsx` — local player setup interface.
- `src/hooks/useGameState.ts` — client-side game/menu state and persistence.
- `src/hooks/useInput.ts` — keyboard and gamepad input handling.
- `src/data/characters.ts` — character and color data.
- `src/types/` — shared TypeScript types and default keybinds.
- `src/styles/` and `src/*.css` — screen and global styles.
- `public/` and `src/assets/` — static and imported visual assets.

Routes are `/`, `/local`, `/keybinds`, `/settings`, `/training`, and `/online`.

## Current behavior and limits

- The start screen presents menu buttons. React Router routes are declared, but
  the buttons currently update local hook state instead of changing the URL, so
  clicking them does not navigate to the other screens.
- Local play supports player names, character/color selection, ready state, and
  setup controls. Starting a match does not launch gameplay yet.
- Keybinds and settings are frontend screens; persistent app state is stored in
  browser `localStorage` under `ultimateWebState`.
- Training and online screens are placeholders. Online matchmaking, networking,
  and game mechanics have not been implemented.
- There is no server-side persistence. Each browser profile has its own local
  state.

## Guidance for future changes

- Keep the existing React + TypeScript + Vite setup unless a requested feature
  requires changing it.
- Keep the lockfile in sync with any dependency changes.
- Preserve the Replit preview requirements: `0.0.0.0`, port `5000`, and Vite
  `allowedHosts: true`.
- Check whether behavior exists before describing it as implemented; do not
  present planned online/training/gameplay features as working.
- Run `npm run build` after code changes. Run `npm run lint` when the change
  touches code.
