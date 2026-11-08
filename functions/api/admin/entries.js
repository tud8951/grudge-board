import { requireAdmin } from "../../_lib/auth.js";
import { json, readJson, sameOrigin, validText } from "../../_lib/http.js";

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "Invalid request origin" }, 403);
  const unauthorized = await requireAdmin(request, env);
  if (unauthorized) return unauthorized;
  const body = await readJson(request);
  if (body.error) return body.error;
  const { name, description = "", story = "", tagId = null } = body.value;
  if (
    !validText(name, 100) ||
    typeof description !== "string" ||
    description.length > 2000 ||
    typeof story !== "string" ||
    story.length > 10000
  ) {
    return json({ error: "姓名须为 1 至 100 个字符、介绍最多 2000 个字符、故事最多 10000 个字符" }, 400);
  }
  if (tagId !== null && (!Number.isInteger(tagId) || tagId < 1)) return json({ error: "无效的标签" }, 400);
  if (tagId !== null && !(await env.DB.prepare("SELECT id FROM tags WHERE id = ?").bind(tagId).first())) {
    return json({ error: "标签不存在" }, 400);
  }
  const result = await env.DB.prepare(
    "INSERT INTO entries (name, description, story, sort_order, tag_id) VALUES (?, ?, ?, (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM entries), ?)",
  ).bind(name.trim(), description.trim(), story.trim(), tagId).run();
  return json({ id: result.meta.last_row_id }, 201);
}

export async function onRequestPut({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "Invalid request origin" }, 403);
  const unauthorized = await requireAdmin(request, env);
  if (unauthorized) return unauthorized;
  const body = await readJson(request);
  if (body.error) return body.error;
  const { ids } = body.value;
  if (!Array.isArray(ids) || ids.some((id) => !Number.isInteger(id) || id < 1) || new Set(ids).size !== ids.length) {
    return json({ error: "无效的排序列表" }, 400);
  }
  const current = await env.DB.prepare("SELECT id FROM entries ORDER BY sort_order, id").all();
  const requestedIds = new Set(ids);
  if (current.results.length !== ids.length || !current.results.every((entry) => requestedIds.has(entry.id))) {
    return json({ error: "排序列表与当前数据不一致，请刷新后重试" }, 409);
  }
  if (ids.length === 0) return json({ ok: true });
  await env.DB.batch(ids.map((id, index) =>
    env.DB.prepare("UPDATE entries SET sort_order = ? WHERE id = ?").bind(index, id),
  ));
  return json({ ok: true });
}
