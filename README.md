# CAPACITY CONNECT

**Digital Capacity Building & Learning Management Portal**
Ministry of Earth Sciences (MoES) · India Meteorological Department (IMD)

> A working Smart India Hackathon-style MVP: competency-driven learning with skill-gap detection, personalized course recommendations, trainer matching and adaptive assessments — fully functional out of the box in **demo mode**, with a complete Supabase backend ready when you are.

---

## 1. Project overview

Capacity Connect is a centralized portal for organizational training and competency development with three roles:

| Role | What they do |
|---|---|
| **Trainee** | Onboarding CAT, profile, courses, learning player, offline downloads, adaptive MCQ assessments, competency analysis, skill gaps, recommendations, trainer matching, certificates, feedback, notifications, community discussions |
| **Trainer** | Courses + modules + resource uploads (PDF/PPT/DOC/MP4/images), MCQ assessment builder with competency mapping, trainee participation & performance, questionnaires, community answering/pinning/moderation |
| **Admin** | User/role management, course approval & publishing, announcements, org-wide analytics, competency-gap heat maps, feedback monitoring, community moderation & reports |

The differentiator is **not** the course catalog — it's the competency engine:

```
Profile + Skills → CAT (Onboarding) → Competency Mapping
   → Skill Gap Detection → Course Recommendations → Trainer Matching
   → Learning (online or offline) → Assessments → Community Knowledge Sharing
   → Continuous Competency Improvement
```

### Three integrated subsystems

1. **CAT — Computer Adaptive Test** (`src/lib/engines.ts`, `src/pages/trainee/Cat*.tsx`): every new trainee is routed through an adaptive onboarding test on first login. All 9 competency areas are probed (Meteorology, Weather Forecasting, NWP, Radar, Satellite, Climate Data Analysis, Data Analysis, Python, Extreme Weather/Disaster). Each area starts at **Medium**; a correct answer steps the next question in that area **harder**, a wrong answer **easier**. Results become `profile_competencies` (source `CAT`) and feed the existing gap analysis, course recommendation and trainer matching engines unchanged. Retests keep history — the dashboard shows *Initial 68% → Current 79% (+11%)* style improvement. A **Simulation Lab** (`/practice`) runs the same engine in PRACTICE mode with no score impact.

2. **Offline Learning Mode (PWA)** (`src/lib/offline/*`, `public/sw.js`, `src/pages/trainee/OfflineManager.tsx`): hand-rolled service worker + Cache Storage for the app shell, **IndexedDB** for course/assessment snapshots and the sync queue. Trainees download courses (with PDFs/PPTs) and selected assessments; offline they can read materials, complete assessments and post to the community — all activity is queued locally and replayed automatically on reconnect ("Syncing… → ✓ N activities synchronized"). Online/offline indicator in the sidebar and dashboard; no logout when the network drops. **No credentials or keys are ever stored locally** — only content snapshots and queued activity.

3. **Capacity Connect Community** (`src/pages/community/*`): a professional discussion board (not social media) with 9 categories, tags, course linking, search, trainer \u2713 TRAINER identification, author-resolved marking, helpful reactions, trainer pinning, reporting and an admin moderation queue. Resolved threads stay searchable as an institutional knowledge base.

### Demo mode (zero setup)

The app ships with a complete **simulated backend** that mirrors the Supabase schema 1:1 and persists in `localStorage`:

- One-click demo logins for Trainee / Trainer / Admin on the landing page and login page
- Seeded with realistic IMD data: 12 users, 8 courses, modules, resources, assessments with mapped questions, enrollments, attempts, certificates, feedback, announcements, notifications, **54 CAT questions + 2 CAT attempts (68% → 79% improvement story)** and **12 community discussions with trainer answers**
- "Reset demo data" button in the sidebar restores the seed at any time
- Signup works in demo mode too — new accounts always start as TRAINEE and are routed through the CAT onboarding

### Demo accounts

| Role | Email | Password |
|---|---|---|
| Trainee | `trainee.anand@demo.gov.in` | `demo1234` |
| Trainer | `trainer.rahul@demo.gov.in` | `demo1234` |
| Admin | `admin@capacity.gov.in` | `demo1234` |

(All seeded trainees use the same password; emails follow `trainee.<name>@demo.gov.in`.)

## 2. Technology stack

