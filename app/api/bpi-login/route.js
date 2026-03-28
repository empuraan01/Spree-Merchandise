import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// Called from the client after Google sign-in to exchange the Google id_token
// for a BPI distributor JWT.
export async function POST() {
  const session = await auth();

  if (!session?.googleIdToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  try {
    const res = await fetch(`${apiUrl}/merch/distributor/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: session.googleIdToken }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data.error || "Unauthorized" },
        { status: res.status }
      );
    }

    return NextResponse.json({ accessToken: data.accessToken });
  } catch {
    return NextResponse.json({ error: "Failed to reach BPI server" }, { status: 502 });
  }
}
