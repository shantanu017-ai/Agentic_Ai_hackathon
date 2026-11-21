import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight, Check, ChevronDown, ExternalLink } from "lucide-react";
import { OrbitMap } from "./OrbitMap";
import {
  QUESTIONS,
  TRACKS,
  countByDifficulty,
  kcLabel,
  questionsFor,
  type TrackId,
} from "@/lib/questions";
import { useAuth } from "../contexts/AuthContext";

gsap.registerPlugin(ScrollTrigger);

const sample = QUESTIONS.find((question) => question.id === "c10-light-03")!;

const bankFilters: { value: "all" | TrackId; label: string }[] = [
  { value: "all", label: "All tracks" },
  ...TRACKS.map((track) => ({ value: track.id, label: track.name })),
];

const research = [
  {
    n: "01",
    title: "Deep Knowledge Tracing",
    source: "Piech et al. · NeurIPS 2015",
    links: [{ label: "arXiv:1506.05908", href: "https://arxiv.org/abs/1506.05908" }],
    use: "Treats each response as evidence about a hidden knowledge state. Praxis borrows the idea of per-concept estimates instead of one chapter score.",
  },
  {
    n: "02",
    title: "Free Spaced Repetition Scheduler",
    source: "FSRS · Ye, 2022 · open-spaced-repetition",
    links: [
      {
        label: "fsrs4anki",
        href: "https://github.com/open-spaced-repetition/fsrs4anki",
      },
    ],
    use: "Models memory as stability and difficulty, then expands the review interval after successful recall. Praxis uses a smaller deterministic ease-and-interval approximation.",
  },
  {
    n: "03",
    title: "Socratic tutoring with LLMs",
    source: "Ding et al., 2024 · SocraticLM, 2024",
    links: [
      { label: "arXiv:2407.17349", href: "https://arxiv.org/abs/2407.17349" },
      {
        label: "SocraticLM",
        href: "https://arxiv.org/html/2409.05511v1",
      },
    ],
    use: "Shows the value of guiding questions over immediate answer-giving. On a miss, Praxis names a likely reasoning gap, offers a nudge, and asks the learner to test the model before revealing the solution.",
  },
  {
    n: "04",
    title: "Computerized adaptive testing with IRT",
    source: "Wang et al., 2024 · survey",
    links: [
      { label: "arXiv:2404.00712", href: "https://arxiv.org/html/2404.00712v4" },
    ],
    use: "Informs short diagnostics and item selection by estimated ability. Praxis uses a lightweight Elo-style approximation rather than a calibrated IRT bank, and says so.",
  },
  {
    n: "05",
    title: "ReAct: reasoning and acting",
    source: "Yao et al. · ICLR 2023",
    links: [{ label: "arXiv:2210.03629", href: "https://arxiv.org/abs/2210.03629" }],
    use: "Interleaves reasoning with actions. Praxis records the agent's tool reads, proposal, and verifier outcome as structured steps instead of exposing hidden chain-of-thought.",
  },
  {
    n: "06",
    title: "Reflexion: verbal self-reflection",
    source: "Shinn et al. · NeurIPS 2023",
    links: [{ label: "arXiv:2303.11366", href: "https://arxiv.org/abs/2303.11366" }],
    use: "Turns feedback into a short written debrief. Praxis ends each session with an agent debrief built from session deltas, capped by a strict schema and stored on this device.",
  },
];

const coverage = [
  ["Diagnostic test", "One placement item per topic seeds topic and concept mastery."],
  [
    "Concept graph for one syllabus",
    "Class 10 Physics with five topics and prerequisite edges; SAT and AP graphs are included.",
  ],
  [
    "Learner model after every answer",
    "Topic mastery plus knowledge-component mastery updates with a readable Elo rule.",
  ],
  [
    "Targeted questions with difficulty calibration",
    "Weak concept first; foundational below 30%, developing 30–69%, stretch 70+.",
  ],
  [
    "Misconception detection from reasoning",
    "Every wrong distractor carries a written reasoning gap; the tutor probes it with a Socratic follow-up.",
  ],
  [
    "Spaced-repetition scheduling",
    "FSRS-inspired ease, interval, lapse, and due-date state per topic; a due queue on the dashboard.",
  ],
  [
    "Teacher dashboard for class-wide gaps",
    "Demo cohort heat map, concept hot spots, at-risk list, and an agent-drafted reteach plan with a verifier report.",
  ],
  [
    "Agent-planned sessions",
    "A Qoder Cloud Agent turns a de-identified learner snapshot into a typed plan; the verifier checks gates, budget, concepts, and bank coverage before question one.",
  ],
  [
    "Agent session debrief",
    "The same loop reviews each finished session, names what moved and what to watch, and keeps the result in this browser.",
  ],
];

