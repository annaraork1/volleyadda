import { logoutResponse } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return logoutResponse(req);
}
