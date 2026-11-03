# VolleyAdda product & build guide

Reference for the multi-tenant reshape. Use this to plan phases and **verify** behaviour during implementation.  
Locked from product discussion (Nov 2026). Prefer this over older “single active season / global Admin PIN” assumptions.

**Delivery order:** mobile first → web mirrors mobile (including home CTAs; web also keeps spectator / projector use).

---

## 1. Product north star

- The app starts **empty**: no default tournament, no seeded season the user must inherit.
- A signed-in user chooses how to use the app:
  1. **Practice** — score / watch friendly matches globally.
  2. **Create tournament** — organise a full event (optional stages).
- CricHeros-like split: **individual/friendly match** ≈ Practice; **Add tournament** ≈ Create tournament with a dedicated tournament page.
- Official tournament scoring requires membership, invite, or a **per-tournament venue scorer PIN** (fallback for devices without accounts).
- UI wording: **Organiser** (not “Admin”) everywhere in product copy.

---

## 2. Domain models (verify against these)

### 2.1 User (account)

| Field / concept | Notes |
|---|---|
| Identity | Email/password and/or Google (existing auth) |
| `emailVerified` | Required before create tournament / official score mutations |
| Superadmin | Env `SUPERADMIN_EMAILS` — platform override only; not tournament “Admin PIN” |

Signup does **not** choose Organiser/Scorer. Roles are **per tournament** (or practice host / invite).

### 2.2 Practice match (global)

| Concept | Decision |
|---|---|
| Scope | **Global** across the app — not tied to a tournament key |
| Visibility | Anyone can open and **watch** |
| Placement | **Practice** tab; also surface live practice on Home |
| Default scoring | **Host only** |
| Extra scorers | Host can **invite by email/link**; host can **revoke** (including mid-match) |
| Link to tournament | Later optional; until then only **practice host**. If linked later, that person may become tournament organiser |
| Promote → tournament match | **Later** — out of v1 reshape |

### 2.3 Tournament

| Concept | Decision |
|---|---|
| Create | Signed-in + verified email |
| Creator role | Automatically **organiser** |
| Minimum create | Allowed (name + required logo); finish setup later |
| Clone | **Yes** — clone prior season (teams/players/rules, clear scores) for faster setup |
| Logo | **Required** at create; organisers can change tournament logo later |
| Default visibility | **Link-only** until flipped to public |
| After create | Land on **public-style tournament page** with **“You’re organiser”** banner |
| Rosters | Teams need **rosters/players before fixtures** |
| Scoring gate | **Fixtures must exist** before tournament match scoring |
| Registration | Own wizard step; organiser can **stop registration before auction starts**; not left open after go-live into auction |

### 2.4 Tournament key & sharing (option D)

| Concept | Decision |
|---|---|
| Internal id | **Auto-generated** opaque key (not user-invented as primary identity) |
| Vanity slug | **Not in v1** |
| Share | All of: **URL**, **app deep link**, **QR**, plus short **public code** (verbal share) |
| Collision | If any human-facing code/slug is claimed later: **suggest alternatives** |
| Web + mobile | Same key / same share URLs |
| Global `activeKey` | Must not drive UX as “the” app season. Context = **user/device selected tournament** (or none) |
| No selection | Standings / Fixtures / Score show empty: pick or create a tournament |
| Practice | **Never** requires a tournament key |

### 2.5 Visibility & discovery

| Visibility | Browse public list | Search (name/dates) | Link / QR / code | My tournaments |
|---|---|---|---|---|
| **Public** | Yes | Yes | Yes | If created / invited / following |
| **Link-only** | **No** | **Yes** (search only, not listed in browse) | Yes | If created / invited |
| **Invited / created** | — | — | — | Always |

- Public tournaments: anyone can **watch**; score only if member or venue PIN.
- **Follow** (signed-in) on public tournaments → in-app notify when a **match goes live**.

