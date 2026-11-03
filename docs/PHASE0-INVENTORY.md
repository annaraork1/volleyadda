# Phase 0 inventory — Home + tournament context

See `PRODUCT.md` Phase 0 / Phase 1.

## Assumptions that fight the empty multi-tenant model

| Area | Current behaviour | Target |
|---|---|---|
| `LiveContext` | `season: null` → `/api/state` without `?season` → server **activeKey** | `null` = **no tournament selected**; do not fetch tournament state |
| Home “Use default” | Clears season so app falls back to registry activeKey | Replace with **Clear selection** / pick from My tournaments |
| `LiveGate` | Always loads until state exists (implies a season) | If no `season`, show pick/create empty state |
| Standings / Fixtures / Score / Teams tabs | Assume live state always | Empty when no tournament selected |
| Env `ADMIN_PIN` / Score PIN | Global staff PIN UX | Keep PIN field for now (Phase 4 → per-tournament); rename copy toward Organiser where easy |

## Screens touching season / LiveGate (mobile)

- `app/(main)/(tabs)/index.tsx` — Home
- `app/(main)/(tabs)/standings.tsx`, `fixtures.tsx`, `teams/index.tsx`
- `app/(main)/score/index.tsx`, `score/[id].tsx`, `match/[id].tsx`
- `app/(main)/admin/*`, `register.tsx`, `rules.tsx`, `awards.tsx`, `seasons.tsx`, `display.tsx`

## APIs already useful for Phase 1

- `GET /api/tournaments` — my tournaments (+ `role`)
- `GET /api/tournaments/public` — public browse
- `GET /api/practice` — global live practice (home strip)
- `GET /api/state?season=` — scoped state

## Deferred to later phases

- Auto tournament keys, share codes, wizard, follow, per-tournament PIN, practice invites, web parity
