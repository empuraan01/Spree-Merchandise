"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const unauthorized = searchParams.get("unauthorized");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-10 w-full max-w-sm flex flex-col items-center gap-6 shadow-xl">
        <div className="flex flex-col items-center gap-2">
          <span className="text-3xl font-bold text-white tracking-tight">Spree Merch</span>
          <span className="text-sm text-gray-400">Distributor Portal</span>
        </div>

        {unauthorized && (
          <div className="w-full bg-red-900/40 border border-red-700 text-red-300 text-sm rounded-lg px-4 py-3 text-center">
            You are not authorized as a distributor.
          </div>
        )}

        {error && !unauthorized && (
          <div className="w-full bg-red-900/40 border border-red-700 text-red-300 text-sm rounded-lg px-4 py-3 text-center">
            Sign-in failed. Please try again.
          </div>
        )}

        <button
          onClick={() => signIn("google", { callbackUrl: "/distribute" })}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-900 font-medium rounded-lg px-4 py-3 transition-colors"
        >
          <GoogleIcon />
          Sign in with Google
        </button>

        <p className="text-xs text-gray-500 text-center">
          Only authorized distributors can access this portal.
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