### 2.6 Tournament stages

Pipeline (same order as today). **Every stage is optional / skippable** when the organiser doesn’t need it:

```
registration → auction → fixtures → matches → completed
```

- Auction may be skipped; if skipped, still require teams + rosters before fixtures.
- Organiser advances / skips via Organiser tools.

### 2.7 Tournament roles (membership)

| Role | Capabilities |
|---|---|
| **Organiser** | Full manage: settings, stages, invites, PIN, lock fixtures, logos, etc. Creator starts as organiser |
| **Scorer** | Score matches **and** edit fixtures; fixture edits send **in-app notification** to organisers |
| **Auctioneer** | Auction console actions (existing) |
| **Owner** (per team) | **Bid only** (auction). Kept for auction and general tournament model; no non-auction powers in this spec |
| **Follower** | Public tournaments: view tournament + matches; live notifications. Not scoring |

Invites: **email + invite link / QR** (not email-only).

### 2.8 Venue access (per tournament)

| Concept | Decision |
|---|---|
| Scorer PIN | **One** rotatable PIN per tournament |
| Where | Organiser → **Access** (PIN + invites + QR + share + fixture lock) |
| Use | Venue device: open Score, enter PIN, no account |
| Global Admin PIN | **Removed from product** — recognition is who created / who is organiser under that tournament login |
| Rotate / disable PIN | Organiser can anytime |

### 2.9 Fixture lock

- Organiser option: **lock fixtures** so scorers cannot edit.
- When unlocked, scorer edits → **in-app notify** organisers.

### 2.10 Notifications (v1, in-app)

| Event | Who |
|---|---|
| Invite received | Invitee |
| Practice goes live | Relevant parties (host / invited scorers; product may also surface on global live) |
| Followed tournament match goes live | Followers |
| Scorer edited fixtures | Organisers |

Email notifications: not required for v1 notify channel (in-app only), except existing auth verify/reset email flows.

---

## 3. Information architecture

### 3.1 Home

| User state | Home content |
|---|---|
| Guest | Two CTAs (Practice / Create tournament*) + global practice live + public browse. *Create requires sign-in |
| Signed in, **zero** tournaments | Everything above + clear two-path chooser + global practice |
| After **first** tournament | **Live** (tournament matches for my context **and** practice) + **My tournaments** |
| Created tournaments | **Picker on home** for self-created; enter **any** (created / invited / following) from My tournaments |

### 3.2 Scoring entry points (all three)

1. Home CTA (practice or into tournament score flow)
2. **Practice** tab / new practice
3. Inside a tournament → **Score**

### 3.3 Inside a tournament (tabs)

1. **Live**
2. **Fixtures**
3. **Table** (standings)
4. **Teams**
5. **Gallery** (uploads allowed before first match)
6. **Organiser** (only meaningful for organisers; others may see limited/read-only or hidden — implement consistently and verify)

### 3.4 Create tournament wizard

Order:

1. **Details** (name, logo **required**, dates, subtitle, visibility default link-only, clone option)
2. **Teams** (rosters/players)
3. **Registration** (own step; stoppable before auction)
4. **Rules**
5. **Fixtures**
6. **Invite staff**
7. **Go live**

Empty Score before fixtures: copy like **“Generate fixtures first”**.

---

## 4. Auth vs legacy PIN (implementation truth)

Server `/api/action` already prefers **session membership**, then **PIN**.

| Path | How scoring / manage works |
|---|---|
| Signed-in organiser / scorer | Bearer token; role from `TournamentMeta.members` |
| Venue device | Per-tournament scorer PIN → `x-pin` (product: tournament-scoped PIN, not env-global admin) |
| Practice | Host token and/or invited practice scorers — not tournament staff |

**Verify during build:** remove product dependence on env `ADMIN_PIN` for normal organiser flows; introduce/store **per-tournament scorer PIN**; keep env PIN only if needed as temporary bridge (document if any bridge remains).

