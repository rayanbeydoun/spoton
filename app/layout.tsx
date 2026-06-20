import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { BottomNav } from "@/components/BottomNav";
import { Logo } from "@/components/Logo";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SpotOn — PL Prediction League",
  description: "Predict Premier League scores, score points, climb the leaderboard.",
  appleWebApp: { capable: true, title: "SpotOn", statusBarStyle: "black-translucent" },
  icons: { apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#0e0a16",
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const admin = isAdminEmail(user?.email);

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ServiceWorkerRegister />
        <header className="border-b border-border/70 bg-background/60 backdrop-blur sticky top-0 z-20">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center" aria-label="SpotOn home">
              <Logo className="h-7" />
            </Link>
            <nav className="flex items-center gap-2 text-sm">
              {user ? (
                <div className="hidden items-center gap-2 sm:flex">
                  <Link href="/" className="btn-ghost px-3 py-1.5">
                    My Leagues
                  </Link>
                  {admin && (
                    <Link href="/admin" className="btn-ghost px-3 py-1.5">
                      Admin
                    </Link>
                  )}
                  <Link href="/profile" className="btn-ghost px-3 py-1.5">
                    Profile
                  </Link>
                </div>
              ) : (
                <Link href="/login" className="btn-primary px-3 py-1.5">
                  Sign in
                </Link>
              )}
            </nav>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-28 sm:py-8 sm:pb-10">
          {children}
        </main>

        <footer className="hidden border-t border-border/70 py-6 text-center text-xs text-muted sm:block">
          SpotOn · a friendly football prediction game
        </footer>

        <BottomNav />
      </body>
    </html>
  );
}
