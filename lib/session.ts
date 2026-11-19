// Session helper for HustleCart Kesses
// We use a simple httpOnly cookie `hc_session=<userId>` set by /api/auth/verify.
import { cookies } from "next/headers";
import { db } from "@/lib/db";

export type SessionUser = {
  id: string;
  phone: string;
  name: string;
  role: "shopper" | "operator";
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const cookie = store.get("hc_session");
  if (!cookie?.value) return null;
  const user = await db.user.findUnique({
    where: { id: cookie.value },
    select: { id: true, phone: true, name: true, role: true },
  });
  if (!user) return null;
  if (user.role !== "shopper" && user.role !== "operator") return null;
  return user as SessionUser;
}
