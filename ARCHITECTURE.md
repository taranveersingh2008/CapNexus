# CAPACITY CONNECT — Architecture

Ministry of Earth Sciences · India Meteorological Department

```
┌────────────────────────────────────────────────────────────────────────┐
│  React SPA (Vite + TS + Tailwind)                                      │
│  pages/ · layouts/ · components/ · hooks/                              │
│                  │                                                     │
│            services/data.ts  ───── one async API, two adapters          │
│                  │                                                     │
│      ┌───────────┴────────────┐                                        │
│      ▼                        ▼                                        │
│  demo adapter             supabase adapter (same signatures)           │
│  src/lib/demo/*           src/lib/supabase.ts + queries                │
│  localStorage DB          PostgreSQL + RLS + Auth + Storage            │
└────────────────────────────────────────────────────────────────────────┘
```

## Frontend

- **Structure:** `src/{pages,layouts,components,hooks,lib,services,types,utils}`
- **Routing:** React Router 6. Route guards in `src/App.tsx` check the authenticated profile's role and redirect to the role's home (`/dashboard`, `/trainer/dashboard`, `/admin/dashboard`). Trainers/admins share the trainee's `/courses` and `/profile`.
- **Layout:** `DashboardLayout` renders a desktop sidebar, a mobile top bar with notification bell + search, and a mobile bottom navigation (intentional mobile design, not a shrunken desktop).
- **UI kit:** small reusable primitives in `src/components/ui.tsx` (cards, chips, stat cards, progress bars, modals, empty states, skeletons); charts in `src/components/charts.tsx` wrap Recharts with the dark theme.
- **State:** React context for auth (`useAuth`) and toasts (`useToast`); page data is fetched through the service layer with loading/empty/error states everywhere.

## Authentication

- **Production:** Supabase Auth (email/password). `auth.users` → `public.profiles` via the `on_auth_user_created` trigger which always creates a **TRAINEE** profile. Signup never accepts a role; trainer/admin privileges are granted only by an admin. Session persistence uses Supabase's local session; password reset uses Supabase's reset email flow (`/reset-password`).
- **Demo:** `services/auth.ts` validates against seeded profiles in the localStorage DB (password `demo1234`), stores the session id, and supports the same API: signup, login, logout, session restore, reset. Demo passwords exist only to make judging possible; production never stores passwords client-side.
- Role changes flow exclusively through `dataService.adminSetRole` (admin-only, mirrored by RLS). A user's own update policy in Postgres blocks changing `role`/`status` on their own row.

## Backend

Two interchangeable adapters behind one async service API (`src/services/data.ts`):

1. **Demo adapter** — `src/lib/demo/db.ts` implements a tiny in-memory + localStorage database with the same tables, joins and guards as the Postgres schema ("RLS mirror"), plus trigger-equivalents (auto `updated_at`, auto certificate on course completion, notification fan-out, activity log).
2. **Supabase adapter** — the same method signatures map to `supabase-js` queries. The client is created in `src/lib/supabase.ts` only when `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` are present, which flips the whole app to production mode with no UI changes.

All errors pass through `src/lib/errors.ts` (`toUserMessage`) so raw DB/network errors never reach the UI; toasts show human-readable messages.

## Database

24 tables (see `supabase/schema.sql`): profiles, competencies, profile_competencies, trainer_competencies, courses, course_modules, course_resources, enrollments, assessments, questions, assessment_attempts, certificates, feedback, notifications, announcements, trainer_matches, questionnaires, **cat_questions, cat_attempts, cat_answers, community_categories, community_posts, community_replies, community_reports**.

Key relationships:

- `profiles.id` = `auth.users.id` (1:1); `profiles.cat_completed_at` gates the onboarding CAT
- courses → trainer profile; modules/resources → course; questions → assessment → course
- enrollments are unique per (trainee, course); attempts store full answer JSON for adaptive review
- certificates unique per (trainee, course) with a human-readable certificate number
- indexes on questions(assessment_id), attempts(trainee_id), notifications(user_id, read)
- cat_questions indexed by (competency_id, difficulty) for adaptive serving; cat_answers → attempt → trainee
- community_posts carry `tags text[]` (GIN index), optional `course_id` link, `helpful uuid[]`; replies flag `is_answer`

