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
  demoCredentials,
  ensureSeedAccounts,
  restoreSession,
  signIn as signInAccount,
  signOut as signOutAccount,
  signUp as signUpAccount,
  type AuthResult,
  type Role,
  type SessionUser,
} from "@/lib/auth";

type AuthContextValue = {
  user: SessionUser | null;
  ready: boolean;
  signIn: (username: string, password: string) => Promise<AuthResult>;
  signUp: (input: {
    name: string;
    username: string;
    password: string;
    confirm: string;
  }) => Promise<AuthResult>;
  demoSignIn: (role: Role) => Promise<AuthResult>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    ensureSeedAccounts()
      .then(() => {
        if (!active) return;
        setUser(restoreSession());
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (username: string, password: string) => {
    const result = await signInAccount(username, password);
    if (result.ok) setUser(result.user);
    return result;
  }, []);

  const signUp = useCallback(
    async (input: {
      name: string;
      username: string;
      password: string;
      confirm: string;
    }) => {
      const result = await signUpAccount(input);
      if (result.ok) setUser(result.user);
      return result;
    },
    [],
  );

  const demoSignIn = useCallback(async (role: Role) => {
    const demo = demoCredentials(role);
    const result = await signInAccount(demo.username, demo.password);
    if (result.ok) setUser(result.user);
    return result;
  }, []);

  const signOut = useCallback(() => {
    signOutAccount();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, ready, signIn, signUp, demoSignIn, signOut }),
    [user, ready, signIn, signUp, demoSignIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
