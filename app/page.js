"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/Providers";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      router.replace(user ? "/dashboard" : "/login");
    }
  }, [user, loading, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
