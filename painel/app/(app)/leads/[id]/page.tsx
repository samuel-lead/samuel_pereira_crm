import { LeadDetalhe } from "@/components/lead-detalhe";

export default async function EditarLeadPage({
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
    <LeadDetalhe
      id={id}
      marcarReuniao={marcarReuniao}
      reuniaoAnteriorSumiu={reuniaoAnteriorSumiu}
      variante="pagina"
    />
  );
}
