"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Trophy, PencilLine, ListOrdered, User } from "lucide-react";

const TABS = [
  { href: "/", label: "Leagues", icon: Trophy, match: (p: string) => p === "/" || p.startsWith("/leagues") },
  { href: "/predict", label: "Predict", icon: PencilLine, match: (p: string) => p.startsWith("/predict") },
  { href: "/results", label: "Results", icon: ListOrdered, match: (p: string) => p.startsWith("/results") },
  { href: "/profile", label: "Profile", icon: User, match: (p: string) => p.startsWith("/profile") },
];

export function BottomNav() {
  const pathname = usePathname();
  if (pathname === "/login") return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-background/80 backdrop-blur-lg pb-safe sm:hidden">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition ${
                active ? "text-accent" : "text-muted"
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2.4 : 2} aria-hidden />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
