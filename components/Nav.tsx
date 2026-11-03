"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { DEFAULT_LOGO } from "@/lib/tournaments";
import { useLive } from "./LiveProvider";

type NavItem = {
  href: string;
  label: string;
  signedInOnly?: boolean;
  /** Paths that don't get seasonHref() */
  global?: boolean;
};

type NavSection = {
  id: string;
  label: string;
  signedInOnly?: boolean;
  items: NavItem[];
};

const DIRECT: NavItem[] = [
  { href: "/", label: "Live" },
  { href: "/practice", label: "Practice", global: true },
];

const SECTIONS: NavSection[] = [
  {
    id: "tournament",
    label: "Tournament",
    items: [
      { href: "/fixtures", label: "Fixtures" },
      { href: "/standings", label: "Table" },
      { href: "/teams", label: "Teams" },
      { href: "/gallery", label: "Gallery" },
      { href: "/awards", label: "Awards" },
    ],
  },
  {
    id: "score",
    label: "Score",
    items: [{ href: "/staff", label: "Venue PIN" }],
  },
  {
    id: "manage",
    label: "Manage",
    signedInOnly: true,
    items: [
      { href: "/tournament/create", label: "Create", signedInOnly: true, global: true },
      { href: "/admin", label: "Organiser", signedInOnly: true },
      { href: "/notices", label: "Alerts", signedInOnly: true, global: true },
    ],
  },
  {
    id: "more",
    label: "More",
    items: [
      { href: "/seasons", label: "Browse", global: true },
      { href: "/rules", label: "Rules" },
      { href: "/report", label: "Report", global: true },
    ],
  },
];

type MeBrief = { ok: boolean; user?: { name: string; email: string } };

function itemActive(path: string, href: string): boolean {
  if (href === "/") return path === "/";
  if (href === "/practice") return path === "/practice" || path.startsWith("/practice/");
  if (href === "/seasons") return path === "/seasons";
  if (href === "/staff") return path === "/staff" || path.startsWith("/staff/");
  if (href === "/gallery") return path === "/gallery" || path.startsWith("/gallery/");
  if (href === "/notices") return path === "/notices";
  if (href === "/admin") return path === "/admin" || path.startsWith("/admin/");
  if (href === "/tournament/create") return path.startsWith("/tournament/create");
  if (href === "/teams") return path === "/teams" || path.startsWith("/teams/");
  if (href === "/fixtures") return path === "/fixtures" || path.startsWith("/fixtures/");
  if (href === "/standings") return path === "/standings" || path.startsWith("/standings/");
  if (href === "/awards") return path === "/awards" || path.startsWith("/awards/");
  if (href === "/rules") return path === "/rules";
  if (href === "/report") return path === "/report";
  return path === href;
}

export function Nav() {
  const path = usePathname();
  const { state, error, season, seasonHref, setSeason } = useLive();
  const [me, setMe] = useState<MeBrief | null>(null);
  const [unread, setUnread] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const baseId = useId();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then(async (m: MeBrief) => {
        if (cancelled) return;
        setMe(m);
        if (m?.ok) {
          try {
            const n = await fetch("/api/notices", { cache: "no-store" }).then((r) => r.json());
            if (!cancelled && n?.ok) setUnread(n.unread || 0);
          } catch {
            /* ignore */
          }
        } else setUnread(0);
      })
      .catch(() => {
        if (!cancelled) setMe({ ok: false });
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  useEffect(() => {
    setOpenId(null);
  }, [path]);

  useEffect(() => {
    if (!openId) return;
    const onPointer = (e: MouseEvent | TouchEvent) => {
      const el = navRef.current;
      if (el && e.target instanceof Node && !el.contains(e.target)) setOpenId(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenId(null);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [openId]);

  // Practice match pages keep the site header (completed / setup / continue).
  // Live scoring uses a fixed fullscreen .scorer that covers the nav.
  if (path.startsWith("/display") || path.startsWith("/auction/projector") || /^\/score\/.+/.test(path)) return null;
  const logo = state?.meta?.logo || DEFAULT_LOGO;
  const short = state?.meta?.short ?? state?.config.tournament.short ?? "VolleyAdda";
  const seasonLabel = season
    ? state?.meta?.subtitle || state?.tournamentKey || season
    : "Pick a tournament";

  const signedIn = !!me?.ok && !!me.user;
  const accountHref = signedIn ? "/account" : "/auth/login";
  const accountLabel = signedIn ? me.user!.name.split(" ")[0] || "Account" : "Sign in";
  const accountOn = path === "/account" || path.startsWith("/auth/");

  const resolveHref = (item: NavItem) => (item.global ? item.href : seasonHref(item.href));

  const visibleSections = SECTIONS.filter((s) => !s.signedInOnly || signedIn).map((s) => ({
    ...s,
    items: s.items.filter((i) => !i.signedInOnly || signedIn),
  }));

  return (
    <header className="nav">
      <div className="navin">
        <Link href="/" className="brand">
          <img src={logo} alt="" width={40} height={40} />
          <span>
            <b>{short}</b>
            <small>{seasonLabel}</small>
          </span>
        </Link>
        <nav aria-label="Main" ref={navRef}>
          {DIRECT.map((l) => {
            const on = itemActive(path, l.href);
            return (
              <Link key={l.href} href={resolveHref(l)} className={on ? "on" : ""}>
                {l.label}
              </Link>
            );
          })}

          {visibleSections.map((section) => {
            const sectionOn = section.items.some((i) => itemActive(path, i.href));
            const open = openId === section.id;
            const menuId = `${baseId}-${section.id}`;
            return (
              <div key={section.id} className={`nav-dd${open ? " open" : ""}${sectionOn ? " active" : ""}`}>
                <button
                  type="button"
                  className={`nav-dd-btn${sectionOn || open ? " on" : ""}`}
                  aria-expanded={open}
                  aria-controls={menuId}
                  aria-haspopup="menu"
                  onClick={() => setOpenId(open ? null : section.id)}
                >
                  {section.label}
                  <span className="nav-dd-caret" aria-hidden>
                    ▾
                  </span>
                </button>
                {open && (
                  <div id={menuId} className="nav-dd-menu" role="menu">
                    <div className="nav-dd-label">{section.label}</div>
                    {section.items.map((item) => {
                      const on = itemActive(path, item.href);
                      const label =
                        item.href === "/notices" && unread > 0 ? `Alerts (${unread})` : item.label;
                      return (
                        <Link
                          key={item.href}
                          href={resolveHref(item)}
                          className={on ? "on" : ""}
                          role="menuitem"
                          onClick={() => setOpenId(null)}
                        >
                          {label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          <Link href={accountHref} className={accountOn ? "on" : ""}>
            {accountLabel}
          </Link>
        </nav>
      </div>
      {season && state?.viewingArchive && (
        <div className="offline archive-bar">
          Viewing archive <b>{state.tournamentKey}</b> ·{" "}
          <button type="button" className="btn ghost" style={{ display: "inline", padding: 0 }} onClick={() => setSeason(null)}>
            Clear selection
          </button>
          {" · "}
          <Link href="/">Home</Link>
        </div>
      )}
      {error && <div className="offline">{error}</div>}
      {state?.storage === "memory" && process.env.NODE_ENV === "production" && (
        <div className="offline">Demo mode: no database connected, scores are not saved. See README.</div>
      )}
    </header>
  );
}
