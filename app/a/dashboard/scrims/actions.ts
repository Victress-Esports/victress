"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Result } from "@/app/a/dashboard/actions";
import { GAME_IDS } from "@/content/games";
import { MAX_SCRIM_BYTES, SCRIM_EXTENSIONS } from "@/content/provenance";
import { requireUser } from "@/lib/auth";
import { scrimUploadsEnabled } from "@/lib/dashboard";

const BUCKET = "scrim-uploads";
const fail = (message = "Something went wrong. Try again."): Result => ({ ok: false, message });

const recordSchema = z.object({
  game: z.enum(GAME_IDS),
  path: z.string().max(200),
  name: z.string().trim().min(1).max(120),
});

/**
 * Records a file the browser already stored in the player's own private folder. The size comes from Storage, not the client.
 * The file is stored only: nothing is parsed or analyzed.
 */
export async function recordScrimUploadAction(input: z.input<typeof recordSchema>): Promise<Result> {
  const { sb, user } = await requireUser();
  if (!scrimUploadsEnabled()) return fail("Uploads are not open yet.");
  const p = recordSchema.safeParse(input);
  if (!p.success) return fail();
  const { path, name, game } = p.data;
  const file = path.slice(user.id.length + 1);
  const ext = file.split(".").pop()?.toLowerCase() ?? "";
  if (!path.startsWith(`${user.id}/`) || !/^[0-9a-f-]{36}\.[a-z0-9]{2,5}$/.test(file) || !(SCRIM_EXTENSIONS as readonly string[]).includes(ext)) {
    return fail("That file type isn't supported.");
  }

  const { data: found } = await sb.storage.from(BUCKET).list(user.id, { search: file, limit: 1 });
  const obj = found?.find((f) => f.name === file);
  const size = Number((obj?.metadata as { size?: number } | null)?.size ?? 0);
  if (!obj || size <= 0 || size > MAX_SCRIM_BYTES) {
    await sb.storage.from(BUCKET).remove([path]);
    return fail("That file didn't upload. Try again.");
  }

  const { error } = await sb.from("scrim_uploads").insert({ profile_id: user.id, game, storage_path: path, original_name: name, size_bytes: size });
  if (error) {
    await sb.storage.from(BUCKET).remove([path]);
    return fail(error.message.includes("dashboard_limit") ? "You have reached the limit of 25 files. Remove one first." : undefined);
  }
  revalidatePath("/dashboard/scrims");
  return { ok: true, message: "Stored privately. It has not been analyzed." };
}

export async function deleteScrimUploadAction(id: string): Promise<Result> {
  const { sb, user } = await requireUser();
  if (!z.string().uuid().safeParse(id).success) return fail();
  const { data: row } = await sb.from("scrim_uploads").select("storage_path").eq("id", id).eq("profile_id", user.id).maybeSingle();
  if (!row) return fail();
  const { error: e1 } = await sb.storage.from(BUCKET).remove([row.storage_path]);
  if (e1) return fail();
  const { error: e2 } = await sb.from("scrim_uploads").delete().eq("id", id).eq("profile_id", user.id);
  if (e2) return fail();
  revalidatePath("/dashboard/scrims");
  return { ok: true, message: "File deleted." };
}
