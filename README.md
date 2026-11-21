# Praxis

An agentic exam-prep tutor with a learner model, built as a React SPA with a server-side AI agent.

Praxis opens on Class 10 Physics, maps the syllabus as a prerequisite concept graph, and updates a topic-and-concept mastery estimate after every answer. Wrong distractors carry authored reasoning gaps, so feedback can name the misconception and ask a Socratic question before revealing the solution. Recall is scheduled with a small FSRS-inspired scheduler.

On top of that model sits an agent loop: an **AI agent** reads a de-identified learner snapshot and proposes a typed study plan; a **deterministic verifier** checks prerequisite gates, time budget, known topics/concepts, and bank coverage before a single question is served. The same loop powers a session debrief and a teacher reteach plan. If the cloud agent is unavailable, a local planner fills the same typed contract and the interface labels the source.

## Demo accounts

Accounts are first-party and local to the browser. Passwords are hashed with PBKDF2-SHA-256 (150,000 iterations) via WebCrypto.

| Role | Username | Password |
| --- | --- | --- |
| Student | `student` | `praxis-student` |
| Teacher | `teacher` | `praxis-teacher` |

The student account opens a seeded profile with attempts, a review queue, and weak concepts. New accounts go through a five-question placement. Accounts and profiles use `localStorage`; this is a demonstration gate, not a server-enforced security boundary. Each device has its own accounts and learner history.

## The agent loop

1. **Observe** — fixed, auditable reads turn the learner model into a small snapshot: mastery bands, prerequisite gates, recall risk, due reviews, and available items. No names, passwords, or raw question text are included.
2. **Plan** — the browser posts `{task, evidence}` to a same-origin Sites Function (`/functions/v1/app?action=plan`). The Function creates an AI agent session, sends one `user.message`, and polls the event list for the final text. The agent returns strict JSON only.
3. **Verify** — the client validates the JSON with zod, then runs a deterministic verifier:
   - every `topicId`/`kcId` exists in the current track;
   - prerequisite-gate topics are respected;
   - planned minutes stay inside the requested budget (and ≤ 20 for reteach);
   - each block has a bank-backed topic and at least one concept;
   - the reteach plan cites class evidence.
   Plans that fail are repaired where possible (dropped blocks, pruned concepts, clamped minutes) and rejected otherwise. Every check and repair is shown in the UI trace.

Tasks: `study` (student dashboard), `reflect` (session summary), `reteach` (teacher dashboard).

### Trust boundaries

- The agent token is a platform-managed Secret read only by the Function and never exposed to the browser. It is never embedded in the bundle or returned in a response.
- The Function applies a body-size cap, a per-client rate limit, task-specific evidence validation, and a 45-second reply budget. It returns safe error codes, never raw upstream payloads or credentials.
- The client sends only aggregates (mastery values, deltas, counts). Answers, free text, names, and passwords stay in the browser.
- Agent output is treated as untrusted data: parsed, schema-checked, verified, and rendered as text.

### Fallback behaviour

If the deployment has no agent token, is rate-limited, times out, or the model returns something invalid, the UI shows the local planner and says why. The local planner is deterministic and subject to the same verifier, so the feature is never a blank screen — and never pretends a live call happened.

## What is implemented

- **Diagnostic placement** — one item per topic, no feedback, seeds topic and concept estimates.
- **Concept graph** — Class 10 Physics with five topics and prerequisite edges, rendered as layered nodes; SAT Math and AP Physics 1 also carry topic graphs. Every question maps to a knowledge component.
- **Learner model** — Elo-style topic mastery plus knowledge-component mastery, with an evidence-aware update step (larger moves while evidence is thin), confidence labels, and a reduced gain for hint-supported answers.
- **Targeted questions** — prerequisite gates are enforced during adaptive selection, then the weakest concept in the weakest topic drives difficulty bands (below 30, 30–69, 70+); recently seen items are recycled last.
- **Misconception detection** — all 30 Class 10 items carry a written misconception for every wrong distractor; an attempt records the selected distractor, and feedback reveals a reasoning probe before the worked explanation.
- **Spaced repetition** — per-topic ease, interval, lapse count, and due date; the queue shows current recall likelihood, and repeatedly lapsed topics are flagged for reteaching.
- **Study agent** — budget and goal controls; instant local plan, then a live Cloud Agent plan if available. Plan mode walks the saved blocks one at a time, showing each block's intent and success criterion, and clears the plan when the session finishes.
- **Session debrief agent** — reviews the finished session's deltas and post-session mastery, then returns wins, gaps, a next move, and a review cue.
- **Teacher dashboard** — seeded 24-student cohort clearly labelled as demo data: topic mastery chart, check-in list, concept-gap heat map, misconception hot spots, at-risk list, and a reteach agent that ranks shared misconceptions, drafts a lesson sequence, and reports its verifier result.
- **Data ownership and polish** — one-click learner-data export, keyboard shortcuts in practice (`1–4`, `H`, `Enter`, `R`), route-level code splitting, per-route titles, a 404 page, and an error boundary.

