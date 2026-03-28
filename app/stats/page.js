"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import StatsCard from "@/components/StatsCard";
import { apiFetch } from "@/lib/api";

export default function StatsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [bpiJwt, setBpiJwt] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const exchangeToken = useCallback(async () => {
    try {
      const res = await fetch("/api/bpi-login", { method: "POST" });
      const data = await res.json();
      if (res.ok) setBpiJwt(data.accessToken);
    } catch {
      setError("Failed to authenticate");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated" && !bpiJwt) exchangeToken();
    if (status === "unauthenticated") router.push("/");
  }, [status, bpiJwt, exchangeToken, router]);

  useEffect(() => {
    if (!bpiJwt) return;

    const fetchStats = async () => {
      setLoading(true);
      try {
        const data = await apiFetch("/merch/distributor/stats", {}, bpiJwt);
        setStats(data);
      } catch (err) {
        setError(err.message || "Failed to load stats");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [bpiJwt]);

  const distributedPct =
    stats?.totalOrders > 0
      ? Math.round((stats.fullyDistributed / stats.totalOrders) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-gray-950 p-4 md:p-8">
      {/* Header */}
      <div className="max-w-2xl mx-auto mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Spree Merch</h1>
          <p className="text-sm text-gray-400">Distribution Stats</p>
        </div>
        <div className="flex items-center gap-3">
          <a href="/distribute" className="text-sm text-gray-400 hover:text-white transition-colors">
            Distribute
          </a>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        {loading && (
          <p className="text-gray-400 text-center py-12">Loading stats...</p>
        )}

        {error && (
          <p className="text-red-400 text-center py-12">{error}</p>
        )}

        {stats && (
          <>
            {/* Progress bar */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col gap-3">
              <div className="flex justify-between text-sm text-gray-400">
                <span>Fully Distributed</span>
                <span className="text-white font-medium">{distributedPct}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div
                  className="bg-green-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${distributedPct}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 text-right">
                {stats.fullyDistributed} of {stats.totalOrders} orders complete
              </p>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <StatsCard label="Total Orders" value={stats.totalOrders} />
              <StatsCard label="Booked" value={stats.bookedOrders} color="text-blue-400" />
              <StatsCard label="Fully Distributed" value={stats.fullyDistributed} color="text-green-400" />
              <StatsCard label="Partially Distributed" value={stats.partiallyDistributed} color="text-amber-400" />
              <StatsCard label="Pending Collection" value={stats.pendingCollection} color="text-red-400" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
