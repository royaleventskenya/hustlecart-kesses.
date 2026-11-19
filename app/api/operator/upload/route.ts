// POST /api/operator/upload — accepts a single image file (multipart/form-data),
// resizes it to max 800x800 with sharp, saves to /public/uploads/products/,
// and returns the public URL.
//
// Body (multipart): file=<binary>
// Allowed: image/jpeg, image/png, image/webp. Max size ~5MB.
import { NextRequest, NextResponse } from "next/server";
import { mkdir } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { getSessionUser } from "@/lib/session";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "products");
const PUBLIC_PREFIX = "/uploads/products";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  if (user.role !== "operator") {
    return NextResponse.json({ error: "Operator only" }, { status: 403 });
  }

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
  if (file.size === 0) {
    return NextResponse.json({ error: "File is empty." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large. Max 5MB." }, { status: 413 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: "Unsupported file type. Use JPG, PNG, or WebP." },
      { status: 415 }
    );
  }

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    await mkdir(UPLOAD_DIR, { recursive: true });
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const filename = `${id}.webp`;
    const filepath = path.join(UPLOAD_DIR, filename);
    await sharp(buf)
      .resize(800, 800, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(filepath);
    const url = `${PUBLIC_PREFIX}/${filename}`;
    return NextResponse.json({ url, filename, bytes: buf.length });
  } catch (e) {
    console.error("[operator/upload] error", e);
    return NextResponse.json(
      { error: "Could not process the image. Try another file." },
      { status: 500 }
    );
  }
}
