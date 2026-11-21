import { Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { lazy, type ReactNode } from "react";
import { LoadingScreen } from "../components/LoadingScreen";
import { useLearner } from "../contexts/LearnerContext";
import { useAuth } from "../contexts/AuthContext";
import type { LearnerProfile, SessionDraft } from "@/lib/learner";

const Placement = lazy(() =>
  import("../components/Placement").then((module) => ({
    default: module.Placement,
  })),
);
const Dashboard = lazy(() =>
  import("../components/Dashboard").then((module) => ({
    default: module.Dashboard,
  })),
);
const Practice = lazy(() =>
  import("../components/Practice").then((module) => ({
    default: module.Practice,
  })),
);
const SessionSummary = lazy(() =>
  import("../components/SessionSummary").then((module) => ({
    default: module.SessionSummary,
  })),
);

export function StudentGuard({ children }: { children: ReactNode }) {
  const { profile, ready } = useLearner();
  if (!ready) return <LoadingScreen label="Loading your learner map" />;
  if (!profile) return <Navigate to="/placement" replace />;
  return <>{children}</>;
}

export function PlacementPage() {
  const { user } = useAuth();
  const { profile, updateProfile } = useLearner();
  const navigate = useNavigate();

  return (
    <Placement
      accountName={user?.name ?? ""}
      onComplete={(next) => {
        updateProfile(next);
        navigate("/dashboard", { replace: true });
      }}
      onCancel={() => navigate(profile ? "/dashboard" : "/", { replace: true })}
    />
  );
}

function practicePath(options: {
  topicId?: string;
  kcId?: string;
  review?: boolean;
}) {
  const params = new URLSearchParams();
  if (options.topicId) params.set("topic", options.topicId);
  if (options.kcId) params.set("kc", options.kcId);
  if (options.review) params.set("review", "1");
  const query = params.toString();
  return query ? `/practice?${query}` : "/practice";
}

export function DashboardPage() {
  const { profile, updateProfile, resetProfile } = useLearner();
  const navigate = useNavigate();

  if (!profile) return null;

  return (
    <Dashboard
      profile={profile}
      onChange={updateProfile}
      onStartPractice={(topicId, kcId) =>
        navigate(practicePath({ topicId, kcId }))
      }
      onStartReview={() => navigate(practicePath({ review: true }))}
      onReset={() => {
        resetProfile();
        navigate("/", { replace: true });
      }}
    />
  );
}

export function PracticePage() {
  const { profile, updateProfile } = useLearner();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const topicId = params.get("topic") ?? undefined;
  const kcId = params.get("kc") ?? undefined;
  const review = params.get("review") === "1";

  if (!profile) return null;

  return (
    <Practice
      key={params.toString()}
      profile={profile}
      topicId={topicId}
      kcId={kcId}
      reviewMode={review}
      onProfileChange={updateProfile}
      onFinish={(draft, finalProfile) => {
        navigate("/summary", {
          state: { draft, profile: finalProfile },
        });
      }}
      onExit={() => navigate("/dashboard")}
    />
  );
}

export function SummaryPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as {
    draft?: SessionDraft;
    profile?: LearnerProfile;
  } | null;

  if (!state?.draft || !state.profile) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <SessionSummary
      draft={state.draft}
      profile={state.profile}
      onPracticeAgain={() => navigate("/practice")}
      onDashboard={() => navigate("/dashboard")}
    />
  );
}
