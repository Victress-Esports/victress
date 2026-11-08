"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { savePrivacyAction } from "@/app/a/dashboard/privacy-actions";
import { ProfileCard } from "@/components/app/ProfileCard";
import { buttonClass } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/form";

type Fields = Record<"display_name" | "avatar" | "bio" | "team" | "stats" | "rank_role", boolean>;
type Settings = { directory_listed: boolean; search_indexable: boolean; show_on_leaderboards: boolean; public_fields: Fields };
type Full = {
  handle: string; displayName: string | null; avatarUrl: string | null; bio: string | null; teamName: string | null;
  game: string | null; role: string | null; rank: string | null; appHost: string;
};

const LABELS: { key: keyof Fields; label: string }[] = [
  { key: "display_name", label: "Display name" },
  { key: "avatar", label: "Photo" },
  { key: "bio", label: "Bio" },
  { key: "team", label: "Team" },
  { key: "rank_role", label: "Role and rank" },
];

/** Chooses which resume fields can be seen, using the same consent settings as /dashboard/privacy, with a live preview. */
export function ResumeVisibility({ initial, full }: { initial: Settings; full: Full }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [s, setS] = useState(initial);
  const [msg, setMsg] = useState("");
  const f = s.public_fields;
  const exposed = initial.directory_listed;

  function save() {
    start(async () => {
      const r = await savePrivacyAction(s);
      setMsg(r.message ?? "");
      if (r.ok) router.refresh();
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <p className="rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm text-mute">
          {exposed
            ? "Your profile is listed publicly. Only the fields ticked here are shown."
            : "Your profile is private. These choices apply when you list it publicly or share a private link."}{" "}
          <Link href="/dashboard/privacy" className="inline-block py-1 underline">
            Privacy and sharing
          </Link>
        </p>
        <fieldset className="mt-4 grid gap-2">
          <legend className="sr-only">Resume fields that can be seen</legend>
          {LABELS.map((l) => (
            <label key={l.key} className="flex min-h-11 items-center gap-3 rounded-xl border border-line bg-surface-2 px-4">
              <input
                type="checkbox"
                checked={f[l.key]}
                onChange={(e) => setS({ ...s, public_fields: { ...f, [l.key]: e.target.checked } })}
                className="h-5 w-5 accent-[#CF142B]"
              />
              <span className="text-sm font-semibold">{l.label}</span>
            </label>
          ))}
        </fieldset>
        <p className="mt-3 text-sm text-mute">Tournament history and highlights are private for now. They are not part of any public view or link.</p>
        <div className="mt-4 flex items-center gap-4">
          <button type="button" onClick={save} disabled={pending} className={buttonClass("primary")}>
            Save visibility
          </button>
          <FormMessage message={msg} />
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold text-mute">Preview of what others would see</p>
        <ProfileCard
          handle={full.handle}
          displayName={f.display_name ? full.displayName : null}
          avatarUrl={f.avatar ? full.avatarUrl : null}
          game={full.game}
          role={f.rank_role ? full.role : null}
          rank={f.rank_role ? full.rank : null}
          teamName={f.team ? full.teamName : null}
          appHost={full.appHost}
        />
        {f.bio && full.bio ? <p className="mt-3 text-sm text-mute">{full.bio}</p> : null}
      </div>
    </div>
  );
}
