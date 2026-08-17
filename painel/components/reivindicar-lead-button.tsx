"use client";

import { reivindicarLead } from "@/lib/leads/actions";

export function ReivindicarLeadButton({ leadId }: { leadId: string }) {
  const acaoComId = reivindicarLead.bind(null, leadId);

  return (
    <form action={acaoComId}>
      <button
        type="submit"
        className="rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-amber-700"
      >
        Pegar esse lead pra mim
      </button>
    </form>
  );
}
