"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/map", label: "Map" },
  { href: "/upload", label: "Upload" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/profile", label: "Profile" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout, loading } = useAuth();

  return (
    <nav className="bg-gray-900 border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="text-xl font-bold text-emerald-400">
            🌿 BioMap AI
          </Link>
          <div className="flex items-center space-x-4">
            <div className="flex space-x-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname === link.href
                      ? "bg-emerald-600 text-white"
                      : "text-gray-300 hover:bg-gray-700 hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="border-l border-gray-700 pl-4 flex items-center space-x-3 text-sm">
              {loading ? (
                <span className="text-gray-500 text-xs">...</span>
              ) : user ? (
                <>
                  <span className="text-gray-300 text-xs">
                    {user.username}
                  </span>
                  <button
                    onClick={logout}
                    className="bg-gray-800 hover:bg-gray-700 text-gray-200 px-3 py-1.5 rounded text-xs border border-gray-700"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className={`px-3 py-1.5 rounded text-xs ${
                      pathname === "/login"
                        ? "bg-gray-800 text-white"
                        : "text-gray-300 hover:bg-gray-800"
                    }`}
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded text-xs"
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}