---

## 5. Build phases (mobile → web)

Use each phase’s **Verify** checklist before starting the next.

### Progress summary (update after each phase)

| Phase | Status | What shipped |
|---|---|---|
| **0** Spec freeze | **Done** | `PRODUCT.md` accepted; inventory in `docs/PHASE0-INVENTORY.md` |
| **1** Home + tournament context | **Done** | `season: null` = no tournament (no registry `activeKey` fallback); home empty/guest/post-first states; Live strip (practice + tournament); My / created pickers; `LiveGate` / `NoTournamentSelected` |
| **2** Practice invites | **Done** | Global practice board; host-only default; `inviteScorer` / `revokeScorer` / `claimScorer`; Home live practice strip |
| **3** Create + keys + share | **Done** | Auto key `t-{hex}` + `publicCode`; logo required; clone; link-only default; create wizard shell; hub `/tournament/[key]` with organiser banner + URL/deep link/QR/code; `GET /api/tournaments/lookup` |
| **4** Tournament shell + Access | **Done** | Hub tabs (Live/Fixtures/Table/Teams/Gallery/Organiser); Access (venue scorer PIN, fixture lock, share); roster gate before fixtures; score “generate fixtures first”; scorer fixture edits → organiser notices |
| **5** Follow + notifications | **Done** | Follow/unfollow public tournaments; in-app inbox; emit invite / practice live / match live / fixture_edit |
| **6** Web parity | **Done** | Nullable season context; home chooser; tournament hub; create wizard; Access; follow/notices; practice invites; LiveGate |
| **7** Feature gaps port | **Done** | Race + auction live on mobile; auth verify/reset; host practice delete (no Admin PIN); watching + pressure ball |
| **8** Seed TNHVPL S5 | **Done** | `tnhvpl-s5` public, owned by annaraork1@gmail.com; `npm run seed:s5` |
| **9+** | — | Further product work TBD |

**Last completed:** Phase 8 (Nov 2026).

---

### Phase 0 — Spec freeze & inventory

- [x] This document reviewed and accepted
- [x] List current screens that assume global `activeKey` / staff PIN login → `docs/PHASE0-INVENTORY.md`
- [x] List APIs to extend: tournaments, membership, practice invites, presence/notifications, PIN storage

**Verify:** No implementation required; shared understanding with `PRODUCT.md`.

---

### Phase 1 — Home + tournament context (mobile)

**Build**

- [x] Empty / guest / signed-in-no-tournaments / post-first-tournament home states (§3.1)
- [x] Live strip: practice + relevant tournament live
- [x] My tournaments list; home picker for **created** tournaments
- [x] No-tournament-selected empty states for Standings / Fixtures / Score (`LiveGate` / `NoTournamentSelected`)
- [x] Selection stored per user/device; stop treating registry `activeKey` as the only season (`LiveContext`: null = no fetch)

**Verify**

- [ ] Fresh account sees chooser + practice, not a foreign season
- [ ] Guest cannot create tournament; can browse public + watch practice
- [ ] Selecting a tournament scopes Live/Fixtures/Table/Score to that key
- [ ] Clearing / having no selection shows empty “pick or create”

---

### Phase 2 — Practice global + host invites (mobile)

**Build**

- [x] Practice board as global watch surface (`/practice` + Home Live strip)
- [x] Host-only scoring default (create UI + `canScore` without public flag)
- [x] Invite scorer by email/link; revoke (incl. mid-match) — `inviteScorer` / `revokeScorer` / `claimScorer`
- [x] Home live practice strip (Practice tab remains primary list)

**Verify**

- [ ] Guest can open live practice and watch
- [ ] Non-host cannot score unless invited
- [ ] Revoke stops further score actions
- [ ] Practice works with **no** tournament selected

---

### Phase 3 — Create tournament + keys + share (mobile)

**Build**

