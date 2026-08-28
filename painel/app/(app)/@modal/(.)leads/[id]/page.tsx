import { ModalLead } from "@/components/modal-lead";
import { LeadDetalhe } from "@/components/lead-detalhe";

// Rota interceptada: mora em app/(app)/@modal (slot renderizado pelo
// layout raiz, app/(app)/layout.tsx) — por isso pega QUALQUER navegação
// client-side pra /leads/[id] vinda de dentro do app (Kanban, Base,
// Vendas, Atividades, Reuniões, etc.), não só de dentro de /leads/*. A
// tela por baixo continua montada, só aparece o pop-up por cima. Visitar o
// link direto (ou dar F5) ignora isso e cai na página cheia normal
// (app/(app)/leads/[id]/page.tsx).
export default async function LeadModalPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    marcarReuniao?: string;
    reuniaoAnteriorSumiu?: string;
  }>;
}) {
  const { id } = await params;
  const { marcarReuniao, reuniaoAnteriorSumiu } = await searchParams;

  return (
    <ModalLead>
      <LeadDetalhe
        id={id}
        marcarReuniao={marcarReuniao}
        reuniaoAnteriorSumiu={reuniaoAnteriorSumiu}
        variante="modal"
      />
    </ModalLead>
  );
}
