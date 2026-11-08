import { requireAdmin } from "../../_lib/auth.js";
import { isValidColor, json, readJson, sameOrigin } from "../../_lib/http.js";

const FONT_STYLES = new Set(["gothic", "handwritten", "serif"]);

export async function onRequestPut({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "Invalid request origin" }, 403);
  const unauthorized = await requireAdmin(request, env);
  if (unauthorized) return unauthorized;
  const body = await readJson(request);
  if (body.error) return body.error;
  const { backgroundColor, textColor, fontStyle } = body.value;
  if (!isValidColor(backgroundColor) || !isValidColor(textColor) || !FONT_STYLES.has(fontStyle)) {
    return json({ error: "无效的主题设置" }, 400);
  }
  await env.DB.batch([
    env.DB.prepare("INSERT INTO settings (key, value) VALUES ('backgroundColor', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(backgroundColor),
    env.DB.prepare("INSERT INTO settings (key, value) VALUES ('textColor', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(textColor),
    env.DB.prepare("INSERT INTO settings (key, value) VALUES ('fontStyle', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(fontStyle),
  ]);
  return json({ ok: true });
}
