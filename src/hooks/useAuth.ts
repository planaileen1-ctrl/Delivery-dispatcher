"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signInAnonymously, User } from "firebase/auth";
import { auth } from "@/lib/firebase";

/**
 * Maneja TODA la auth del frontend
 * ✔️ Compatible Vercel
 * ✔️ Sin custom tokens
 * ✔️ Sin globals raros
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let unsub = () => {};

    const init = async () => {
      try {
        await signInAnonymously(auth);
      } catch (e: any) {
        setError(e.message || "Auth error");
        setLoading(false);
        return;
      }

      unsub = onAuthStateChanged(auth, (u) => {
        setUser(u);
        setLoading(false);
      });
    };

    init();
    return () => unsub();
  }, []);

  return { user, loading, error };
}
