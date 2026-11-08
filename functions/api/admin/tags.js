import { requireAdmin } from "../../_lib/auth.js";
import { json, readJson, sameOrigin, validText } from "../../_lib/http.js";

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "Invalid request origin" }, 403);
  const unauthorized = await requireAdmin(request, env);
  if (unauthorized) return unauthorized;
  const body = await readJson(request);
  if (body.error) return body.error;
  if (!validText(body.value.name, 50)) return json({ error: "标签名须为 1 至 50 个字符" }, 400);
  try {
    const result = await env.DB.prepare(
      "INSERT INTO tags (name, sort_order) VALUES (?, (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM tags))",
    ).bind(body.value.name.trim()).run();
    return json({ id: result.meta.last_row_id, name: body.value.name.trim() }, 201);
  } catch (error) {
    if (String(error).includes("UNIQUE")) return json({ error: "该标签已存在" }, 409);
    throw error;
  }
}
