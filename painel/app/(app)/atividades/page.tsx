import { createClient, usuarioAutenticado } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { LinkLead } from "@/components/link-lead";
import { Reuniao, reunioes as palavraReunioes } from "@/lib/terminologia";

type InteracaoComLead = {
  id: string;
  tipo: string | null;
  canal: string | null;
  conteudo: string | null;
  ocorreu_em: string;
  lead_id: string;
  usuario_id: string;
  leads: { nome: string } | null;
};

type ReuniaoComLead = {
  id: string;
  agendada_para: string;
  status: string;
  resultado: string | null;
  lead_id: string;
  usuario_id: string;
  leads: { nome: string } | null;
};

type ItemFeed = {
  key: string;
  data: string;
  leadId: string;
  leadNome: string;
  titulo: string;
  detalhe: string | null;
  cor: string;
  responsavelId: string;
};

function formatarData(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AtividadesPage() {
  const supabase = await createClient();
  const { usuario } = await usuarioAutenticado();
  const publicoOrg = usuario!.publico_org;

  const [{ data: interacoesData }, { data: reunioesData }, { data: usuariosData }] = await Promise.all([
    supabase
      .from("interacoes")
      .select("id, tipo, canal, conteudo, ocorreu_em, lead_id, usuario_id, leads(nome)")
      .is("excluido_em", null)
      .order("ocorreu_em", { ascending: false })
      .limit(50),
    supabase
      .from("reunioes")
      .select("id, agendada_para, status, resultado, lead_id, usuario_id, leads(nome)")
      .order("agendada_para", { ascending: false })
      .limit(50),
    supabase.from("usuarios").select("id, nome"),
  ]);

  const interacoes = (interacoesData ?? []) as unknown as InteracaoComLead[];
  const reunioes = (reunioesData ?? []) as unknown as ReuniaoComLead[];
  const nomePorUsuario = new Map((usuariosData ?? []).map((u) => [u.id, u.nome]));

  const itens: ItemFeed[] = [
    ...interacoes.map((i) => ({
      key: `interacao-${i.id}`,
      data: i.ocorreu_em,
      leadId: i.lead_id,
      leadNome: i.leads?.nome ?? "Lead removido",
      titulo: i.tipo ?? "Interação",
      detalhe: i.conteudo,
      cor: "border-neutral-300",
      responsavelId: i.usuario_id,
    })),
    ...reunioes.map((r) => ({
      key: `reuniao-${r.id}`,
      data: r.agendada_para,
      leadId: r.lead_id,
      leadNome: r.leads?.nome ?? "Lead removido",
      titulo: `${Reuniao(publicoOrg)} · ${r.status}`,
      detalhe: r.resultado,
      cor: "border-amber-400",
      responsavelId: r.usuario_id,
    })),
  ].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  return (
    <>
      <PageHeader titulo="Atividades" />

      <main className="px-6 py-6">
        <p className="mb-4 text-sm text-neutral-500">
          Últimas interações e {palavraReunioes(publicoOrg)} registradas, de todos os leads.
        </p>

        {itens.length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-300 bg-white px-6 py-16 text-center">
            <p className="text-sm text-neutral-400">
              Nenhuma atividade registrada ainda. Notas e {palavraReunioes(publicoOrg)} aparecem
              aqui assim que você registrar algo na página de um lead.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {itens.map((item) => (
              <li
                key={item.key}
                className={`rounded-lg border-l-4 bg-white p-4 shadow-sm ${item.cor}`}
              >
                <div className="flex items-center justify-between">
                  <LinkLead
                    leadId={item.leadId}
                    className="text-sm font-semibold text-neutral-900 hover:underline"
                  >
                    {item.leadNome}
                  </LinkLead>
                  <span className="text-xs text-neutral-400">
                    {formatarData(item.data)}
                  </span>
                </div>
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-neutral-500">
                  {item.titulo}
                </p>
                {item.detalhe && (
                  <p className="mt-1 text-sm text-neutral-600">{item.detalhe}</p>
                )}
                <p className="mt-1 text-xs text-neutral-400">
                  Responsável: {nomePorUsuario.get(item.responsavelId) ?? "—"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