const bands = [
  {
    label: "Foundational",
    range: "1–29",
    description: "Rebuild the core idea with single-step items.",
  },
  {
    label: "Developing",
    range: "30–69",
    description: "Apply the idea in an unfamiliar context.",
  },
  {
    label: "Stretch",
    range: "70–99",
    description: "Combine ideas and hold up under pressure.",
  },
];

const problemPoints = [
  {
    n: "01",
    title: "Coverage feels like progress",
    body: "Rereading a chapter and redoing the easy set rehearses what you already know. The gaps stay invisible.",
  },
  {
    n: "02",
    title: "One difficulty for everyone",
    body: "Fixed question feeds ignore the difference between a shaky foundation and a topic that is nearly finished.",
  },
  {
    n: "03",
    title: "No memory between sessions",
    body: "Without a model, every session starts from zero. You cannot see whether yesterday's work moved anything.",
  },
];

const principles = [
  {
    n: "01",
    title: "Transparent by construction",
    body: "Every recommendation shows its reasoning. Mastery, difficulty, and review dates come from short rules you can inspect — not a black box.",
  },
  {
    n: "02",
    title: "Accounts, without a server",
    body: "Username and password accounts are hashed in your browser with PBKDF2. Each learner's maps and reviews stay on this device.",
  },
  {
    n: "03",
    title: "Feedback without judgment",
    body: "A miss names the likely reasoning gap, offers a nudge, and only then shows the solution. Wrong answers are information.",
  },
  {
    n: "04",
    title: "A finished, small thing",
    body: "A curated bank of 84 hand-levelled items across three syllabi, with Class 10 Physics built out as a full concept graph. Depth over an endless feed.",
  },
];

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function Landing() {
  const rootRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, demoSignIn } = useAuth();
  const [filter, setFilter] = useState<"all" | TrackId>("all");
  const [demoBusy, setDemoBusy] = useState(false);
  const [demoError, setDemoError] = useState("");

  const openDemo = async () => {
    setDemoBusy(true);
    setDemoError("");
    const result = await demoSignIn("student");
    setDemoBusy(false);
    if (result.ok) navigate("/dashboard");
    else setDemoError(result.error);
  };

  useEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion()) return;

    const lenis = new Lenis({
      autoRaf: false,
      duration: 1.05,
      smoothWheel: true,
    });

    const onScroll = () => ScrollTrigger.update();
    lenis.on("scroll", onScroll);

    const raf = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    const onAnchorClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement | null)?.closest?.(
        'a[href^="#"]',
      ) as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href === "#") return;
      const target = document.getElementById(href.slice(1));
      if (!target) return;
      event.preventDefault();
      lenis.scrollTo(target, { offset: -84, duration: 1.1 });
    };
    document.addEventListener("click", onAnchorClick);

    const context = gsap.context(() => {
      gsap.from("[data-hero]", {
        y: 26,
        opacity: 0,
        duration: 0.9,
        stagger: 0.09,
        ease: "power3.out",
        delay: 0.05,
      });
      gsap.from("[data-hero-visual]", {
        opacity: 0,
        scale: 0.975,
        duration: 1.2,
        ease: "power2.out",
        delay: 0.25,
      });

      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((element) => {
        gsap.from(element, {
          y: 28,
          opacity: 0,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: element,
            start: "top 90%",
            once: true,
          },
        });
      });
    }, root);

    return () => {
      context.revert();
      document.removeEventListener("click", onAnchorClick);
      gsap.ticker.remove(raf);
      lenis.destroy();
    };
  }, []);

  const visibleTracks =
    filter === "all" ? TRACKS : TRACKS.filter((track) => track.id === filter);

  return (
    <div ref={rootRef}>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="paper-grid pointer-events-none absolute inset-0 opacity-[0.35]" />
        <div className="site-container relative grid items-center gap-14 py-16 lg:grid-cols-[1.06fr_0.94fr] lg:gap-10 lg:py-24">
          <div>
            <p data-hero className="eyebrow text-brick">
              Agentic exam prep · Class 10 Physics
            </p>
            <h1 data-hero className="display-title mt-6 max-w-[11ch] text-ink">
              Study the gaps, not the whole book.
            </h1>
            <p
              data-hero
              className="mt-7 max-w-xl text-[1.075rem] leading-[1.7] text-ink-soft"
            >
              Praxis maps a Class 10 Physics syllabus concept by concept, updates
              your mastery after every answer, and chooses the next question at the
              edge of what you know. A Qoder Cloud Agent turns that model into a
              typed study plan, and a deterministic verifier checks every block
              before you start.
            </p>

            <div data-hero className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                to={
                  user
                    ? user.role === "teacher"
                      ? "/teacher"
                      : "/dashboard"
                    : "/login?mode=signup"
                }
                className="btn btn-primary"
              >
                {user
                  ? user.role === "teacher"
                    ? "Open class overview"
                    : "Open your dashboard"
                  : "Create your account"}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              {user ? (
                <a href="#model" className="btn btn-secondary">
                  How the model works
                </a>
              ) : (
                <button
                  type="button"
                  onClick={openDemo}
                  disabled={demoBusy}
                  className="btn btn-secondary disabled:opacity-60"
                >
                  {demoBusy ? "Opening demo…" : "Try the student demo"}
                </button>
              )}
            </div>
            {demoError && (
              <p role="alert" className="mt-3 text-sm text-brick">
                {demoError}
              </p>
            )}
            {!user && (
              <p className="mono-meta mt-3">
                or{" "}
                <Link
                  to="/login"
                  className="link-underline text-ink underline decoration-line"
                >
                  sign in
                </Link>{" "}
                with an existing account
              </p>
            )}

            <div
              data-hero
              className="mono-meta mt-9 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-5"
            >
              <span>Class 10 Physics · SAT Math · AP Physics 1</span>
              <span aria-hidden="true">/</span>
              <span>Username accounts · local-first</span>
              <span aria-hidden="true">/</span>
              <span>
                {user
                  ? `Signed in as @${user.username}`
                  : "About 3 minutes to a starting map"}
              </span>
            </div>
          </div>

          <div data-hero-visual className="relative">
            <OrbitMap />
            <p className="mono-meta mt-6 max-w-sm text-center lg:text-left">
              Each node is a topic. The ring around it shows estimated mastery.
              Your next question is chosen from the band that ring indicates.
            </p>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="border-t border-line">
        <div className="site-container py-20 md:py-24">
          <div data-reveal className="grid gap-6 md:grid-cols-[0.8fr_1.2fr]">
            <p className="eyebrow">The problem</p>
            <h2 className="section-title max-w-[20ch] text-ink">
              Most study tools measure activity, not understanding.
            </h2>
          </div>

          <div className="mt-14 grid gap-px overflow-hidden rounded-[var(--site-radius)] border border-line bg-line md:grid-cols-3">
            {problemPoints.map((point) => (
              <article
                key={point.n}
                data-reveal
                className="bg-paper p-7 md:p-8"
              >
                <p className="mono-meta">{point.n}</p>
                <h3 className="mt-7 font-serif text-[1.35rem] leading-snug text-ink">
                  {point.title}
                </h3>
                <p className="mt-3 text-[0.975rem] leading-[1.7] text-mutedink">
                  {point.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Model */}
      <section
        id="model"
        className="scroll-mt-24 border-t border-line bg-paper-deep"
      >
        <div className="site-container py-20 md:py-28">
          <div className="grid gap-12 lg:grid-cols-[0.78fr_1.22fr]">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <p data-reveal className="eyebrow text-brick">
                The learner model
              </p>
              <h2 data-reveal className="section-title mt-5 max-w-[13ch] text-ink">
                A small, honest model of what you know.
              </h2>
              <p
                data-reveal
                className="mt-6 max-w-md text-[1.025rem] leading-[1.75] text-ink-soft"
              >
                Praxis keeps one number per topic — a mastery estimate from 1 to
                99 — and a smaller estimate for every knowledge component inside
                it. Both move after every answer using a transparent, Elo-style
                rule, and every estimate carries an evidence count so a
                one-answer topic reads as low confidence rather than settled.
                No hidden score, no mystery feed.
              </p>
              <div
                data-reveal
                className="card mt-8 overflow-hidden bg-surface p-5"
              >
                <p className="eyebrow">The update rule</p>
                <pre className="mt-4 overflow-x-auto font-mono text-[11.5px] leading-[1.9] text-ink-soft">
                  {`expected = 1 / (1 + 10^((d - m) / 25))
next     = m + K × (outcome - expected)
K        = 26 → 20 → 16 as evidence grows
review   = f(last interval, ease, lapse)
recall   = exp(-ln2 × elapsed / interval)`}
                </pre>
                <p className="mono-meta mt-3">
                  d is item difficulty (25 / 50 / 75); m is mastery.
                </p>
              </div>
            </div>

            <div>
              <ol className="space-y-0">
                {[
                  {
                    n: "01",
                    title: "Observe",
                    body: "Each response is evidence. The model records correctness, item difficulty, hint use, and — if you miss — the exact distractor you chose.",
                  },
                  {
                    n: "02",
                    title: "Estimate",
                    body: "Topic and concept mastery move together, with larger steps while evidence is thin. Prerequisite gates and the weakest-concept band decide what to ask next: foundational, developing, or stretch.",
                  },
                  {
                    n: "03",
                    title: "Schedule",
                    body: "A confident recall widens the review interval; a lapse narrows it. The queue shows current recall likelihood and flags repeatedly lapsed topics for reteaching.",
                  },
                ].map((step) => (
                  <li
                    key={step.n}
                    data-reveal
                    className="grid gap-4 border-t border-line py-8 first:border-0 first:pt-0 md:grid-cols-[4rem_1fr]"
                  >
                    <p className="mono-meta pt-2">{step.n}</p>
                    <div>
                      <h3 className="font-serif text-[1.8rem] leading-tight text-ink">
                        {step.title}
                      </h3>
                      <p className="mt-3 max-w-xl text-[1rem] leading-[1.75] text-mutedink">
                        {step.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>

              <div data-reveal className="card mt-4 overflow-hidden">
                <div className="border-b border-line bg-brick-tint px-6 py-4">
                  <p className="eyebrow text-brick">Difficulty bands</p>
                </div>
                <div className="grid divide-y divide-[var(--site-border)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                  {bands.map((band) => (
                    <div key={band.label} className="p-6">
                      <p className="mono-meta">{band.range}</p>
                      <p className="mt-2 font-serif text-lg text-ink">
                        {band.label}
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-mutedink">
                        {band.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <p data-reveal className="mono-meta mt-5">
                The mastery model runs locally on a curated bank. The agent plans
                on top of it, and the verifier is the final gate. The model is
                real; the bank is deliberately small.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Agent loop */}
      <section
        id="agent"
        className="scroll-mt-24 border-t border-line bg-ink text-paper"
      >
        <div className="site-container py-20 md:py-24">
          <div data-reveal className="grid gap-6 md:grid-cols-[0.8fr_1.2fr]">
            <p className="eyebrow text-paper/60">The agent loop</p>
            <div>
              <h2 className="section-title max-w-[18ch] text-paper">
                An agent that plans. A verifier that says no.
              </h2>
              <p className="mt-5 max-w-2xl text-[1.025rem] leading-[1.75] text-paper/70">
                A Qoder Cloud Agent reads the evidence your answers produced —
                never your name, password, or raw question text — and proposes a
                typed study plan. Before a single question is served, a
                deterministic verifier checks prerequisite gates, the time budget,
                known concepts, and bank coverage. If the agent is slow or
                unavailable, a local planner fills the same contract and the
                interface labels which source you are seeing.
              </p>
            </div>
          </div>

          <div
            data-reveal
            className="mt-12 grid gap-px overflow-hidden rounded-[var(--site-radius)] border border-paper/15 bg-paper/15 md:grid-cols-3"
          >
            {[
              {
                n: "01",
                title: "Observe",
                body: "Fixed, auditable reads turn the learner model into a small snapshot: mastery bands, prerequisite gates, recall risk, and available items. The agent gets that snapshot, not your account.",
              },
              {
                n: "02",
                title: "Plan",
                body: "The Qoder Cloud Agent returns strict JSON: blocks with topics, concepts, minutes, intent, and a success criterion. No browsing, no tool use, no follow-up questions — one validated response.",
              },
              {
                n: "03",
                title: "Verify",
                body: "The browser rejects malformed plans, repairs what it can, and logs every check. A plan that cites an unknown concept or exceeds your budget never reaches the practice screen.",
              },
            ].map((step) => (
              <article key={step.n} className="bg-ink p-7 md:p-8">
                <p className="mono-meta text-paper/50">{step.n}</p>
                <h3 className="mt-6 font-serif text-[1.45rem] leading-snug text-paper">
                  {step.title}
                </h3>
                <p className="mt-3 text-[0.95rem] leading-[1.7] text-paper/65">
                  {step.body}
                </p>
              </article>
            ))}
          </div>

          <p data-reveal className="mono-meta mt-5 max-w-3xl text-paper/50">
            The same loop powers the session debrief and the teacher reteach plan.
            Requests go through a same-origin site Function; the Qoder token never
            reaches browser code, and session memory stays in this browser.
          </p>
        </div>
      </section>

      {/* Session */}
      <section id="session" className="scroll-mt-24 border-t border-line">
        <div className="site-container py-20 md:py-28">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p data-reveal className="eyebrow text-brick">
                Inside a session
              </p>
              <h2 data-reveal className="section-title mt-5 max-w-[14ch] text-ink">
                One question at a time, at the right level.
              </h2>
              <p
                data-reveal
                className="mt-6 max-w-md text-[1.025rem] leading-[1.75] text-ink-soft"
              >
                Every card carries its reason. If a question surprises you, open
                “Why this question?” and see the mastery state that produced it.
                Miss one and the feedback slows down: the likely reasoning gap
                first, a guiding question second, the full solution last.
              </p>

              <dl data-reveal className="mt-9 space-y-5">
                {[
                  [
                    "Selection",
                    "Weakest concept in the weakest topic, prerequisites first.",
                  ],
                  [
                    "Difficulty",
                    "Set by your current mastery band for that concept.",
                  ],
                  [
                    "Feedback",
                    "Misconception, Socratic nudge, explanation, and the next review date.",
                  ],
                ].map(([term, definition]) => (
                  <div key={term} className="border-t border-line pt-4">
                    <dt className="mono-meta">{term}</dt>
                    <dd className="mt-1.5 text-[0.95rem] leading-relaxed text-ink-soft">
                      {definition}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <div data-reveal>
              <div className="card overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-[1.4rem] py-4">
                  <span className="mono-meta">
                    Illustrative item · Class 10 Physics · Developing
                  </span>
                  <span className="mono-meta">Why this question? ↴</span>
                </div>
                <div className="p-[1.4rem] md:p-7">
                  <p className="font-serif text-[1.45rem] leading-snug text-ink md:text-[1.6rem]">
                    {sample.prompt}
                  </p>
                  <div className="mt-6 space-y-2.5">
                    {sample.choices.map((choice, index) => {
                      const correct = index === sample.answer;
                      return (
                        <div
                          key={choice}
                          className={`flex items-center justify-between gap-3 rounded-[var(--site-radius)] border px-4 py-3 text-[0.95rem] ${
                            correct
                              ? "border-sage bg-sage-tint text-ink"
                              : "border-line bg-paper text-mutedink"
                          }`}
                        >
                          <span>{choice}</span>
                          {correct && (
                            <span className="mono-meta flex items-center gap-1.5 text-sage">
                              Correct
                              <Check className="size-3.5" aria-hidden="true" />
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-6 rounded-[var(--site-radius)] border border-line bg-paper-deep p-5">
                    <p className="font-serif text-lg text-ink">
                      Correct. Light: reflection and refraction rose from 46% to
                      54%.
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-mutedink">
                      {sample.explanation}
                    </p>
                    <div className="mono-meta mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-3">
                      <span>Mastery 46 → 54</span>
                      <span>{kcLabel(sample.kc ?? sample.topicId)} 52 → 58</span>
                      <span>Next review in 3 days</span>
                    </div>
                  </div>
                </div>
              </div>
              <p className="mono-meta mt-3">
                Illustrative example using the real local question bank. A miss
                would first name the distractor's misconception and ask you to test
                it — before showing this explanation. Nothing on this card is
                recorded.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Question bank */}
      <section
        id="bank"
        className="scroll-mt-24 border-t border-line bg-paper-deep"
      >
        <div className="site-container py-20 md:py-28">
          <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <p data-reveal className="eyebrow text-brick">
                The question bank
              </p>
              <h2 data-reveal className="section-title mt-5 max-w-[17ch] text-ink">
                A small bank, chosen carefully.
              </h2>
              <p
                data-reveal
                className="mt-5 max-w-xl text-[1.025rem] leading-[1.75] text-ink-soft"
              >
                Every topic carries foundational, developing, and stretch items,
                each with a written explanation and a hint. Browse what the engine
                draws from.
              </p>
            </div>

            <div
              data-reveal
              className="flex flex-wrap gap-2"
              role="group"
              aria-label="Filter the question bank by exam"
            >
              {bankFilters.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  aria-pressed={filter === value}
                  className={`btn btn-sm ${
                    filter === value ? "btn-primary" : "btn-secondary"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-14 space-y-16">
            {visibleTracks.map((track) => (
              <div key={track.id} data-reveal>
                <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-linestrong pb-4">
                  <h3 className="font-serif text-[1.8rem] text-ink">
                    {track.name}
                  </h3>
                  <p className="mono-meta">
                    {track.topics.length} topics ·{" "}
                    {track.topics.reduce(
                      (total, topic) =>
                        total + countByDifficulty(track.id, topic.id).total,
                      0,
                    )}{" "}
                    items
                  </p>
                </div>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-mutedink">
                  {track.description}
                </p>

                <div className="mt-6">
                  {track.topics.map((topic) => {
                    const counts = countByDifficulty(track.id, topic.id);
                    const topicSample =
                      questionsFor(track.id, topic.id).find(
                        (question) => question.difficulty === "medium",
                      ) ?? questionsFor(track.id, topic.id)[0];
                    return (
                      <details
                        key={topic.id}
                        className="group border-t border-line py-6 first:border-0 first:pt-0"
                      >
                        <summary className="flex cursor-pointer list-none flex-col gap-4 md:flex-row md:items-start md:justify-between [&::-webkit-details-marker]:hidden">
                          <div>
                            <h4 className="font-serif text-[1.25rem] text-ink">
                              {topic.name}
                            </h4>
                            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-mutedink">
                              {topic.blurb}
                            </p>
                            <p className="mono-meta mt-3">
                              {counts.total} items · {counts.easy} foundational ·{" "}
                              {counts.medium} developing · {counts.hard} stretch
                            </p>
                          </div>
                          <span className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-[var(--site-radius)] border border-line bg-surface px-4 py-2 text-sm font-medium text-ink-soft transition-colors group-hover:border-linestrong">
                            View a sample
                            <ChevronDown
                              className="size-4 transition-transform group-open:rotate-180"
                              aria-hidden="true"
                            />
                          </span>
                        </summary>
                        <div className="card mt-4 max-w-2xl bg-surface p-5">
                          <p className="mono-meta">
                            Sample · {topic.short} · developing
                          </p>
                          <p className="mt-2 font-serif text-lg leading-snug text-ink">
                            {topicSample.prompt}
                          </p>
                          <ul className="mt-3 space-y-1.5">
                            {topicSample.choices.map((choice, index) => (
                              <li
                                key={choice}
                                className={`text-sm ${
                                  index === topicSample.answer
                                    ? "font-medium text-sage"
                                    : "text-mutedink"
                                }`}
                              >
                                {index === topicSample.answer ? "✓ " : "· "}
                                {choice}
                              </li>
                            ))}
                          </ul>
                          <p className="mt-3 border-t border-line pt-3 text-sm leading-relaxed text-mutedink">
                            {topicSample.explanation}
                          </p>
                        </div>
                      </details>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Research */}
      <section id="research" className="scroll-mt-24 border-t border-line">
        <div className="site-container py-20 md:py-28">
          <div data-reveal className="grid gap-6 md:grid-cols-[0.8fr_1.2fr]">
            <p className="eyebrow text-brick">Research basis</p>
            <div>
              <h2 className="section-title max-w-[20ch] text-ink">
                Built on published learning science.
              </h2>
              <p className="mt-5 max-w-xl text-[1.025rem] leading-[1.75] text-ink-soft">
                The learner model is a deterministic, inspectable approximation —
                not a fine-tuned neural model. The planning layer is agentic: a
                Qoder Cloud Agent proposes a typed plan, and a deterministic
                verifier checks it before anything reaches the learner. Each paper
                below informs a concrete mechanism you can open in the app.
              </p>
            </div>
          </div>

          <div className="mt-14 grid gap-px overflow-hidden rounded-[var(--site-radius)] border border-line bg-line md:grid-cols-2">
            {research.map((entry) => (
              <article
                key={entry.n}
                data-reveal
                className="flex flex-col bg-paper p-7 md:p-8"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="mono-meta">{entry.n}</p>
                  <p className="mono-meta text-right">{entry.source}</p>
                </div>
                <h3 className="mt-6 font-serif text-[1.45rem] leading-snug text-ink">
                  {entry.title}
                </h3>
                <p className="mt-3 flex-1 text-[0.95rem] leading-[1.7] text-mutedink">
                  {entry.use}
                </p>
                <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-4">
                  {entry.links.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      className="link-underline inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-ink"
                    >
                      {link.label}
                      <ExternalLink className="size-3" aria-hidden="true" />
                    </a>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <div data-reveal className="mt-16">
            <div className="grid gap-4 md:grid-cols-[0.8fr_1.2fr] md:items-end">
              <p className="eyebrow">Coverage</p>
              <h3 className="font-serif text-[1.7rem] leading-tight text-ink">
                Every requirement has a visible surface.
              </h3>
            </div>
            <div className="card mt-6 overflow-hidden bg-surface">
              {coverage.map(([requirement, implementation]) => (
                <div
                  key={requirement}
                  className="grid gap-1.5 border-b border-line px-5 py-4 last:border-0 md:grid-cols-[16rem_1fr] md:gap-6"
                >
                  <p className="text-sm font-medium text-ink">{requirement}</p>
                  <p className="text-sm leading-relaxed text-mutedink">
                    {implementation}
                  </p>
                </div>
              ))}
            </div>
            <p className="mono-meta mt-5 max-w-2xl">
              The agent runs at request time through a same-origin site Function;
              the Qoder token never reaches the browser. Plans are validated
              against a strict schema, then repaired or rejected deterministically.
              If the agent is unavailable, the local planner fills the same
              contract and the interface labels the source. Items and explanations
              remain authored; the mastery, diagnostic, and scheduling logic is
              real and runs locally.
            </p>
          </div>
        </div>
      </section>

      {/* Principles */}
      <section id="principles" className="scroll-mt-24 border-t border-line">
        <div className="site-container py-20 md:py-28">
          <p data-reveal className="eyebrow text-brick">
            Design principles
          </p>
          <h2 data-reveal className="section-title mt-5 max-w-[18ch] text-ink">
            Built to be understood, not just used.
          </h2>

          <div className="mt-14 grid gap-px overflow-hidden rounded-[var(--site-radius)] border border-line bg-line sm:grid-cols-2">
            {principles.map((principle) => (
              <article
                key={principle.n}
                data-reveal
                className="bg-paper p-7 md:p-9"
              >
                <p className="mono-meta">{principle.n}</p>
                <h3 className="mt-6 font-serif text-[1.5rem] leading-snug text-ink">
                  {principle.title}
                </h3>
                <p className="mt-3 max-w-md text-[0.975rem] leading-[1.7] text-mutedink">
                  {principle.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Closing */}
      <section className="border-t border-line bg-ink text-paper">
        <div className="site-container grid gap-10 py-16 md:grid-cols-[1.2fr_0.8fr] md:items-end md:py-20">
          <div>
            <p className="eyebrow text-paper/60">Start here</p>
            <h2 className="section-title mt-5 max-w-[16ch]">
              See your map in about three minutes.
            </h2>
            <p className="mt-5 max-w-lg text-[1.025rem] leading-[1.75] text-paper/70">
              Five Class 10 Physics items seed the map; every answer after that is
              chosen from your weakest concept. Your account keeps the map, the
              review queue, and the reasoning gaps between visits.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 md:justify-end">
            <Link
              to={
                user
                  ? user.role === "teacher"
                    ? "/teacher"
                    : "/dashboard"
                  : "/login?mode=signup"
              }
              className="btn bg-paper text-ink hover:bg-paper-deep"
            >
              {user
                ? user.role === "teacher"
                  ? "Open class overview"
                  : "Open your dashboard"
                : "Create your account"}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <a
              href="#bank"
              className="btn border-paper/25 bg-transparent text-paper hover:border-paper/50 hover:bg-paper/10"
            >
              Browse the bank
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
