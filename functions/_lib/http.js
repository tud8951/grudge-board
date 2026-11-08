export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}

export async function readJson(request) {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return { error: json({ error: "Content-Type must be application/json" }, 415) };
  }
  try {
    const value = await request.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return { error: json({ error: "JSON body must be an object" }, 400) };
    }
    return { value };
  } catch {
    return { error: json({ error: "Invalid JSON body" }, 400) };
  }
}

export function isValidColor(value) {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

export function validText(value, maxLength) {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= maxLength;
}

export function sameOrigin(request) {
  const origin = request.headers.get("Origin");
  return !origin || origin === new URL(request.url).origin;
}
