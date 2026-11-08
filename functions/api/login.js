import { createSession, verifyPassword } from "../_lib/auth.js";
import { json, readJson, sameOrigin } from "../_lib/http.js";

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "Invalid request origin" }, 403);
  if (!env.password) return json({ error: "Admin password is not configured" }, 503);
  const body = await readJson(request);
  if (body.error) return body.error;
  if (!(await verifyPassword(body.value.password, env.password))) {
    return json({ error: "密码错误" }, 401);
  }
  const session = await createSession(env.password);
  return json({ ok: true }, 200, { "Set-Cookie": session.cookie });
}
