// POST /api/requests — a shopper (or anyone) sends a free-text shopping list.
// Body: { name, phone, items, location }
// Auth optional — logged-in shoppers get their id attached; anonymous is OK.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { normalizePhone } from "@/lib/format";
import { emitToOperator } from "@/lib/order-events";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const phone = normalizePhone(body?.phone || "");
    const items = typeof body?.items === "string" ? body.items.trim() : "";
    const location = typeof body?.location === "string" ? body.location.trim() : "";

    if (name.length < 2) {
      return NextResponse.json({ error: "Enter your name." }, { status: 400 });
    }
    if (!phone) {
      return NextResponse.json({ error: "Enter a valid phone number." }, { status: 400 });
    }
    if (items.length < 3) {
      return NextResponse.json(
        { error: "Tell us what you want us to shop for you." },
        { status: 400 }
      );
    }
    if (location.length < 3) {
      return NextResponse.json(
        { error: "Tell us where to deliver — at least a landmark." },
        { status: 400 }
      );
    }

    // Attach the logged-in shopper's id if available (so they can see their
    // own requests in their order history). Anonymous requests are allowed.
    const user = await getSessionUser();
    const shopperId = user && user.role === "shopper" ? user.id : null;

    const created = await db.customRequest.create({
      data: {
        shopperId,
        shopperName: name,
        shopperPhone: phone,
        itemsText: items.slice(0, 4000),
        location: location.slice(0, 500),
        status: "NEW",
      },
      select: { id: true },
    });

    // Notify the operator (sound + browser notification + toast).
    await emitToOperator("request:new", {
      requestId: created.id,
      shopperName: name,
      itemsText: items.slice(0, 200),
    });

    return NextResponse.json({ ok: true, requestId: created.id });
  } catch (e) {
    console.error("[requests/POST] error", e);
    return NextResponse.json({ error: "Could not submit your request." }, { status: 500 });
  }
}
