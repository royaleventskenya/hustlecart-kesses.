// POST /api/orders — place a new order (shopper only).
// Body: {
//   items: [{ productId, quantity }],
//   deliveryName, deliveryPhone, deliveryLocation, paymentMethod
// }
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { normalizePhone } from "@/lib/format";
import { emitToOperator } from "@/lib/order-events";

const DEFAULT_DELIVERY_FEE = 80; // fallback if no zone is selected

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Please log in first." }, { status: 401 });
    }
    if (user.role !== "shopper") {
      return NextResponse.json(
        { error: "Only shoppers can place orders." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { items, deliveryName, deliveryPhone, deliveryLocation, paymentMethod, scheduledFor, zoneId, deliveryLat, deliveryLng } = body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Your cart is empty." }, { status: 400 });
    }
    if (!deliveryName || typeof deliveryName !== "string" || deliveryName.trim().length < 2) {
      return NextResponse.json({ error: "Enter a delivery name." }, { status: 400 });
    }
    const phone = normalizePhone(deliveryPhone || "");
    if (!phone) {
      return NextResponse.json({ error: "Enter a valid delivery phone." }, { status: 400 });
    }
    if (!deliveryLocation || deliveryLocation.trim().length < 5) {
      return NextResponse.json(
        { error: "Tell us where to deliver (at least a landmark)." },
        { status: 400 }
      );
    }
    if (paymentMethod !== "cod" && paymentMethod !== "mpesa") {
      return NextResponse.json(
        { error: "Pick a valid payment method (cash on delivery or M-Pesa)." },
        { status: 400 }
      );
    }
    // scheduledFor: optional ISO string for scheduled deliveries. Must be in
    // the future if provided.
    let scheduledForDate: Date | null = null;
    if (typeof scheduledFor === "string" && scheduledFor.trim()) {
      const d = new Date(scheduledFor);
      if (!isNaN(d.getTime()) && d.getTime() > Date.now()) {
        scheduledForDate = d;
      }
    }

    // Validate each item & fetch the product (so we can snapshot price + name + costPrice).
    const itemRows: {
      productId: string;
      name: string;
      price: number;
      costPrice: number | null;
      quantity: number;
      stockBefore: number;
    }[] = [];
    let productsTotal = 0;

    for (const it of items) {
      const productId: string = it.productId;
      const quantity: number = Number(it.quantity);
      if (!productId || !Number.isInteger(quantity) || quantity < 1) {
        return NextResponse.json({ error: "Invalid cart item." }, { status: 400 });
      }
      const product = await db.product.findUnique({
        where: { id: productId },
        select: { id: true, name: true, price: true, costPrice: true, stock: true },
      });
      if (!product) {
        return NextResponse.json({ error: `Product not found.` }, { status: 400 });
      }
      if (product.stock < quantity) {
        return NextResponse.json(
          { error: `Only ${product.stock} × ${product.name} left in stock.` },
          { status: 400 }
        );
      }
      itemRows.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        costPrice: product.costPrice,
        quantity,
        stockBefore: product.stock,
      });
      productsTotal += product.price * quantity;
    }

    // Look up the delivery zone (if the shopper picked one) to get the fee.
    // Falls back to the default flat fee if no zone was selected.
    let deliveryFee = DEFAULT_DELIVERY_FEE;
    let deliveryZoneName: string | null = null;
    if (typeof zoneId === "string" && zoneId) {
      const zone = await db.deliveryZone.findUnique({
        where: { id: zoneId },
        select: { fee: true, name: true, active: true },
      });
      if (zone && zone.active) {
        deliveryFee = zone.fee;
        deliveryZoneName = zone.name;
      }
    }

    const total = productsTotal + deliveryFee;

    // Create the order in a transaction (so stock decrement is atomic).
    const order = await db.$transaction(async (tx) => {
      // Decrement stock for each product.
      for (const r of itemRows) {
        await tx.product.update({
          where: { id: r.productId },
          data: { stock: { decrement: r.quantity } },
        });
      }
      const created = await tx.order.create({
        data: {
          customerId: user.id,
          customerPhone: phone,
          customerName: deliveryName.trim(),
          deliveryLocation: deliveryLocation.trim(),
          deliveryLat: typeof deliveryLat === "number" ? deliveryLat : null,
          deliveryLng: typeof deliveryLng === "number" ? deliveryLng : null,
          paymentMethod,
          deliveryFee: deliveryFee,
          deliveryZoneName,
          total,
          status: "PLACED",
          scheduledFor: scheduledForDate,
          items: {
            create: itemRows.map((r) => ({
              productId: r.productId,
              name: r.name,
              price: r.price,
              costPrice: r.costPrice,
              quantity: r.quantity,
            })),
          },
          statusEvents: {
            create: {
              status: "PLACED",
              note: "Order received. Your HustleCart personal shopper will accept it shortly.",
            },
          },
        },
        select: { id: true },
      });
      return created;
    });

    // Notify the operator (sound + browser notification + toast) so they don't
    // miss the new order. Non-fatal — the DB write already succeeded.
    await emitToOperator("order:new", {
      orderId: order.id,
      customerName: deliveryName.trim(),
      total,
      itemCount: itemRows.reduce((s, r) => s + r.quantity, 0),
      scheduledFor: scheduledForDate?.toISOString() ?? null,
    });

    return NextResponse.json({ orderId: order.id, total, deliveryFee });
  } catch (e) {
    console.error("[orders/POST] error", e);
    return NextResponse.json(
      { error: "Could not place your order. Try again." },
      { status: 500 }
    );
  }
}

// GET /api/orders/mine handled in /api/orders/mine/route.ts
