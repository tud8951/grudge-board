import { clearSessionCookie, requireAdmin } from "../_lib/auth.js";
import { json, sameOrigin } from "../_lib/http.js";

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "Invalid request origin" }, 403);
  const unauthorized = await requireAdmin(request, env);
  if (unauthorized) return unauthorized;
  return json({ ok: true }, 200, { "Set-Cookie": clearSessionCookie() });
}
