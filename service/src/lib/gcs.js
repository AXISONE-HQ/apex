import crypto from "node:crypto";
import { Storage } from "@google-cloud/storage";

export const CLUB_LOGO_BUCKET = process.env.CLUB_LOGO_BUCKET || "apex-v1-488611-assets";

export const ALLOWED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

export const MAX_LOGO_BYTES = 5 * 1024 * 1024; // 5MB

export function sanitizeImageExt(contentType) {
  if (contentType === "image/png") return "png";
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/webp") return "webp";
  return null;
}

export function newClubLogoObjectPath({ orgId, contentType }) {
  const ext = sanitizeImageExt(contentType);
  if (!ext) return null;
  const id = crypto.randomUUID();
  return `club-logos/${orgId}/${id}.${ext}`;
}

function storageClient() {
  // Uses Application Default Credentials (ADC) in Cloud Run.
  // Locally, `gcloud auth application-default login` can provide ADC.
  return new Storage();
}

export async function signV4UploadUrl({ objectPath, contentType, expiresMinutes = 15 }) {
  const storage = storageClient();
  const bucket = storage.bucket(CLUB_LOGO_BUCKET);
  const file = bucket.file(objectPath);

  const [url] = await file.getSignedUrl({
    version: "v4",
    action: "write",
    expires: Date.now() + expiresMinutes * 60 * 1000,
    contentType,
  });

  return url;
}

export async function signV4ReadUrl({ objectPath, expiresMinutes = 60 }) {
  const storage = storageClient();
  const bucket = storage.bucket(CLUB_LOGO_BUCKET);
  const file = bucket.file(objectPath);

  const [url] = await file.getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + expiresMinutes * 60 * 1000,
  });

  return url;
}

export async function headObject({ objectPath }) {
  const storage = storageClient();
  const bucket = storage.bucket(CLUB_LOGO_BUCKET);
  const file = bucket.file(objectPath);

  // getMetadata throws if not found.
  const [meta] = await file.getMetadata();
  const size = Number(meta.size || 0);
  const contentType = meta.contentType || "";

  return { size, contentType, meta };
}
