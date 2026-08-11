"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const getStoredToken = (): string | null => {
    if (typeof window === "undefined") {
      return null;
    }
    return localStorage.getItem("biomap_token");
  };

  const setStoredToken = (token: string | null) => {
    if (typeof window === "undefined") {
      return;
    }

    if (token) {
      localStorage.setItem("biomap_token", token);
    } else {
      localStorage.removeItem("biomap_token");
    }
  };

  const fetchCurrentUser = async (token: string | null): Promise<User | null> => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: token ? "omit" : "include",
      });

      if (res.ok) {
        const data = await res.json();
        return data as User;
      }
      return null;
    } catch (error) {
      console.error("Failed to fetch current user", error);
      return null;
    }
  };

  const refreshUser = async () => {
    const token = getStoredToken();
    const userData = await fetchCurrentUser(token);
    if (userData) {
      setUser(userData);
    } else {
      setUser(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    let isActive = true;

    const initializeAuth = async () => {
      const token = getStoredToken();
      const userData = await fetchCurrentUser(token);
      if (!isActive) {
        return;
      }

      if (userData) {
        setUser(userData);
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    void initializeAuth();

    return () => {
      isActive = false;
    };
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.detail || "Login failed. Please check your credentials.");
    }

    setStoredToken(data.access_token);
    if (data.user) {
      setUser(data.user);
    }
    await refreshUser();
  };

  const signup = async (name: string, email: string, password: string) => {
    const res = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.detail || "Signup failed. Please try again.");
    }

    setStoredToken(data.access_token);
    if (data.user) {
      setUser(data.user);
    }
    await refreshUser();
  };

  const logout = async () => {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    }).catch(() => null);

    setStoredToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        signup,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
