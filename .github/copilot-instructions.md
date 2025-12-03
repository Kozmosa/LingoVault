# LingoVault Agent Guide

## Architecture
- Single-page React app bootstrapped by Vite; entry at [index.tsx](../index.tsx) mounts [App.tsx](../App.tsx) with StrictMode.
- Core UI lives in [App.tsx](../App.tsx) combining word CRUD, AI enrichment, import/export, theming, and localization.
- Reusable UI sits under [components](../components) (word grid, settings modal) and service logic under [services](../services) for AI integrations.
- Desktop packaging uses Tauri with minimal Rust surface in [src-tauri/src/lib.rs](../src-tauri/src/lib.rs) and config in [src-tauri/tauri.conf.json](../src-tauri/tauri.conf.json).

## State & Persistence
- Word data persists in localStorage key `lingovault_data`; settings and theme use `lingovault_settings` and `lingovault_theme` (see [App.tsx](../App.tsx)).
- New words require `english` and auto-generate `id` via `crypto.randomUUID`; keep shape aligned with [types.ts](../types.ts).
- `filteredWords` memo filters on English, Chinese, and example text; consider performance if adding heavy transforms (see [App.tsx](../App.tsx)).

## AI Integration
- `enhanceWord` in [services/aiService.ts](../services/aiService.ts) routes to Gemini, OpenAI-compatible, or Anthropic providers based on [AISettings](../types.ts).
- GEMINI keys flow from Vite env via `GEMINI_API_KEY`; `vite.config.ts` injects values into `process.env` for browser usage.
- Non-Gemini providers require explicit `apiKey` and optional `baseUrl`; respect JSON-only responses or parsing will throw.
- When enhancing multiple entries, loops are sequential with `await` to avoid rate limits; preserve structure in new bulk actions (see [App.tsx](../App.tsx)).

## Localization & UI
- i18n resources live in [i18n.ts](../i18n.ts); any new user-facing copy must add both `en` and `zh` keys and reuse `t('key')` in components.
- Tailwind (dark mode via class) styles apply through [index.css](../index.css) and `tailwind.config.ts`; include new files in `content` array if you add directories.
- Theme toggling cycles light/dark/system using `matchMedia`; ensure DOM updates happen through `setTheme` helper (see [App.tsx](../App.tsx)).
- Word cards support Web Speech API TTS (see [components/WordList.tsx](../components/WordList.tsx)); maintain browser-safety guards if extending audio features.

## Data Import/Export
- CSV/JSON import merges on unique `id`, skipping duplicates; review [utils/csvHelper.ts](../utils/csvHelper.ts) before changing schemas.
- CSV parser manually handles quoted fields; keep compatibility if adding columns by updating header lookups and serialization order.
- Download helpers trigger anchor click; ensure browser-only APIs stay behind guards if adding Tauri-specific paths.

## Workflows
- Install deps and run web app with `npm install` then `npm run dev`; Vite serves on port 5173 per [vite.config.ts](../vite.config.ts).
- Desktop builds use `npm run tauri:dev` for live preview and `npm run tauri:build` for packaging; config triggers web build beforehand.
- No automated tests exist; manual verification focuses on word CRUD, AI fills, import/export, and localization toggles.

## Conventions & Gotchas
- Avoid direct `fetch` calls for AI features outside `services/aiService.ts` to keep provider-specific handling centralized.
- `services/geminiService.ts` is deprecated; delete only after ensuring no legacy imports remain.
- Keep animations in sync with `ANIMATION_DURATION` when modifying [components/SettingsModal.tsx](../components/SettingsModal.tsx); modal uses render gates for exit transitions.
- Preserve localStorage schema to avoid corrupting existing user data; migrate with guards before mutating stored shapes.

## Extending the App
- New settings should extend [AISettings](types.ts#L17-L29) and surface via [components/SettingsModal.tsx](components/SettingsModal.tsx) with translation updates.
- For new views, prefer colocating state in [App.tsx](App.tsx) and passing props downward; shared logic belongs in `utils/` or custom hooks.
- When adding icons, rely on `lucide-react` for consistency and import only what you use to keep bundle size in check.
