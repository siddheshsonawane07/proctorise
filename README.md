# Proctorise

Online tests, checked fairly. Proctorise runs tests in the browser and watches for cheating with the
webcam and an optional phone camera, so a teacher can trust the result and a student can trust the
process. **The software notices things; a teacher decides.** Nothing fails or ends a test on its own.

**Live:** [proctorise.pages.dev](https://proctorise.pages.dev)

## What it does

**For teachers**

- Classes with join codes, co-teachers, and a roster with search, bulk extra time or removal, a
  record per student, and an export of students and marks.
- A question bank with five kinds of question: one correct answer, several, true or false, a short
  written answer, and a number.
- **Questions from your own AI.** Choose a board, class, subject and chapter (Maharashtra SSC class
  10 to start). Proctorise writes a prompt; paste it into Claude, ChatGPT or Gemini, paste the reply
  back, check every row, and save. No AI key, no cost.
- A test builder with proctoring presets (light, standard, strict), identity checks, a phone side
  camera, screen sharing, and spoken warnings.
- A live grid of every student, with warnings, extra time, ending an attempt, and a live camera view.
  Afterwards, a review queue of every flag with its picture.

**For students**

- Nothing to install: a system check, a photo to confirm it's you, then the test, in full screen.
- Answers save as you go; the server keeps the time, so a closed laptop still hands in on time.
- Warnings say what was noticed and what to do, on screen and read aloud.

**What is recorded:** still pictures at flagged moments and one at an interval, kept 7, 30 or 90 days.
No sound and no continuous video. See `/privacy` in the app.

## How it is built

| Part | Choice |
|---|---|
| App | React 19, TypeScript, Vite 8, React Router, Tailwind CSS 4, BoardUI components |
| Detection | MediaPipe face and object models in a web worker, Human for identity, all in the browser |
| Backend | Supabase (Postgres, Auth, Storage, Realtime); rules enforced by row-level security and SQL functions |
| Hosting | Cloudflare Pages, free plan |
| Tests | Vitest, pgTAP, Playwright (Chromium, WebKit, Firefox, phone emulation) under the production CSP |

## Run it locally

Needs Node 22 and Docker.

```bash
npm install
npm run db:start          # local Supabase on ports 553xx
npm run db:reset          # migrations and a demo class
npm run dev
```

Demo accounts (local only): `admin@demo.test` and `teacher@demo.test`, password `demo-password-123`;
join code `TRYME234`. Copy `.env.example` to `.env.local` with the values from `npx supabase status`.

## Checks

```bash
npm run typecheck && npm run lint && npm run format:check
npm test                  # unit tests
npm run build && npm run size    # first-load JS under 200 KB, and no purple
npm run db:test           # pgTAP
npx playwright test       # browser tests
```

## Author

Siddhesh Sonawane.
