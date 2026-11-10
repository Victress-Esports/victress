import { PartnerNav } from "@/components/app/PartnerNav";
import { StatusChip } from "@/components/app/StatusChip";
import { planLabel } from "@/content/partner";
import { requirePartner } from "@/lib/partner";

export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  const { org } = await requirePartner();
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-mute">Partner</p>
          <p className="font-display text-2xl font-bold">{org.name}</p>
        </div>
        <StatusChip tone="on">{planLabel(org.plan)}</StatusChip>
      </div>
      <PartnerNav />
      <div>{children}</div>
    </div>
  );
}