- [x] Auto internal tournament key (option D) — `t-{hex}` via `newTournamentKey()`
- [x] Logo required; clone-from-past; default link-only
- [x] Wizard shell matching §3.4 (Details + stub steps + Go live)
- [x] Share: URL (`/s/{key}`), deep link, QR, short `publicCode`
- [x] After create → `/tournament/[key]` + “You’re organiser” banner
- [x] Registration open/closed at create; stop-before-auction via organiser registration tools

**Verify**

- [ ] Create without picking a slug still yields stable share targets
- [ ] Link-only not in public browse; findable via search + link/code (`/api/tournaments/lookup`)
- [ ] Public appears in browse + search
- [ ] Clone copies teams/players/rules, clears scores
- [ ] Unverified email blocked from create

---

### Phase 4 — Tournament shell tabs + Organiser Access (mobile)

**Build**

- [x] Tabs: Live, Fixtures, Table, Teams, Gallery, Organiser (`/tournament/[key]`)
- [x] Stages skippable: registration → auction → fixtures → matches → completed (Organiser stage chips + copy)
- [x] Rosters required before fixtures; fixtures required before score
- [x] Organiser → Access: invites (existing), share link, one scorer PIN (set/rotate/clear), fixture lock
- [x] Scorer: score + edit fixtures when unlocked; organiser notices on fixture edit (`organiserNotices`)
- [x] Team owner: bid only (unchanged auction owner PIN)
- [x] Gallery upload allowed before first match (hub Gallery tab → gallery)
- [x] Score empty state: generate fixtures first

**Verify**

- [ ] Skipping auction still blocks fixtures until rosters exist
- [ ] Venue PIN scores without login; wrong PIN fails
- [ ] Fixture lock blocks scorer edits
- [ ] Organiser wording (no “Admin” in UI)
- [ ] Owner cannot score via owner role alone

---

### Phase 5 — Follow + in-app notifications (mobile)

**Build**

- [x] Follow on public tournaments (`/api/follow`, Home + hub Follow/Unfollow)
- [x] Notify: invite, practice live, followed match live, fixture edits → organisers (`notifyStore`, `/api/notices`, drawer Notifications)

**Verify**

- [ ] Follower sees tournament/matches; cannot score
- [ ] Live notify fires for followers
- [ ] Invite appears in-app for invitee

---

### Phase 6 — Web parity

**Build**

- [x] Same home CTAs and empty states as mobile (`app/page.tsx`, nullable `LiveProvider` season)
- [x] Same tournament tabs / organiser access / practice global rules (`/tournament/[key]`, Access tab, practice invites)
- [x] Keep web strengths: projector, public live views (`/display`, auction projector unchanged)
- [x] Follow + notifications on web (`FollowButton`, `/notices`, nav Alerts)

**Verify**

- [ ] Same key/URL/code works on web and mobile (`/s/{key}` → hub)
- [ ] Guest/spectator paths unchanged in spirit (watch practice + public tournaments)

---

### Phase 7 — Gaps port (from earlier audit; after IA reshape)

Port only where still needed under new IA:

1. [x] Standings race calculator — mobile `/standings/race`
2. [x] Auction live viewer — mobile `/auction/live`
3. [x] Auth reset / verify / check-email — mobile `auth/*` screens
4. [x] Practice delete → host/superadmin only (no global Admin PIN)
5. [x] Tournament create clone + logo (Phase 3; confirmed both platforms)
6. [x] Watching + pressure ball on ScorerPad / match spectators

**Verify:** Each gap has a mobile path and does not reintroduce global Admin PIN.



### Phase 8 — Seed TNHVPL Season 5

**Answers:** owner `annaraork1@gmail.com`; clone with S5 naming; both local + production.

**Build**

