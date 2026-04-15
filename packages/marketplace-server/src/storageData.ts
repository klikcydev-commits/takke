import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "../../..");
config({ path: join(repoRoot, ".env") });
config({ path: join(repoRoot, ".env.local"), override: true });

function getSupabase(): SupabaseClient {
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl?.trim() || !supabaseKey?.trim()) {
    throw new Error(
      "Supabase Storage requires SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  return createClient(supabaseUrl.trim(), supabaseKey.trim());
}

export type UploadedFileLike = {
  buffer: Buffer;
  mimetype: string;
  size: number;
};

export class StorageData {
  private readonly supabase = getSupabase();

  async uploadFile(
    file: UploadedFileLike,
    bucket: "documents" | "profiles" | "stores",
    path: string,
  ): Promise<string> {
    this.validateFile(file);

    const { data, error } = await this.supabase.storage
      .from(bucket)
      .upload(path, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    const { data: publicUrlData } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return publicUrlData.publicUrl;
  }

  async deleteFile(bucket: string, path: string): Promise<void> {
    const { error } = await this.supabase.storage.from(bucket).remove([path]);
    if (error) {
      throw new Error(`Delete failed: ${error.message}`);
    }
  }

  private validateFile(file: UploadedFileLike) {
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error("File size exceeds 5MB limit");
    }
    const allowedTypes = ["image/jpeg", "image/png", "application/pdf", "image/webp"];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error("Invalid file type. Allowed: JPG, PNG, WEBP, PDF");
    }
  }
}

export const storageData = new StorageData();
