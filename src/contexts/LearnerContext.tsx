import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  clearProfile,
  loadProfile,
  saveProfile,
  seedDemoProfile,
  type LearnerProfile,
} from "@/lib/learner";
import { DEMO_STUDENT } from "@/lib/auth";
import { useAuth } from "./AuthContext";

type LearnerContextValue = {
  profile: LearnerProfile | null;
  ready: boolean;
  updateProfile: (profile: LearnerProfile) => void;
  resetProfile: () => void;
};

const LearnerContext = createContext<LearnerContextValue | null>(null);

type LearnerState = {
  username: string | null;
  profile: LearnerProfile | null;
};

export function LearnerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<LearnerState>({
    username: null,
    profile: null,
  });

  useEffect(() => {
    if (!user) {
      setState({ username: null, profile: null });
      return;
    }
    let loaded = loadProfile(user.username);
    if (
      !loaded &&
      user.role === "student" &&
      user.username === DEMO_STUDENT.username
    ) {
      loaded = seedDemoProfile(user.name);
      saveProfile(loaded, user.username);
    }
    setState({ username: user.username, profile: loaded });
  }, [user]);

  const profile =
    user && state.username === user.username ? state.profile : null;
  const ready = !user || (Boolean(user) && state.username === user.username);

  const updateProfile = useCallback(
    (next: LearnerProfile) => {
      if (!user) return;
      saveProfile(next, user.username);
      setState({ username: user.username, profile: next });
    },
    [user],
  );

  const resetProfile = useCallback(() => {
    if (!user) return;
    clearProfile(user.username);
    setState({ username: user.username, profile: null });
  }, [user]);

  const value = useMemo(
    () => ({ profile, ready, updateProfile, resetProfile }),
    [profile, ready, updateProfile, resetProfile],
  );

  return (
    <LearnerContext.Provider value={value}>{children}</LearnerContext.Provider>
  );
}

export function useLearner() {
  const context = useContext(LearnerContext);
  if (!context) {
    throw new Error("useLearner must be used inside LearnerProvider");
  }
  return context;
}
