import { NextResponse } from "next/server";
import { getUserByEmail, newOpaqueToken, normalizeEmail, saveVerifyToken } from "@/lib/authStore";
import { appBaseUrl, sendMail } from "@/lib/mail";
import { hitRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
  }
  const email = String(body.email || "").trim();
  await hitRateLimit(`forgot:${normalizeEmail(email) || "x"}`, 5, 60 * 60 * 1000);

  // Always return ok to avoid email enumeration
  const user = await getUserByEmail(email);
  if (user && !user.disabled) {
    const token = newOpaqueToken();
    await saveVerifyToken({
      token,
      userId: user.id,
      purpose: "reset",
      expiresAt: Date.now() + 2 * 60 * 60 * 1000,
    });
    const link = `${appBaseUrl(req)}/auth/reset?token=${encodeURIComponent(token)}`;
    await sendMail({
      to: user.email,
      subject: "Reset your VolleyAdda password",
      text: `Reset your password: ${link}`,
      html: `<p><a href="${link}">Reset your password</a>. This link expires in 2 hours.</p>`,
    });
  }
  return NextResponse.json({ ok: true });
}
