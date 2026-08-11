"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export const Navbar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, loading, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/map", label: "Map" },
    { href: "/upload", label: "Upload" },
    { href: "/dashboard", label: "Dashboard" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-emerald-900/10 bg-slate-900/90 backdrop-blur text-slate-100 shadow-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-emerald-400 hover:text-emerald-300 transition-colors">
            <svg className="w-7 h-7 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 002 2h1.5a2.5 2.5 0 002.5-2.5V7a2 2 0 00-2-2h-1.5A2.5 2.5 0 0113 2.5V2.055m0 0A9.006 9.006 0 0120.055 11" />
            </svg>
            <span>BioMap <span className="text-white font-light">AI</span></span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`transition-colors hover:text-emerald-400 ${
                    isActive ? "text-emerald-400 font-semibold border-b-2 border-emerald-400 pb-0.5" : "text-slate-300"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {loading ? (
            <div className="h-8 w-24 bg-slate-800 animate-pulse rounded-md" />
          ) : isAuthenticated && user ? (
            <div className="flex items-center gap-4">
              <Link
                href="/profile"
                className={`flex items-center gap-2 text-sm font-medium transition-colors hover:text-emerald-300 ${
                  pathname === "/profile" ? "text-emerald-400 font-semibold" : "text-slate-200"
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-emerald-700/50 border border-emerald-500/40 flex items-center justify-center text-emerald-300 font-bold text-xs uppercase">
                  {user.name.charAt(0)}
                </div>
                <span className="hidden sm:inline">{user.name}</span>
              </Link>
              <button
                onClick={handleLogout}
                className="rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-400 border border-slate-700 hover:border-rose-900/50 px-3.5 py-1.5 text-xs font-semibold transition-all shadow-sm"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-200 hover:text-white transition-colors"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 text-sm font-semibold transition-all shadow-md shadow-emerald-950/50"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
