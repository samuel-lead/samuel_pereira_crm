import { LinkLead } from "@/components/link-lead";

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}

export function LeadCard({
  id,
  nome,
  telefoneE164,
  badgeClasse,
  rodape,
}: {
  id: string;
  nome: string;
  telefoneE164: string | null;
  badgeClasse: string;
  rodape?: React.ReactNode;
}) {
  return (
    <LinkLead
      leadId={id}
      className="group block rounded-md border border-neutral-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start gap-2">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${badgeClasse}`}
        >
          {iniciais(nome)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-neutral-900 group-hover:underline">
            {nome}
          </p>
          {telefoneE164 && (
            <p className="truncate text-xs text-neutral-500">{telefoneE164}</p>
          )}
          {rodape}
        </div>
      </div>
    </LinkLead>
  );
}
