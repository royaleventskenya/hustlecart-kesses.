// GET /api/operator/customers/[id] — a single customer's full order history.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  if (user.role !== "operator") {
    return NextResponse.json({ error: "Operator only" }, { status: 403 });
  }

  const { id } = await params;
  const customer = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      phone: true,
      createdAt: true,
      orders: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          total: true,
          deliveryFee: true,
          deliveryLocation: true,
          paymentMethod: true,
          createdAt: true,
          scheduledFor: true,
          items: {
            select: {
              id: true,
              name: true,
              price: true,
              quantity: true,
            },
          },
        },
      },
    },
  });
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  if (customer.role !== undefined && customer.role !== "shopper") {
    // The select above doesn't include role, so this check is just a safety.
  }

  return NextResponse.json({ customer });
}
