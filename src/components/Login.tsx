import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Eye,
  EyeOff,
  GraduationCap,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import {
  DEMO_STUDENT,
  DEMO_TEACHER,
  type Role,
  type SessionUser,
} from "@/lib/auth";
import { hasProfile } from "@/lib/learner";

type Mode = "signin" | "signup";

export function Login() {
  const { user, signIn, signUp, demoSignIn } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [mode, setMode] = useState<Mode>(
    params.get("mode") === "signup" ? "signup" : "signin",
  );
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState<"form" | Role | null>(null);
  const [error, setError] = useState("");

  if (user) {
    return (
      <Navigate
        to={user.role === "teacher" ? "/teacher" : "/dashboard"}
        replace
      />
    );
  }

  const destinationFor = (signedIn: SessionUser) => {
    const next = params.get("next");
    if (next && next.startsWith("/") && !next.startsWith("//")) return next;
    if (signedIn.role === "teacher") return "/teacher";
    return hasProfile(signedIn.username) ||
      signedIn.username === DEMO_STUDENT.username
      ? "/dashboard"
      : "/placement";
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError("");
    setPassword("");
    setConfirm("");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy("form");
    setError("");
    const result =
      mode === "signin"
        ? await signIn(username, password)
        : await signUp({ name, username, password, confirm });
    setBusy(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    navigate(
      mode === "signup" ? "/placement" : destinationFor(result.user),
      { replace: true },
    );
  };

  const runDemo = async (role: Role) => {
    if (busy) return;
    setBusy(role);
    setError("");
    const result = await demoSignIn(role);
    setBusy(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    navigate(role === "teacher" ? "/teacher" : "/dashboard", { replace: true });
  };

  return (
    <div className="site-container max-w-6xl py-10 md:py-16">
      <Link to="/" className="link-underline text-sm text-mutedink">
        ← Back to the overview
      </Link>

      <div className="mt-8 grid items-start gap-10 lg:grid-cols-[0.92fr_1.08fr]">
        <div>
          <p className="eyebrow text-brick">Learner account</p>
          <h1 className="section-title mt-5 max-w-[15ch] text-ink">
            Your map, kept under your name.
          </h1>
          <p className="mt-6 max-w-md text-[1.025rem] leading-[1.75] text-ink-soft">
            Sign in to resume your mastery map, due reviews and weak-skill
            queue. New here? A short placement builds your first map in about
            three minutes.
          </p>

          <div className="card-soft mt-8 p-5">
            <div className="flex items-center gap-2 text-ink">
              <ShieldCheck className="size-4 text-sage" aria-hidden="true" />
              <p className="eyebrow">Try it without signing up</p>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              Two seeded accounts demonstrate the student and teacher views.
              Their passwords are intentionally public. One click opens each.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => runDemo("student")}
                disabled={Boolean(busy)}
                className="card group p-4 text-left transition-colors hover:border-linestrong disabled:opacity-60"
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2">
                    <GraduationCap className="size-4 text-brick" aria-hidden="true" />
                    <span className="text-sm font-medium text-ink">Student demo</span>
                  </span>
                  <ArrowRight
                    className="size-4 text-mutedink transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </span>
                <span className="mt-2 block text-xs leading-relaxed text-mutedink">
                  Aarav&apos;s live map: 3 reviews due, two weak concepts
                </span>
                <span className="mono-meta mt-3 block">
                  {busy === "student" ? "Opening…" : "student / praxis-student"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => runDemo("teacher")}
                disabled={Boolean(busy)}
                className="card group p-4 text-left transition-colors hover:border-linestrong disabled:opacity-60"
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2">
                    <Users className="size-4 text-sage" aria-hidden="true" />
                    <span className="text-sm font-medium text-ink">Teacher demo</span>
                  </span>
                  <ArrowRight
                    className="size-4 text-mutedink transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </span>
                <span className="mt-2 block text-xs leading-relaxed text-mutedink">
                  Class-level gaps, hot spots and a reteach plan
                </span>
                <span className="mono-meta mt-3 block">
                  {busy === "teacher" ? "Opening…" : "teacher / praxis-teacher"}
                </span>
              </button>
            </div>
          </div>

          <div className="mt-6 space-y-2 text-xs leading-relaxed text-mutedink">
            <p className="mono-meta">
              {DEMO_STUDENT.name} · Class 10 physics · 30-item bank
            </p>
            <p>
              Accounts and profiles are stored in this browser. Passwords are
              salted and hashed with PBKDF2 before storage. This is a
              demonstration gate, not server-enforced security: do not reuse a
              real password.
            </p>
          </div>
        </div>

        <section className="card p-6 md:p-8" aria-labelledby="auth-title">
          <div className="flex gap-1 rounded-sm border border-line p-1">
            <button
              type="button"
              onClick={() => switchMode("signin")}
              aria-pressed={mode === "signin"}
              className={`flex-1 rounded-sm px-3 py-2 text-sm transition-colors ${
                mode === "signin"
                  ? "bg-paper-deep font-medium text-ink"
                  : "text-mutedink hover:text-ink"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => switchMode("signup")}
              aria-pressed={mode === "signup"}
              className={`flex-1 rounded-sm px-3 py-2 text-sm transition-colors ${
                mode === "signup"
                  ? "bg-paper-deep font-medium text-ink"
                  : "text-mutedink hover:text-ink"
              }`}
            >
              Create account
            </button>
          </div>

          <h2 id="auth-title" className="mt-6 font-serif text-[1.6rem] text-ink">
            {mode === "signin" ? "Welcome back" : "Start a learner profile"}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-mutedink">
            {mode === "signin"
              ? "Use the username and password you chose on this device."
              : "Your username is the local key for your profile. No email is collected."}
          </p>

          <form className="mt-6" onSubmit={submit}>
            {mode === "signup" && (
              <div className="mb-4">
                <label htmlFor="auth-name" className="eyebrow">
                  Name
                </label>
                <input
                  id="auth-name"
                  type="text"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    setError("");
                  }}
                  autoComplete="name"
                  maxLength={40}
                  required
                  className="field mt-2"
                  placeholder="e.g. Aarav Mehta"
                />
              </div>
            )}

            <div className="mb-4">
              <label htmlFor="auth-username" className="eyebrow">
                Username
              </label>
              <input
                id="auth-username"
                type="text"
                value={username}
                onChange={(event) => {
                  setUsername(event.target.value);
                  setError("");
                }}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={24}
                required
                className="field mt-2"
                placeholder="your username"
                aria-invalid={Boolean(error)}
              />
            </div>

            <div className="mb-4">
              <label htmlFor="auth-password" className="eyebrow">
                Password
              </label>
              <div className="relative mt-2">
                <input
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError("");
                  }}
                  autoComplete={
                    mode === "signin" ? "current-password" : "new-password"
                  }
                  required
                  className="field pr-12"
                  placeholder={
                    mode === "signin" ? "your password" : "at least 8 characters"
                  }
                  aria-invalid={Boolean(error)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-mutedink hover:text-ink"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" aria-hidden="true" />
                  ) : (
                    <Eye className="size-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {mode === "signup" && (
              <div className="mb-4">
                <label htmlFor="auth-confirm" className="eyebrow">
                  Confirm password
                </label>
                <input
                  id="auth-confirm"
                  type={showPassword ? "text" : "password"}
                  value={confirm}
                  onChange={(event) => {
                    setConfirm(event.target.value);
                    setError("");
                  }}
                  autoComplete="new-password"
                  required
                  className="field mt-2"
                  placeholder="repeat the password"
                  aria-invalid={Boolean(error)}
                />
              </div>
            )}

            {error && (
              <p
                role="alert"
                className="mb-4 rounded-sm border border-brick/40 bg-brick-tint px-3 py-2 text-sm leading-relaxed text-brick"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={Boolean(busy)}
              className="btn btn-primary w-full disabled:opacity-60"
            >
              {busy === "form"
                ? "Checking…"
                : mode === "signin"
                  ? "Sign in"
                  : "Create account and start placement"}
              <ArrowRight className="size-4" aria-hidden="true" />
            </button>
          </form>

          <div className="mt-6 border-t border-line pt-4">
            <p className="mono-meta leading-relaxed">
              {DEMO_TEACHER.name} has a teacher roster to explore after signing in
              as the teacher demo.
            </p>
            <p className="mt-3 text-xs leading-relaxed text-mutedink">
              Forgot the password? There is no recovery service in this demo.
              Create a new username or clear this site&apos;s storage.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