There are 84 curated items across Class 10 Physics (30), SAT Math (30), and AP Physics 1 (24).

## Research basis

| Source | What Praxis takes from it |
| --- | --- |
| [Deep Knowledge Tracing](https://arxiv.org/abs/1506.05908) — Piech et al., NeurIPS 2015 | Responses are evidence about a hidden knowledge state; estimate per concept instead of one chapter score. |
| [FSRS](https://github.com/open-spaced-repetition/fsrs4anki) — Ye, 2022 | Stability/difficulty-flavoured scheduling with ease, expanding intervals, and lapses. Praxis uses a smaller deterministic approximation, not the full trained FSRS model. |
| [Socratic tutoring](https://arxiv.org/abs/2407.17349) — Ding et al., 2024; [SocraticLM](https://arxiv.org/html/2409.05511v1) — 2024 | Prefer guiding questions over immediate answers; name a likely gap, offer a nudge, then reveal the solution. |
| [CAT / IRT survey](https://arxiv.org/html/2404.00712v4) — Wang et al., 2024 | Short diagnostics and ability-targeted item selection. Praxis uses an Elo-style approximation rather than a calibrated IRT bank. |
| [ReAct](https://arxiv.org/abs/2210.03629) — Yao et al., ICLR 2023 | Interleave reasoning with actions. Praxis records tool reads, the agent proposal, and the verifier outcome as structured steps instead of exposing hidden chain-of-thought. |
| [Reflexion](https://arxiv.org/abs/2303.11366) — Shinn et al., NeurIPS 2023 | Convert feedback into a short written debrief. Praxis caps the agent debrief with a strict schema and keeps it on-device. |

## Deliberate deviations from the original master prompt

- This is a static SPA plus one server-side AI Function. There is no monorepo server, Clerk, Firestore, or direct OpenAI call.
- The cloud model is used for planning and reflection, not for authoring items or grading. Questions and explanations are authored; the adaptive, diagnostic, misconception, and scheduling logic is deterministic and runs locally.
- Authentication is local PBKDF2, with demo accounts seeded on first load. It is not a production auth boundary.
- Agent requests are one-shot JSON polling rather than streaming, because each task needs a single validated result. A streaming UI could be added without changing the contracts.
- The scheduler is FSRS-inspired rather than the exact `×2.5 / reset to 1` rule from the prompt. Correct recall widens the interval; a lapse narrows it and schedules an early review.
- Lenis is used on the landing page; Framer Motion handles UI state transitions. GSAP and ScrollTrigger are landing-only.

## Commands

```bash
npm install
npm run dev      # http://127.0.0.1:5173
npm run build    # typecheck + production build into dist/
npm run preview
npx tsc -p tsconfig.functions.json   # typecheck the Edge Function without Deno
```

The Function is packaged from `functions/` and exposed as `/functions/v1/app`. It expects the platform-provided agent token; without it, the app runs in honest fallback mode.

## Structure

```
functions/
  index.ts          Deno.serve entry point
  handler.ts        auth gate, rate limit, validation, Cloud Agent session + polling
  prompt.ts         system prompt and JSON contracts per task
  cloud-agents.mjs  cloud AI agent client (resource bootstrap, locking, requests)
lib/
  questions.ts      tracks, topics, items, concept helpers
  class10.ts        Class 10 Physics syllabus, KCs, misconceptions
  learner.ts        mastery model, attempts, reviews, selection, demo profile
  agent.ts          snapshots, typed plan schemas, verifier, local planners, memory
  agentClient.ts    same-origin request helper and fallback copy
  auth.ts           PBKDF2 accounts and local sessions
  classroom.ts      seeded teacher cohort and class analytics
src/
  contexts/         AuthProvider and LearnerProvider
  components/       Landing, Login, Dashboard, StudyAgent, Practice, SessionSummary,
                    AgentTrace, ConceptGraph, TeacherDashboard, ReteachAgent, shell
  pages/            routed page and guard wrappers
```

## Limitations

- The teacher class is seeded demo data, not real student records.
- Agent quality depends on the deployed model; the verifier guarantees structural soundness (ids, gates, budget, coverage), not pedagogical perfection.
- Plans are generated on demand, so a slow cloud agent or an exhausted rate limit falls back to the local planner.
- The bank is deliberately small; recalibration would be needed for broad curriculum coverage.
- SAT and AP items carry concept-level knowledge components, but only the Class 10 bank has authored distractor-level misconceptions.
- Local accounts do not sync across devices and can be cleared with browser storage.
- SAT and AP are trademarks of the College Board; this project is not affiliated with or endorsed by it.
