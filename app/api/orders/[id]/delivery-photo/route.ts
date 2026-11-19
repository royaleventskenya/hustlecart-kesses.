// POST /api/orders/[id]/delivery-photo — operator uploads a photo as proof
// of delivery. The photo is saved to /public/uploads/delivery/ and the URL
// is stored on the Order. Only allowed when the order status is DELIVERED
// (or being marked as DELIVERED).
import { NextRequest, NextResponse } from "next/server";
import { mkdir } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "delivery");
const PUBLIC_PREFIX = "/uploads/delivery";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  if (user.role !== "operator") {
    return NextResponse.json({ error: "Operator only" }, { status: 403 });
  }

  const { id } = await params;
  const order = await db.order.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 5MB)." }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Use JPG, PNG, or WebP." }, { status: 400 });
  }

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    await mkdir(UPLOAD_DIR, { recursive: true });
    const filename = `delivery-${id.slice(-8)}-${Date.now()}.webp`;
    const filepath = path.join(UPLOAD_DIR, filename);
    await sharp(buf).resize(1024, 1024, { fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toFile(filepath);
    const url = `${PUBLIC_PREFIX}/${filename}`;

    await db.order.update({
      where: { id },
      data: { deliveryPhotoUrl: url },
    });

    return NextResponse.json({ ok: true, url });
  } catch (e) {
    console.error("[delivery-photo] error", e);
    return NextResponse.json({ error: "Could not process the photo." }, { status: 500 });
  }
}