- **Frontend:** React 18 + Vite 5 + TypeScript (strict) + Tailwind CSS 3 + Lucide React icons
- **PWA:** hand-rolled service worker (`public/sw.js`), web app manifest, Cache Storage + IndexedDB — no extra dependencies
- **Charts:** Recharts
- **Routing:** React Router 6 with role-based route guards
- **Backend (production):** Supabase — Auth, PostgreSQL, Row Level Security, Storage
- **Backend (demo):** simulated backend in `src/lib/demo/` with identical service signatures

## 3. Installation

```bash
npm install
```

No environment variables are required for demo mode.

## 4. Supabase setup (optional — for production mode)

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run `supabase/schema.sql` (tables, triggers, RLS, storage bucket).
3. Run `supabase/seed.sql` (competencies, sample courses, announcements).
4. Create demo users under **Authentication → Users** (`Add user`), then promote roles by email:

```sql
update public.profiles set role='ADMIN',  status='ACTIVE'  where email='admin@capacity.gov.in';
update public.profiles set role='TRAINER', status='ACTIVE' where email like 'trainer.%';
```

Every new signup gets a TRAINEE profile automatically via the `on_auth_user_created` trigger — self-promotion to trainer/admin is blocked by RLS (see §9).

## 5. Environment variables

Copy `.env.example` → `.env.local` and fill:

```
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon / publishable key>
```

- Only the **publishable (anon) key** belongs in the frontend. It is safe to expose because authorization is enforced by Row Level Security, not by the key.
- **Never** put the service-role key in `.env.local` or anywhere client-side. There are no server-side secrets in this MVP because all privileged logic runs behind RLS.

With no env vars set, the app automatically runs in demo mode (`src/lib/supabase.ts` detects configuration).

## 6. Running locally

```bash
npm run dev      # http://localhost:5173
npm run build    # production bundle in dist/
npm run preview  # serve the production build
```

## 7. Deployment

Any static host works. `vercel.json` is included for Vercel SPA routing:

```bash
npx vercel deploy
```

Remember to add the two `VITE_SUPABASE_*` vars in the Vercel project settings (only for production mode).

## 8. Demo accounts

See the table in §1. In demo mode the login page also has one-click buttons, and the landing page has "Trainee/Trainer/Admin demo" shortcuts.

## 9. Known limitations

- **Adaptive engine is a prototype**: transparent difficulty stepping (Medium → ±1 level per answer), explicitly labelled as such in the UI. No item-response-theory calibration.
- **Competency engine is rule-based**, not AI: 40% assessment performance + 25% course completion + 20% trainer evaluation (feedback proxy in the demo) + 15% profile evidence — the formula is shown to users.
- **Trainer matching** scores gaps against trainer competencies + experience with a transparent weighted formula.
- **File storage in demo mode** stores uploads as data-URLs in localStorage (size-limited). Production uses Supabase Storage (`course-materials` bucket).
- **Email verification/password reset**: real in Supabase mode (redirect handled); demo mode simulates confirmation.
- **Certificates** are records with unique numbers + printable page; PDF rendering is browser print-to-PDF.
- **No real payments/video CDN** — sample videos/pdfs are placeholders.
- Demo persistence is per-browser (localStorage). Use "Reset demo data" when switching machines before judging.
- **Offline downloads are device-local** (IndexedDB + Cache Storage). They don't roam between browsers/machines.
- **Service worker scope:** browsers register SW only on `localhost` or HTTPS. Offline install is best tested on a deployed build or `npm run preview`; the sync queue + IndexedDB work everywhere.
- **Community helpful reactions** are enforced field-safe in the service layer; in production route them through a SECURITY DEFINER RPC (note in schema.sql).
- **Knowledge Archive version labels** are major.minor strings ('1.0', '2.0') — approve-choices map minor → 1.1-style point release, major → next major. No diff rendering between versions (full snapshots only).
- **Knowledge references** are typed in by authors with an anti-fabrication notice; the portal does not auto-verify DOIs in the prototype.
- **Attachments/images in articles** are represented as link rows (URL field on references) in the prototype; binary attachments would use the existing `course-materials` storage bucket in production.

## 10. Security notes

- RLS policies on every table (see `supabase/schema.sql`): trainees can only read published courses and their own rows; trainers manage only their own courses/assessments; only admins change roles, publish courses and manage announcements.
- `profiles.role` cannot be changed by its owner (update policy blocks role/status mutation on self).
- Route guards mirror RLS on the client, but the database is the enforcement layer.
- No secrets in the client bundle; error messages are human-readable, never raw Postgres errors.
- **Offline storage stores no credentials** — only course/assessment snapshots, learning progress and queued activity. Auth tokens (production) stay in the platform session store, not IndexedDB.
