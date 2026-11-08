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

export async function onRequestPut({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "Invalid request origin" }, 403);
  const unauthorized = await requireAdmin(request, env);
  if (unauthorized) return unauthorized;
  const body = await readJson(request);
  if (body.error) return body.error;
  const { ids } = body.value;
  if (!Array.isArray(ids) || ids.some((id) => !Number.isInteger(id) || id < 1) || new Set(ids).size !== ids.length) {
    return json({ error: "无效的标签排序列表" }, 400);
  }
  const current = await env.DB.prepare("SELECT id FROM tags ORDER BY sort_order, id").all();
  const requestedIds = new Set(ids);
  if (current.results.length !== ids.length || !current.results.every((tag) => requestedIds.has(tag.id))) {
    return json({ error: "标签列表已变化，请刷新后重试" }, 409);
  }
  if (ids.length === 0) return json({ ok: true });
  await env.DB.batch(ids.map((id, index) =>
    env.DB.prepare("UPDATE tags SET sort_order = ? WHERE id = ?").bind(index, id),
  ));
  return json({ ok: true });
}
