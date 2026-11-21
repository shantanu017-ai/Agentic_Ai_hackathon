import { Suspense, lazy, useEffect, useState } from "react";
import {
  BrowserRouter,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { MotionConfig, motion, useReducedMotion } from "framer-motion";
import { SiteHeader } from "./components/SiteHeader";
import { SiteFooter } from "./components/SiteFooter";
import { RequireAuth } from "./components/RequireAuth";
import { LoadingScreen } from "./components/LoadingScreen";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { NotFound } from "./components/NotFound";
import type { Theme } from "./components/ThemeToggle";
import { AuthProvider } from "./contexts/AuthContext";
import { LearnerProvider } from "./contexts/LearnerContext";
import {
  DashboardPage,
  PlacementPage,
  PracticePage,
  StudentGuard,
  SummaryPage,
} from "./pages/StudentPages";

const Landing = lazy(() =>
  import("./components/Landing").then((module) => ({
    default: module.Landing,
  })),
);
const Login = lazy(() =>
  import("./components/Login").then((module) => ({ default: module.Login })),
);
const TeacherDashboard = lazy(() =>
  import("./components/TeacherDashboard").then((module) => ({
    default: module.TeacherDashboard,
  })),
);

const THEME_KEY = "praxis.theme";

function pageTitle(pathname: string) {
  if (pathname.startsWith("/login")) return "Sign in · Praxis";
  if (pathname.startsWith("/placement")) return "Placement · Praxis";
  if (pathname.startsWith("/dashboard")) return "Your learner model · Praxis";
  if (pathname.startsWith("/practice")) return "Practice · Praxis";
  if (pathname.startsWith("/summary")) return "Session review · Praxis";
  if (pathname.startsWith("/teacher")) return "Class overview · Praxis";
  return "Praxis — Adaptive exam prep with a learner model";
}

function AppShell() {
  const reduceMotion = useReducedMotion();
  const location = useLocation();
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.dataset.theme === "dark" ? "dark" : "light",
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // The preference simply will not persist if storage is blocked.
    }
  }, [theme]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname, location.search]);

  useEffect(() => {
    document.title = pageTitle(location.pathname);
  }, [location.pathname]);

  const hideFooter = location.pathname.startsWith("/practice");
  const pageKey = `${location.pathname}${location.search}`;

  return (
    <MotionConfig reducedMotion="user">
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      <SiteHeader
        theme={theme}
        onToggleTheme={() =>
          setTheme((current) => (current === "light" ? "dark" : "light"))
        }
      />

      <main id="main" className="min-h-[60vh]">
        <ErrorBoundary key={pageKey}>
          <Suspense fallback={<LoadingScreen label="Loading Praxis" />}>
            <motion.div
              key={pageKey}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.22, ease: "easeOut" }}
            >
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />

                <Route element={<RequireAuth role="student" />}>
                  <Route path="/placement" element={<PlacementPage />} />
                  <Route
                    path="/dashboard"
                    element={
                      <StudentGuard>
                        <DashboardPage />
                      </StudentGuard>
                    }
                  />
                  <Route
                    path="/practice"
                    element={
                      <StudentGuard>
                        <PracticePage />
                      </StudentGuard>
                    }
                  />
                  <Route
                    path="/summary"
                    element={
                      <StudentGuard>
                        <SummaryPage />
                      </StudentGuard>
                    }
                  />
                </Route>

                <Route element={<RequireAuth role="teacher" />}>
                  <Route path="/teacher" element={<TeacherDashboard />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </motion.div>
          </Suspense>
        </ErrorBoundary>
      </main>

      {!hideFooter && <SiteFooter />}
    </MotionConfig>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LearnerProvider>
        <BrowserRouter>
          <AppShell />
        </BrowserRouter>
      </LearnerProvider>
    </AuthProvider>
  );
}
