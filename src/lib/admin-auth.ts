import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "knowme_admin";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;

function secret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "";
}

function signature(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function isAdminConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD && secret());
}

export function verifyAdminPassword(input: string) {
  const expected = process.env.ADMIN_PASSWORD ?? "";
  if (!expected || input.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(input), Buffer.from(expected));
}

export function createAdminToken() {
  const expires = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const value = `admin.${expires}`;
  return `${value}.${signature(value)}`;
}

export function verifyAdminToken(token: string | undefined) {
  if (!token || !isAdminConfigured()) return false;
  const [role, expiry, providedSignature] = token.split(".");
  if (role !== "admin" || !expiry || !providedSignature || Number(expiry) < Math.floor(Date.now() / 1000)) return false;
  const expected = signature(`${role}.${expiry}`);
  if (expected.length !== providedSignature.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(providedSignature));
}

export async function isAdminSession() {
  const cookieStore = await cookies();
  return verifyAdminToken(cookieStore.get(ADMIN_COOKIE)?.value);
}

export const adminCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
};
