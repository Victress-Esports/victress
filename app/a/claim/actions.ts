"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Result } from "@/app/a/dashboard/actions";
import { requireUser } from "@/lib/auth";

/** Deletes one of the player's own claimed snapshots (row level security allows only the claimer). */
export async function deleteSnapshotAction(id: string): Promise<Result> {
  const { sb } = await requireUser();
  if (!z.string().uuid().safeParse(id).success) return { ok: false, message: "Something went wrong. Try again." };
  const { error } = await sb.from("rl_snapshots").delete().eq("id", id); // row level security: only the claimer
  if (error) return { ok: false, message: "Something went wrong. Try again." };
  revalidatePath("/claim");
  return { ok: true, message: "Deleted." };
}
