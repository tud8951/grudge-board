import { requireAdmin } from "../../_lib/auth.js";
import { json, sameOrigin } from "../../_lib/http.js";

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "Invalid request origin" }, 403);
  const unauthorized = await requireAdmin(request, env);
  if (unauthorized) return unauthorized;
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return json({ error: "Content-Type must be application/json" }, 415);
  }
  const text = await request.text();
  if (text.length > 200_000) return json({ error: "批量导入内容不能超过 200 KB" }, 413);
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body) || typeof body.text !== "string" || body.text.length === 0) {
    return json({ error: "请填写导入内容" }, 400);
  }
  const lines = body.text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length > 500) return json({ error: "每次最多导入 500 条" }, 400);
  const parsed = [];
  const invalidLines = [];
  for (let i = 0; i < lines.length; i++) {
    const separator = lines[i].indexOf("+");
    if (separator <= 0) {
      invalidLines.push(i + 1);
      continue;
    }
    const name = lines[i].slice(0, separator).trim();
    const description = lines[i].slice(separator + 1).trim();
    if (!name || name.length > 100 || description.length > 2000) invalidLines.push(i + 1);
    else parsed.push({ name, description });
  }
  if (invalidLines.length) return json({ error: `以下行格式不正确（姓名+介绍）：${invalidLines.join(", ")}` }, 400);
  const maximum = await env.DB.prepare("SELECT COALESCE(MAX(sort_order), -1) AS maximum FROM entries").first();
  const startOrder = maximum.maximum + 1;
  await env.DB.batch(parsed.map(({ name, description }, index) =>
    env.DB.prepare("INSERT INTO entries (name, description, sort_order) VALUES (?, ?, ?)")
      .bind(name, description, startOrder + index),
  ));
  return json({ ok: true, imported: parsed.length }, 201);
}