## Storage

- **Production:** Supabase Storage bucket `course-materials` (policies in schema.sql: authenticated read, trainer/admin write, owner-only update/delete). Trainers upload lectures (MP4), PDFs, PPTs, DOCs and images per module.
- **Demo:** uploads become data-URLs inside the localStorage DB (`DemoFile`), served directly in the learning player; the `file:<id>` URL scheme is identical across adapters.

## Competency Engine

Transparent, rule-based (no AI claims — the UI says so):

```
score = 0.40 × assessment performance      (best attempts on courses mapped to the competency)
      + 0.25 × course completion           (mean progress of mapped courses)
      + 0.20 × trainer evaluation          (feedback ratings the trainee gave mapped courses; 50 if none)
      + 0.15 × profile evidence            (experience_years and interest overlap)
normalized to 0–100, blended with any prior level (exponential smoothing) so scores move
meaningfully but not erratically.
```

Recalculation (`refreshUserCompetencies`) runs after every attempt submission, resource completion and profile edit. Every competency row records its `source` for auditability.

## Assessment Engine

- Trainers create assessments (time limit, question count, deadline, adaptive toggle) and map each question to a competency with marks and difficulty (`Easy/Medium/Hard`).
- **Adaptive plan** (`buildAdaptivePlan`): starts at Medium; selects the next question at the stepped difficulty from the pool; the runner shows the difficulty trail and a prototype-level CAT disclaimer.
- On submit (`submitAttempt`): answers are graded, `percentage` stored, competency scores refreshed via the 40% assessment component, certificates evaluated, trainer notified. A full answer review (your answer vs correct) is shown at the end.

## CAT — Computer Adaptive Test (onboarding + retest)

Separate bank from course assessments (`cat_questions`), 54 seeded questions across 9 areas × 3 difficulties:

- **Gate:** `catOnboardingPending(profile)` — TRAINEE without `cat_completed_at` is redirected to `/onboarding` by the router. Trainers/admins are exempt.
- **Adaptation:** `catAreaOrder()` fixes the probe order (Meteorology → Forecasting → NWP → Radar → Satellite → Climate → Data → Python → Disaster). Each area serves `CAT_QUESTIONS_PER_AREA = 2` questions starting at **Medium**; `catStepDifficulty` steps up on correct, down on wrong; `catNextQuestion` never repeats a question and falls back across difficulty levels when a pool runs dry.
- **Scoring:** `catSubmitAttempt` computes per-area % = correct/answered, overall = mean of areas. ONBOARDING/RETEST attempts upsert `profile_competencies` (max of existing level, source `CAT`), then run `refreshUserCompetencies` + `persistTrainerMatches` — the exact same engines as regular assessments. `cat_completed_at` is stamped on ONBOARDING.
- **History:** `catMyAttempts` (ONBOARDING/RETEST only, newest first) + `catResultSummary` give the Initial → Current → Improvement storyline on `/cat/results/:attemptId`; PRACTICE attempts are excluded from history by design.

## Offline Mode (PWA)

- **Service worker** (`public/sw.js`): pre-caches the app shell; network-first for navigations with an offline fallback page, cache-first for static assets and a runtime cache for same-origin resources. Versioned cache names with cleanup on activate.
- **IndexedDB** (`src/lib/offline/store.ts`): two stores — `downloads` (course snapshots: course + modules + resources + completed-resource ids; assessment snapshots: assessment + adaptive plan) and `syncQueue` (`SyncOp` records). No credentials, tokens or keys are ever written.
- **Sync engine** (`src/lib/offline/sync.ts`): `queueActivity` enqueues ops (`RESOURCE_COMPLETE`, `ATTEMPT_SUBMIT`, `CAT_SUBMIT`, `COMMUNITY_POST`, `COMMUNITY_REPLY`); `syncNow` replays them oldest-first through the same service-layer functions used online (identical to Supabase writes in production), then emits status via `subscribeSync`. `initAutoSync` (main.tsx) drains the queue on the browser `online` event.
- **Offline-first UI:** `useOnline` + `useSyncState` power the 🟢/🔴 chip in the sidebar and dashboard ("Syncing… / Sync pending (N) / ✓ N activities synchronized"). Offline Manager (`/offline`) lists downloads, offers all published courses + offline-capable assessments, shows queue state, and supports manual "Sync now". Sessions never log out offline (demo session is local; Supabase sessions persist offline by design).

