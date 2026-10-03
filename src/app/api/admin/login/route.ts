import { ADMIN_COOKIE, adminCookieOptions, createAdminToken, isAdminConfigured, verifyAdminPassword } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ configured: isAdminConfigured() });
}

export async function POST(request: Request) {
  if (!isAdminConfigured()) return Response.json({ error: "Admin access is not configured." }, { status: 503 });
  const body = (await request.json().catch(() => null)) as { password?: unknown } | null;
  if (typeof body?.password !== "string" || !verifyAdminPassword(body.password)) {
    return Response.json({ error: "密码不正确。" }, { status: 401 });
  }

  const response = Response.json({ ok: true });
  response.headers.append("Set-Cookie", `${ADMIN_COOKIE}=${createAdminToken()}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${adminCookieOptions.maxAge}${adminCookieOptions.secure ? "; Secure" : ""}`);
  return response;
}

export async function DELETE() {
  const response = Response.json({ ok: true });
  response.headers.append("Set-Cookie", `${ADMIN_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  return response;
}
