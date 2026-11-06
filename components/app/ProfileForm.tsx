"use client";

import Image from "next/image";
import { useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { buttonClass } from "@/components/ui/Button";
import { Field, FormMessage, inputClass } from "@/components/ui/form";
import { changeHandleAction, setAvatarAction, setSearchVisibilityAction, updateProfileAction } from "@/app/a/dashboard/actions";
import { supabaseBrowser } from "@/lib/supabase/client";

const MAX_BYTES = 8 * 1024 * 1024; // before resizing; the stored image is ~512px

export function ProfileForm({ displayName, bio }: { displayName: string; bio: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState(displayName);
  const [text, setText] = useState(bio);
  const [msg, setMsg] = useState("");

  function save(e: FormEvent) {
    e.preventDefault();
    start(async () => {
      const r = await updateProfileAction({ display_name: name, bio: text });
      setMsg(r.message ?? "");
      if (r.ok) router.refresh();
    });
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      <Field id="pf-name" label="Display name">
        <input id="pf-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} className={inputClass} />
      </Field>
      <Field id="pf-bio" label="Bio" hint={`${text.length}/280`}>
        <textarea
          id="pf-bio"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={280}
          rows={3}
          className={`${inputClass} py-3`}
        />
      </Field>
      <button type="submit" disabled={pending} className={buttonClass("primary", "w-full sm:w-auto")}>
        {pending ? "Saving…" : "Save"}
      </button>
      <FormMessage message={msg} />
    </form>
  );
}

/** Resize to a 512px square in the browser (also strips metadata), upload to the user's own folder, then record the URL. */
async function toSquareWebp(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const side = Math.min(bmp.width, bmp.height);
  canvas
    .getContext("2d")!
    .drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, size, size);
  return await new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("encode"))), "image/webp", 0.9));
}

export function AvatarUploader({ userId, avatarUrl, initial }: { userId: string; avatarUrl: string | null; initial: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) return setMsg("Use a PNG, JPG or WebP image.");
    if (file.size > MAX_BYTES) return setMsg("That image is too large. Try one under 8 MB.");
    setBusy(true);
    setMsg("");
    try {
      const sb = supabaseBrowser();
      const path = `${userId}/avatar-${Date.now()}.webp`;
      const { error } = await sb.storage.from("avatars").upload(path, await toSquareWebp(file), {
        contentType: "image/webp",
        cacheControl: "31536000",
      });
      if (error) throw error;
      const { data } = sb.storage.from("avatars").getPublicUrl(path);
      const r = await setAvatarAction(data.publicUrl);
      if (!r.ok) throw new Error(r.message);
      // Tidy up older uploads in this user's folder.
      const { data: files } = await sb.storage.from("avatars").list(userId);
      const old = (files ?? []).map((f) => `${userId}/${f.name}`).filter((p) => p !== path);
      if (old.length) await sb.storage.from("avatars").remove(old);
      setMsg("Photo updated.");
      router.refresh();
    } catch {
      setMsg("Couldn't upload that photo. Try another.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove() {
    setBusy(true);
    const r = await setAvatarAction(null);
    if (r.ok) {
      const sb = supabaseBrowser();
      const { data: files } = await sb.storage.from("avatars").list(userId);
      if (files?.length) await sb.storage.from("avatars").remove(files.map((f) => `${userId}/${f.name}`));
      router.refresh();
    }
    setMsg(r.message ?? "");
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        {avatarUrl ? (
          <Image src={avatarUrl} alt="Your current photo" width={80} height={80} className="h-20 w-20 rounded-full object-cover" />
        ) : (
          <div aria-hidden className="grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-crimson to-warm-coral font-display text-3xl font-bold">
            {initial}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <input
            ref={input}
            id="avatar-file"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <label
            htmlFor="avatar-file"
            className={`${buttonClass("secondary", "cursor-pointer")} ${busy ? "pointer-events-none opacity-60" : ""} focus-within:outline`}
          >
            {busy ? "Working…" : avatarUrl ? "Change photo" : "Upload photo"}
          </label>
          {avatarUrl ? (
            <button type="button" onClick={remove} disabled={busy} className={buttonClass("ghost")}>
              Remove
            </button>
          ) : null}
        </div>
      </div>
      <FormMessage message={msg} />
    </div>
  );
}

/** `lockedUntil` is a formatted date when a name change is on cooldown, otherwise null (decided on the server). */
export function HandleForm({ handle, lockedUntil, appHost }: { handle: string; lockedUntil: string | null; appHost: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [value, setValue] = useState(handle);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);

  const locked = lockedUntil !== null;

  function submit(e: FormEvent) {
    e.preventDefault();
    start(async () => {
      const r = await changeHandleAction(value);
      setMsg(r.message ?? "");
      setOk(r.ok);
      if (r.ok) router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <Field
        id="pf-handle"
        label="Your link"
        hint={locked ? `You can change your name once every 30 days. Next change: ${lockedUntil}.` : "You can change your name once every 30 days."}
      >
        <div className="flex min-h-12 items-center rounded-xl border border-line bg-surface pl-4 focus-within:border-white">
          <span className="select-none text-mute" aria-hidden>
            {appHost}/
          </span>
          <input
            id="pf-handle"
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/\s/g, ""))}
            disabled={locked}
            maxLength={20}
            autoCapitalize="none"
            spellCheck={false}
            className="w-full min-w-0 flex-1 bg-transparent py-3 font-semibold text-white focus-visible:outline-none disabled:opacity-60"
          />
        </div>
      </Field>
      <button type="submit" disabled={pending || locked || value === handle} className={buttonClass("secondary", "w-full sm:w-auto")}>
        {pending ? "Checking…" : "Change name"}
      </button>
      <FormMessage message={msg} ok={ok} />
    </form>
  );
}

/** Opt-in to search engines. Off by default; the profile stays viewable by direct link either way. */
export function SearchVisibilityToggle({ initial }: { initial: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [on, setOn] = useState(initial);
  const [msg, setMsg] = useState("");

  function flip() {
    const next = !on;
    setOn(next); // optimistic; undone if the save fails
    start(async () => {
      const r = await setSearchVisibilityAction(next);
      if (!r.ok) setOn(!next);
      setMsg(r.message ?? "");
      if (r.ok) router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p id="search-visibility-label" className="font-semibold">
            Show my profile in search engines
          </p>
          <p id="search-visibility-help" className="mt-1 text-sm text-mute">
            Off by default. When it&apos;s off, search engines are asked not to list your profile. Anyone with your link can still open it.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-labelledby="search-visibility-label"
          aria-describedby="search-visibility-help"
          disabled={pending}
          onClick={flip}
          className={`relative mt-1 inline-flex h-8 w-14 shrink-0 items-center rounded-full border transition-colors disabled:opacity-60 ${
            on ? "border-crimson bg-crimson" : "border-line bg-surface-2"
          }`}
        >
          <span
            aria-hidden
            className={`inline-block h-6 w-6 rounded-full bg-white transition-transform ${on ? "translate-x-7" : "translate-x-1"}`}
          />
          <span className="sr-only">{on ? "On" : "Off"}</span>
        </button>
      </div>
      <FormMessage message={msg} />
    </div>
  );
}
