import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { QUESTIONS, TRACKS } from "@/lib/questions";
import { Wordmark } from "./Wordmark";

export function SiteFooter() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <footer className="border-t border-line">
      <div className="site-container grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1.2fr]">
        <div>
          <Wordmark onClick={() => navigate("/")} />
          <p className="mt-4 max-w-sm font-serif text-lg leading-relaxed text-ink-soft">
            An adaptive study instrument that keeps one honest question in front of
            you: what do you actually know?
          </p>
          <p className="mono-meta mt-5">
            A hackathon build · agent planning, local learner model
          </p>
        </div>

        <div>
          <p className="eyebrow">Study</p>
          <div className="mt-4 flex flex-col items-start gap-3">
            <Link to="/" className="link-underline text-sm">
              Back to the overview
            </Link>
            {user?.role === "teacher" ? (
              <Link to="/teacher" className="link-underline text-sm">
                Open the class overview
              </Link>
            ) : user ? (
              <>
                <Link to="/dashboard" className="link-underline text-sm">
                  Open your learner profile
                </Link>
                <Link to="/practice" className="link-underline text-sm">
                  Start a practice session
                </Link>
              </>
            ) : (
              <>
                <Link to="/login" className="link-underline text-sm">
                  Sign in
                </Link>
                <Link to="/login?mode=signup" className="link-underline text-sm">
                  Create an account
                </Link>
              </>
            )}
            <Link to="/login" className="link-underline text-sm">
              Teacher demo
            </Link>
          </div>
        </div>

        <div>
          <p className="eyebrow">How it runs</p>
          <ul className="mt-4 space-y-2 text-sm leading-relaxed text-mutedink">
            <li>
              {QUESTIONS.length} curated items across {TRACKS.length} tracks
            </li>
            <li>Topic and concept mastery update after every answer</li>
            <li>Spaced reviews scheduled from recall strength</li>
            <li>Socratic follow-ups on distractor reasoning</li>
            <li>An AI agent plans sessions; a deterministic verifier gates every plan</li>
            <li>Agent calls are same-origin and server-mediated; the token stays server-side</li>
            <li>Accounts and profiles stored in this browser only</li>
            <li>No third-party analytics or external database</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="site-container flex flex-col gap-2 py-5 text-[11px] leading-relaxed text-mutedink md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} Praxis. An independent educational demo.
            {user ? ` Signed in as @${user.username}.` : ""}
          </p>
          <p className="max-w-2xl md:text-right">
            SAT® and AP® are registered trademarks of the College Board. This
            project is not affiliated with or endorsed by the College Board.
            Accounts are a local demonstration gate, not server-enforced security.
          </p>
        </div>
      </div>
    </footer>
  );
}