- [x] `lib/seedTnhvplS5.ts`, `scripts/seed-tnhvpl-s5.mjs`, `npm run seed:s5`, `POST /api/admin/seed-s5` (superadmin)
- [x] Seeded Redis: key `tnhvpl-s5`, publicCode `XQU5MP`, public, organiser = annaraork1@gmail.com (cloned workflow from `demo`: 5 teams, 0 players, registration)
- [x] Production Vercel: set `KV_REST_API_*` + `REDIS_KEY_PREFIX` to the same store (redeploy required for env to apply)

**Verify**

- [ ] After prod redeploy: `/api/tournaments/lookup?key=tnhvpl-s5` returns Season 5
- [ ] Sign in as annaraork1@gmail.com → My tournaments shows Season 5
- [ ] `/s/tnhvpl-s5` and `/tournament/tnhvpl-s5` open on web + mobile
- [ ] Organiser Access / create flows work under that login

---


## 6. Explicit non-goals / later

| Item | Status |
|---|---|
| Promote practice match → tournament fixture | Later |
| Vanity slug / custom link claim | Not now |
| Email as primary notification channel for product events | Later (in-app first) |
| Global env Admin PIN as organiser identity | Abandoned for product |
| CricHeros-style community “looking for team/umpire” | Out of scope unless revisited |

---

## 7. Decision log (quick reference)

| # | Topic | Decision |
|---|---|---|
| 1 | Empty home | CTAs + practice + (guest) public |
| 2 | Guest | Practice + public browse; create needs auth |
| 3 | After first tournament | Live + My tournaments |
| 4–6 | Practice | Global, watchable, Practice tab + home live |
| 7 | Practice scoring | Host only + invite scorers |
| 8 | Practice → tournament | Later |
| 9–10 | Wizard / min create | Full order; min create OK |
| 11–13 | Clone / logo / visibility | Clone yes; logo required; default link-only |
| 14–15 | After create / tabs | Public-style + organiser banner; 6 tabs |
| 16 | Entry | My tournaments all; home picker for created |
| 17–20 | Discovery | Public browse+search; link-only search+link; invite link/QR; public watch / member score |
| 21–22 | Score entry / fixtures | Three entries; fixtures required |
| 23–25 | Venue PIN | One per tournament; Access screen; rotatable |
| 24 | Global Admin PIN | Not needed |
| 26–29 | Roles | Creator organiser; scorer+fixtures+notify; followers; owner bid-only |
| 30–35 | Keys | Auto id; URL+deep+QR+code; no vanity; same web/mobile; empty if none; practice keyless |
| 36–37 | Platform | Mobile then web; web same UX + projector |
| 38 | Stages | registration→auction→fixtures→matches→completed; all skippable |
| 38b | Rosters | Required before fixtures |
| 38c | Owner | Bid only |
| 39 | Registration | Own wizard step; stop before auction |
| 40 | Notifications | Invites + practice live (+ follow live, fixture edits) |
| 43–44 | Link-only search | Yes, search only (not browse list) |
| 45–46 | Practice invite | Email/link; revocable |
| 47–48 | Public code / vanity | Code yes; vanity not now |
| 49–52 | Follow / notify / lock | Follow yes; live notify; in-app; fixture lock yes |
| 53–54 | PIN UI | One scorer PIN; under Access |
| 55–56 | Registration timing | Own step; stop before auction; not open after go-live into auction |
| 57–58 | Empty score / gallery | Fixtures-first message; gallery early OK |
| 59–60 | Naming / practice host | Organiser; practice host until linked |
| 61 | Web | Same as mobile |

---

## 8. How to use this doc during PRs

1. Name the **phase** in the PR description.
2. Paste the phase **Verify** checklist with checkmarks.
3. If a behaviour isn’t listed here, **ask** before inventing — then amend this file.
4. Do not reintroduce: default seeded tournament for new users, global Admin PIN as primary organiser auth, user-typed key as sole identity without auto id.

---

*Last updated: Nov 2026 — product reshape lock-in.*
