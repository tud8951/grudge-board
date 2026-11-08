import { json } from "./http.js";

const COOKIE_NAME = "chouren_admin";
const SESSION_SECONDS = 60 * 60 * 8;

function encodeBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function decodeBase64Url(value) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function sign(payload, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return encodeBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload))));
}

function constantTimeEqual(left, right) {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  let difference = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    difference |= (a[i] || 0) ^ (b[i] || 0);
  }
  return difference === 0;
}

export async function verifyPassword(provided, expected) {
  if (typeof provided !== "string" || typeof expected !== "string" || !expected) return false;
  return constantTimeEqual(provided, expected);
}

export async function createSession(secret) {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const payload = `${expiresAt}.${crypto.randomUUID()}`;
  const value = `${payload}.${await sign(payload, secret)}`;
  return {
    value,
    expiresAt,
    cookie: `${COOKIE_NAME}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_SECONDS}`,
  };
}

export async function isAuthenticated(request, secret) {
  if (typeof secret !== "string" || !secret) return false;
  const cookie = request.headers.get("Cookie") || "";
  const value = cookie.split(";").map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1);
  if (!value) return false;
  const parts = value.split(".");
  if (parts.length !== 3 || !/^\d+$/.test(parts[0])) return false;
  if (Number(parts[0]) <= Math.floor(Date.now() / 1000)) return false;
  try {
    const expected = await sign(`${parts[0]}.${parts[1]}`, secret);
    decodeBase64Url(parts[2]);
    return constantTimeEqual(parts[2], expected);
  } catch {
    return false;
  }
}

export async function requireAdmin(request, env) {
  if (await isAuthenticated(request, env.password)) return null;
  return json({ error: "Authentication required" }, 401);
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}
