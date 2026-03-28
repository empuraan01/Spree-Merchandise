const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Fetch wrapper that attaches the BPI JWT from the session
export async function apiFetch(path, options = {}, bpiJwt) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(bpiJwt ? { Authorization: `Bearer ${bpiJwt}` } : {}),
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const error = new Error(data.error || data.message || "Request failed");
    error.status = res.status;
    throw error;
  }

  return data;
}
