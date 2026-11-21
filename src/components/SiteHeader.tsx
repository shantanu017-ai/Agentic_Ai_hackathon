import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut, Menu, X } from "lucide-react";
import { Wordmark } from "./Wordmark";
import { ThemeToggle, type Theme } from "./ThemeToggle";
import { useAuth } from "../contexts/AuthContext";

type Props = {
  theme: Theme;
  onToggleTheme: () => void;
};

type NavItem = { label: string; to: string; active?: boolean; anchor?: boolean };

export function SiteHeader({ theme, onToggleTheme }: Props) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const onLanding = location.pathname === "/";

  const section = (hash: string) => (onLanding ? hash : `/${hash}`);

  const links: NavItem[] = [];
  if (!onLanding) {
    links.push({ label: "Home", to: "/" });
  }
  links.push(
    { label: "Model", to: section("#model"), anchor: true },
    { label: "Research", to: section("#research"), anchor: true },
  );
  if (!user) {
    links.push(
      { label: "Question bank", to: section("#bank"), anchor: true },
      { label: "Create account", to: "/login?mode=signup" },
    );
  } else if (user.role === "student") {
    links.push(
      {
        label: "Overview",
        to: "/dashboard",
        active: location.pathname === "/dashboard",
      },
      {
        label: "Practice",
        to: "/practice",
        active: location.pathname === "/practice",
      },
      { label: "Question bank", to: section("#bank"), anchor: true },
    );
  } else {
    links.push({
      label: "Class overview",
      to: "/teacher",
      active: location.pathname === "/teacher",
    });
  }

  const primary = !user
    ? location.pathname === "/login"
      ? null
      : { label: "Sign in", to: "/login" }
    : user.role === "teacher"
      ? { label: "Class overview", to: "/teacher" }
      : location.pathname === "/practice"
        ? { label: "Dashboard", to: "/dashboard" }
        : { label: "Start a session", to: "/practice" };

  const navClass =
    "font-mono text-[11px] uppercase tracking-[0.14em] text-mutedink transition-colors hover:text-ink";

  const signOutNow = () => {
    setOpen(false);
    signOut();
    navigate("/", { replace: true });
  };

  const renderLink = (link: NavItem, mobile = false) => {
    const className = mobile
      ? `border-b border-line py-3 font-mono text-[11px] uppercase tracking-[0.14em] last:border-0 ${
          link.active ? "text-ink" : "text-mutedink"
        }`
      : `${navClass} ${link.active ? "text-ink" : ""}`;
    return link.anchor ? (
      <a
        key={`${link.label}-${link.to}`}
        href={link.to}
        onClick={() => setOpen(false)}
        aria-current={link.active ? "page" : undefined}
        className={className}
      >
        {link.label}
      </a>
    ) : (
      <Link
        key={`${link.label}-${link.to}`}
        to={link.to}
        onClick={() => setOpen(false)}
        aria-current={link.active ? "page" : undefined}
        className={className}
      >
        {link.label}
      </Link>
    );
  };

  return (
    <header className="site-header sticky top-0 z-50">
      <div className="site-container flex h-[76px] items-center justify-between gap-4">
        <Wordmark onClick={() => navigate("/")} />

        <nav aria-label="Primary" className="hidden items-center gap-7 md:flex">
          {links.map((link) => renderLink(link))}
        </nav>

        <div className="flex items-center gap-2">
          {user && (
            <div className="hidden items-center gap-2 border-l border-line pl-4 lg:flex">
              <div className="text-right">
                <p className="text-[0.8rem] font-medium leading-tight text-ink">
                  {user.name}
                </p>
                <p className="mono-meta mt-0.5">{user.role}</p>
              </div>
              <button
                type="button"
                onClick={signOutNow}
                className="inline-flex size-9 items-center justify-center rounded-full border border-line text-mutedink transition-colors hover:bg-paper-deep hover:text-ink"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut className="size-4" aria-hidden="true" />
              </button>
            </div>
          )}

          <ThemeToggle theme={theme} onToggle={onToggleTheme} />

          {primary && (
            <Link
              to={primary.to}
              className="btn btn-primary btn-sm hidden sm:inline-flex"
            >
              {primary.label}
            </Link>
          )}

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            className="inline-flex size-11 items-center justify-center rounded-full border border-line text-ink-soft transition-colors hover:bg-paper-deep md:hidden"
          >
            {open ? (
              <X className="size-4" aria-hidden="true" />
            ) : (
              <Menu className="size-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-nav"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-x-0 top-full border-b border-line bg-surface shadow-[var(--shadow-soft)] md:hidden"
          >
            <nav aria-label="Mobile" className="site-container flex flex-col py-4">
              {user && (
                <div className="mb-2 flex items-center justify-between gap-4 border-b border-line pb-4">
                  <div>
                    <p className="text-sm font-medium text-ink">{user.name}</p>
                    <p className="mono-meta mt-0.5">
                      @{user.username} · {user.role}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={signOutNow}
                    className="btn btn-quiet btn-sm"
                  >
                    <LogOut className="size-3.5" aria-hidden="true" />
                    Sign out
                  </button>
                </div>
              )}
              {links.map((link) => renderLink(link, true))}
              {primary && (
                <Link
                  to={primary.to}
                  onClick={() => setOpen(false)}
                  className="btn btn-primary mt-4 w-full"
                >
                  {primary.label}
                </Link>
              )}
              {!user && (
                <Link
                  to="/login?mode=signup"
                  onClick={() => setOpen(false)}
                  className="btn btn-secondary mt-2 w-full"
                >
                  Create account
                </Link>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
