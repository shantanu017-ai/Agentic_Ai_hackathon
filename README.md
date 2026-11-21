# Praxis

An adaptive exam-prep tutor with a learner model, built as a static React SPA for Qoder Sites.

Praxis opens on Class 10 Physics, maps the syllabus as a prerequisite concept graph, and updates a topic-and-concept mastery estimate after every answer. Wrong distractors carry authored reasoning gaps, so feedback can name the misconception and ask a Socratic question before revealing the solution. Recall is scheduled with a small FSRS-inspired scheduler, and a separate teacher view shows class-wide gaps.

## Demo accounts

Accounts are first-party and local to the browser. Passwords are hashed with PBKDF2-SHA-256 (150,000 iterations) via WebCrypto.

| Role | Username | Password |
| --- | --- | --- |
| Student | `student` | `praxis-student` |
| Teacher | `teacher` | `praxis-teacher` |

The student account opens a seeded profile with attempts, a review queue, and weak concepts. New accounts go through a five-question placement. Accounts and profiles use `localStorage`; this is a demonstration gate, not a server-enforced security boundary. Each device has its own accounts and learner history.

## What is implemented

- **Diagnostic placement** — one item per topic, no feedback, seeds topic and concept estimates.
- **Concept graph** — Class 10 Physics with five topics and prerequisite edges, rendered as layered nodes; SAT Math and AP Physics 1 also carry topic graphs. Every question maps to a knowledge component.
- **Learner model** — Elo-style topic mastery plus knowledge-component mastery, with an evidence-aware update step (larger moves while evidence is thin), confidence labels, and a reduced gain for hint-supported answers.
- **Targeted questions** — prerequisite gates are enforced during adaptive selection, then the weakest concept in the weakest topic drives difficulty bands (below 30, 30–69, 70+); recently seen items are recycled last.
- **Misconception detection** — all 30 Class 10 items carry a written misconception for every wrong distractor; an attempt records the selected distractor, and feedback reveals a reasoning probe before the worked explanation.
- **Spaced repetition** — per-topic ease, interval, lapse count, and due date; the queue shows current recall likelihood, and repeatedly lapsed topics are flagged for reteaching.
- **Teacher dashboard** — seeded 24-student cohort clearly labelled as demo data: topic mastery chart, check-in list, concept-gap heat map, misconception hot spots, at-risk list, and a drafted reteach plan.
- **Session review** — score, mastery movement, scheduled reviews, and the reasoning gaps logged in that session.
- **Data ownership and polish** — one-click learner-data export, keyboard shortcuts in practice (`1–4`, `H`, `Enter`, `R`), route-level code splitting, per-route titles, a 404 page, and an error boundary.

There are 84 curated items across Class 10 Physics (30), SAT Math (30), and AP Physics 1 (24).

## Research basis

| Source | What Praxis takes from it |
| --- | --- |
| [Deep Knowledge Tracing](https://arxiv.org/abs/1506.05908) — Piech et al., NeurIPS 2015 | Responses are evidence about a hidden knowledge state; estimate per concept instead of one chapter score. |
| [FSRS](https://github.com/open-spaced-repetition/fsrs4anki) — Ye, 2022 | Stability/difficulty-flavoured scheduling with ease, expanding intervals, and lapses. Praxis uses a smaller deterministic approximation, not the full trained FSRS model. |
| [Socratic tutoring](https://arxiv.org/abs/2407.17349) — Ding et al., 2024; [SocraticLM](https://arxiv.org/html/2409.05511v1) — 2024 | Prefer guiding questions over immediate answers; name a likely gap, offer a nudge, then reveal the solution. |
| [CAT / IRT survey](https://arxiv.org/html/2404.00712v4) — Wang et al., 2024 | Short diagnostics and ability-targeted item selection. Praxis uses an Elo-style approximation rather than a calibrated IRT bank. |

## Deliberate deviations from the original master prompt

- This is a static SPA on Qoder Sites. There is no monorepo server, Clerk, Firestore, or OpenAI call. Generated items and a hosted identity/data layer are not available at runtime.
- Questions and explanations are authored and deterministic; the adaptive, diagnostic, misconception, and scheduling logic is real and runs locally.
- Authentication is local PBKDF2, with demo accounts seeded on first load. It is not a production auth boundary.
- The scheduler is FSRS-inspired rather than the exact `×2.5 / reset to 1` rule from the prompt. Correct recall widens the interval; a lapse narrows it and schedules an early review.
- Lenis is used on the landing page; Framer Motion handles UI state transitions. GSAP and ScrollTrigger are landing-only.

A hosted production version could replace the curated bank with generated items and move accounts/profiles to a server without changing the learner model or UI contracts.

## Commands

```bash
npm install
npm run dev      # http://127.0.0.1:5173
npm run build    # typecheck + production build into dist/
npm run preview
```

## Structure

```
lib/
  questions.ts      tracks, topics, items, concept helpers
  class10.ts        Class 10 Physics syllabus, KCs, misconceptions
  learner.ts        mastery model, attempts, reviews, selection, demo profile
  auth.ts           PBKDF2 accounts and local sessions
  classroom.ts      seeded teacher cohort and class analytics
src/
  contexts/         AuthProvider and LearnerProvider
  components/       Landing, Login, Dashboard, Practice, SessionSummary,
                    ConceptGraph, TeacherDashboard, Placement, shell
  pages/            routed page and guard wrappers
```

## Limitations

- The teacher class is seeded demo data, not real student records.
- The bank is deliberately small; recalibration would be needed for broad curriculum coverage.
- SAT and AP items carry concept-level knowledge components, but only the Class 10 bank has authored distractor-level misconceptions.
- Local accounts do not sync across devices and can be cleared with browser storage.
- SAT and AP are trademarks of the College Board; this project is not affiliated with or endorsed by it.
