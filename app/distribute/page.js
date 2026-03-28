"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import OtpInput from "@/components/OtpInput";
import CustomerCard from "@/components/CustomerCard";
import MerchTable from "@/components/MerchTable";
import { apiFetch } from "@/lib/api";

export default function DistributePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [bpiJwt, setBpiJwt] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [otp, setOtp] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState(null);

  const [order, setOrder] = useState(null);
  const [selected, setSelected] = useState([]);
  const [distributeLoading, setDistributeLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Exchange Google token for BPI JWT once session is available
  const exchangeToken = useCallback(async () => {
    setAuthLoading(true);
    try {
      const res = await fetch("/api/bpi-login", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || "Unauthorized");
        return;
      }
      setBpiJwt(data.accessToken);
    } catch {
      setAuthError("Failed to connect to server");
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated" && !bpiJwt) {
      exchangeToken();
    } else if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, bpiJwt, exchangeToken, router]);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleLookup = async () => {
    if (otp.length !== 6) return;
    setLookupLoading(true);
    setLookupError(null);
    setOrder(null);
    setSelected([]);

    try {
      const data = await apiFetch(
        "/merch/distributor/lookup",
        { method: "POST", body: JSON.stringify({ otp }) },
        bpiJwt
      );
      setOrder(data);
    } catch (err) {
      if (err.status === 404) {
        setLookupError("No booked order found for this OTP. Check the OTP or ask the customer to book first.");
      } else {
        setLookupError(err.message || "Lookup failed");
      }
    } finally {
      setLookupLoading(false);
    }
  };

  const handleToggle = (skuId) => {
    setSelected((prev) =>
      prev.includes(skuId) ? prev.filter((s) => s !== skuId) : [...prev, skuId]
    );
  };

  const handleDistribute = async () => {
    if (!selected.length || !order) return;
    setDistributeLoading(true);

    try {
      const data = await apiFetch(
        "/merch/distributor/distribute",
        {
          method: "POST",
          body: JSON.stringify({ orderId: order.orderId, skuIds: selected }),
        },
        bpiJwt
      );
      setOrder((prev) => ({ ...prev, items: data.items }));
      setSelected([]);
      showToast("Items marked as distributed!");
    } catch (err) {
      showToast(err.message || "Failed to mark items", "error");
    } finally {
      setDistributeLoading(false);
    }
  };

  const handleNext = () => {
    setOtp("");
    setOrder(null);
    setSelected([]);
    setLookupError(null);
  };

  const allDistributed = order?.items.every((i) => i.distributed);

  if (authLoading || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <span className="text-gray-400">Loading...</span>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-10 max-w-sm w-full flex flex-col gap-4 items-center">
          <p className="text-red-400 text-center">{authError}</p>
          <button
            onClick={() => signOut({ callbackUrl: "/?unauthorized=1" })}
            className="bg-gray-700 hover:bg-gray-600 text-white px-5 py-2 rounded-lg text-sm transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-4 md:p-8">
      {/* Header */}
      <div className="max-w-2xl mx-auto mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Spree Merch</h1>
          <p className="text-sm text-gray-400">Distributor Portal</p>
        </div>
        <div className="flex items-center gap-3">
          <a href="/stats" className="text-sm text-gray-400 hover:text-white transition-colors">
            Stats
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
        {/* OTP Input */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col gap-4">
          <h2 className="text-white font-semibold text-center">Enter Customer OTP</h2>
          <OtpInput value={otp} onChange={setOtp} disabled={lookupLoading} />
          {lookupError && (
            <p className="text-red-400 text-sm text-center">{lookupError}</p>
          )}
          <button
            onClick={handleLookup}
            disabled={otp.length !== 6 || lookupLoading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium rounded-lg py-3 transition-colors"
          >
            {lookupLoading ? "Looking up..." : "Look Up"}
          </button>
        </div>

        {/* Customer + Merch */}
        {order && (
          <>
            <CustomerCard
              name={order.name}
              bitsId={order.bitsId}
              email={order.email}
            />
            <MerchTable
              items={order.items}
              selected={selected}
              onToggle={handleToggle}
            />

            <div className="flex gap-3">
              <button
                onClick={handleDistribute}
                disabled={!selected.length || distributeLoading}
                className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium rounded-lg py-3 transition-colors"
              >
                {distributeLoading ? "Marking..." : `Mark as Distributed (${selected.length})`}
              </button>
              <button
                onClick={handleNext}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg py-3 transition-colors"
              >
                {allDistributed ? "Next Customer ✓" : "Next Customer"}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl text-sm font-medium shadow-lg transition-all ${
            toast.type === "error"
              ? "bg-red-600 text-white"
              : "bg-green-600 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