## Trainer Matching

`matchTrainers(traineeId)`:

1. Take the trainee's gap list (required − current per competency).
2. For each trainer, score overlap: `Σ gap_i × (proficiency_i/100 × 0.8 + min(years_i,20)/20 × 0.2)`.
3. Normalize to 0–100; attach human-readable reasons ("Specialises in Numerical Weather Prediction (87% match) · 14+ years of training & field experience").
4. Persist top matches to `trainer_matches` and notify the trainee once per new top match.

## Community

`community_categories` → `community_posts` → `community_replies`, with `community_reports` for moderation:

- **Posts** link to a category, optionally to a course (course pages surface related discussions), carry `tags text[]`, `resolved` + `resolved_reply_id`, `pinned`, `hidden` and a `helpful` user-id array.
- **Permissions** mirror RLS: trainees create/reply/search/report and resolve **their own** questions; trainers additionally pin and moderate; admins manage categories, the report queue and hard deletes. Helpful toggles only ever add/remove the caller's own id (service-layer enforced; RPC recommended in production).
- **Identification:** replies show the author's role badge — trainers render as "Name ✓ TRAINER". Resolving a reply notifies its author; replying notifies the question author (`COMMUNITY` notification type).
- Search filters title/body/tags; resolved threads remain fully searchable so the board doubles as an institutional knowledge base.

## Admin Analytics

Org-wide aggregation served from the same service layer:

- enrollment trend (6 months), completion by course, average scores by assessment
- competency gap heat map (mean current level vs required level per competency)
- trainer activity (trainees × courses), participation and certification counts
- feedback aggregation (avg rating per course) and platform activity feed

## Knowledge Archive (Wikipedia-style scientific portal)

Central scientific repository on the same seams as everything else:

- **Types** (`Knowledge*` in `src/types/index.ts`), **demo tables** (`knowledge_categories`, `knowledge_articles`, `knowledge_article_versions`, `knowledge_references`, `knowledge_bookmarks`, `knowledge_views` in the v3 DemoDB), **service** (`src/services/knowledge.ts`, spread into `dataService`), **pages** (`src/pages/knowledge/*`, admin page in `src/pages/admin/AdminKnowledge.tsx`).
- **Article body** = `sections: [{id, heading, body}]` JSON — the numbered Contents/TOC is derived, no HTML injection; paragraphs split on blank lines, `- ` bullets, plain-text equations (Z = 200·R^1.6).
- **Tags** are `text[]` on articles (mirrors community_posts, GIN-indexed) — no separate tag junction tables.
- **Competency link**: single `competency_id` on articles (mirrors courses) powers Related Courses, Related Knowledge on course pages, and gap-driven Recommended Knowledge on the trainee dashboard.
- **Workflow**: DRAFT → submit → PENDING_REVIEW → admin APPROVE (creates immutable version snapshot + version label) / REJECT (reason to author) → feature/archive/edit/delete in admin. Trainees create rows with `is_suggestion = true` — they can never publish.
- **Version history**: `knowledge_article_versions` stores title/summary/sections/tags/change_note/editor per approval; readers with author/admin rights can view any old version in full. Approve-as-minor → 1.1, as-major → 2.0.
- **Offline**: articles snapshot to the same IndexedDB downloads store (`article:<id>`, `type: 'article'`); the article page falls back to the saved copy when offline. Read-only offline — no new sync op kinds.
- **Community bridge**: "Discuss this topic" opens a prefilled post; related posts share article tags.

## Security model

- **RLS-first:** every table has policies (schema.sql). The demo adapter mirrors the same rules in code so behaviour is identical when judged offline.
- **Role changes:** only via admin UI → RLS-protected update; self-promotion impossible.
- **Publishing:** only admins publish/reject courses; trainers submit for review (PENDING). Same model for Knowledge: admins approve; trainee rows are suggestions only.
- **Secrets:** only the anon key reaches the browser; the service-role key is never used in this MVP.
