import { requireAdmin } from "../../_lib/auth.js";
import { json, readJson, sameOrigin } from "../../_lib/http.js";

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "Invalid request origin" }, 403);
  const unauthorized = await requireAdmin(request, env);
  if (unauthorized) return unauthorized;
  const body = await readJson(request);
  if (body.error) return body.error;
  const { ids, tagId } = body.value;
  if (
    !Array.isArray(ids) ||
    ids.length === 0 ||
    ids.length > 500 ||
    ids.some((id) => !Number.isInteger(id) || id < 1) ||
    new Set(ids).size !== ids.length
  ) {
    return json({ error: "请选择 1 至 500 条不同的人物记录" }, 400);
  }
  if (tagId !== null && (!Number.isInteger(tagId) || tagId < 1)) {
    return json({ error: "无效的标签" }, 400);
  }
  if (tagId !== null && !(await env.DB.prepare("SELECT id FROM tags WHERE id = ?").bind(tagId).first())) {
    return json({ error: "标签不存在" }, 400);
  }
  const selectedIds = JSON.stringify(ids);
  const result = await env.DB.prepare(
    `UPDATE entries
     SET tag_id = ?
     WHERE id IN (SELECT value FROM json_each(?))
       AND (SELECT COUNT(*) FROM entries WHERE id IN (SELECT value FROM json_each(?))) = json_array_length(?)`,
  ).bind(tagId, selectedIds, selectedIds, selectedIds).run();
  if (result.meta.changes !== ids.length) {
    return json({ error: "部分人物记录已不存在，请刷新后重试" }, 409);
  }
  return json({ ok: true, updated: ids.length });
}
