import { requireAdmin } from "../../../_lib/auth.js";
import { json, readJson, sameOrigin, validText } from "../../../_lib/http.js";

export async function onRequestPatch({ request, env, params }) {
  if (!sameOrigin(request)) return json({ error: "Invalid request origin" }, 403);
  const unauthorized = await requireAdmin(request, env);
  if (unauthorized) return unauthorized;
  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1) return json({ error: "无效的数据编号" }, 400);
  const body = await readJson(request);
  if (body.error) return body.error;
  const { name, description = "", tagId = null } = body.value;
  if (!validText(name, 100) || typeof description !== "string" || description.length > 2000) {
    return json({ error: "姓名须为 1 至 100 个字符，介绍最多 2000 个字符" }, 400);
  }
  if (tagId !== null && (!Number.isInteger(tagId) || tagId < 1)) return json({ error: "无效的标签" }, 400);
  if (tagId !== null && !(await env.DB.prepare("SELECT id FROM tags WHERE id = ?").bind(tagId).first())) {
    return json({ error: "标签不存在" }, 400);
  }
  const result = await env.DB.prepare(
    "UPDATE entries SET name = ?, description = ?, tag_id = ? WHERE id = ?",
  ).bind(name.trim(), description.trim(), tagId, id).run();
  if (!result.meta.changes) return json({ error: "数据不存在" }, 404);
  return json({ ok: true });
}

export async function onRequestDelete({ request, env, params }) {
  if (!sameOrigin(request)) return json({ error: "Invalid request origin" }, 403);
  const unauthorized = await requireAdmin(request, env);
  if (unauthorized) return unauthorized;
  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1) return json({ error: "无效的数据编号" }, 400);
  const result = await env.DB.prepare("DELETE FROM entries WHERE id = ?").bind(id).run();
  if (!result.meta.changes) return json({ error: "数据不存在" }, 404);
  return json({ ok: true });
}
