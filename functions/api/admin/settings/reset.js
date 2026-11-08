import { requireAdmin } from "../../../_lib/auth.js";
import { json, sameOrigin } from "../../../_lib/http.js";

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "Invalid request origin" }, 403);
  const unauthorized = await requireAdmin(request, env);
  if (unauthorized) return unauthorized;
  await env.DB.batch([
    env.DB.prepare("INSERT INTO settings (key, value) VALUES ('backgroundColor', '#000000') ON CONFLICT(key) DO UPDATE SET value = excluded.value"),
    env.DB.prepare("INSERT INTO settings (key, value) VALUES ('textColor', '#ff0000') ON CONFLICT(key) DO UPDATE SET value = excluded.value"),
    env.DB.prepare("INSERT INTO settings (key, value) VALUES ('fontStyle', 'gothic') ON CONFLICT(key) DO UPDATE SET value = excluded.value"),
  ]);
  return json({ ok: true });
}
