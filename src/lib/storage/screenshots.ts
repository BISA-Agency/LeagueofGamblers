import { createServiceRoleClient } from "@/lib/supabase/server";

const BUCKET = "proof-bet-screenshots";
const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

export function validateScreenshotFile(file: File): string | null {
  if (file.size === 0) return "Kies een screenshot.";
  if (file.size > MAX_SIZE_BYTES) return "Screenshot mag maximaal 5 MB zijn.";
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "Alleen jpg, png, webp of heic bestanden zijn toegestaan.";
  }
  return null;
}

/** Stored path, not a URL — this bucket is private (see supabase/migrations/0002_storage_policies.sql). */
export async function uploadProofScreenshot(
  userId: string,
  betId: string,
  file: File
): Promise<string> {
  const supabase = createServiceRoleClient();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${userId}/${betId}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: true });
  if (error) throw new Error(`Screenshot uploaden mislukt: ${error.message}`);

  return path;
}

/**
 * A short-lived signed URL — call this only after checking the viewer is
 * allowed to see it (bet owner, or event_start has passed; see §5.4/§8).
 */
export async function getProofScreenshotSignedUrl(
  path: string,
  expiresInSeconds = 300
): Promise<string | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresInSeconds);
  if (error) return null;
  return data.signedUrl;
}
