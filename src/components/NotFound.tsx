import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <div className="site-container max-w-2xl py-20">
      <p className="eyebrow text-brick">404 · Nothing here</p>
      <h1 className="section-title mt-4 text-ink">
        This page has no questions.
      </h1>
      <p className="mt-4 leading-relaxed text-mutedink">
        The address may be mistyped or the page may have moved. Your learner
        model is unaffected.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        <Link to="/" className="btn btn-primary">
          Back to the home page
        </Link>
        <Link to="/dashboard" className="btn btn-secondary">
          Open dashboard
        </Link>
      </div>
    </div>
  );
}
