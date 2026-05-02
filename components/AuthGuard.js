"use client";
import { useAuth } from "@/components/Providers";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AuthGuard({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: "var(--sn-bg)" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-walnut-600 border-t-transparent rounded-full animate-spin"/>
          <p className="text-stone-500 dark:text-stone-400 text-base">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;
  return <>{children}</>;
}
