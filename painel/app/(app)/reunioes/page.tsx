import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { FiltroCloserSelect } from "@/components/filtro-closer-select";

type ReuniaoLinha = {
  id: string;
  agendada_para: string;
  status: string;
  usuario_id: string;
  closer_id: string | null;
  lead_id: string;
  leads: { id: string; nome: string; arquivado_em: string | null } | null;
};

const STATUS_LABEL: Record<string, { texto: string; classe: string }> = {
  marcada: { texto: "Marcada", classe: "bg-sky-100 text-sky-700" },
  realizada: { texto: "Realizada", classe: "bg-emerald-100 text-emerald-700" },
  nao_compareceu: { texto: "Não compareceu", classe: "bg-red-100 text-red-700" },
};

function formatarData(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function ReunioesPage({
  searchParams,
}: {
  searchParams: Promise<{ closer?: string }>;
}) {
  const { closer: closerFiltro } = await searchParams;
  const supabase = await createClient();

  let consulta = supabase
    .from("reunioes")
    .select("id, agendada_para, status, usuario_id, closer_id, lead_id, leads!inner(id, nome, arquivado_em)")
    .is("leads.arquivado_em", null)
    .order("agendada_para", { ascending: false });

  if (closerFiltro) {
    consulta = consulta.eq("closer_id", closerFiltro);
  }

  const [{ data: reunioesData }, { data: usuariosData }] = await Promise.all([
    consulta,
    supabase.from("usuarios").select("id, nome, funcao").order("nome"),
  ]);

  const reunioes = (reunioesData ?? []) as unknown as ReuniaoLinha[];
  const usuarios = usuariosData ?? [];
  const closers = usuarios.filter((u) => u.funcao === "closer");
  const nomeUsuario = (id: string | null) => usuarios.find((u) => u.id === id)?.nome ?? "—";

  return (
    <>
      <PageHeader titulo="Reuniões" />

      <main className="px-6 py-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-neutral-500">
            {reunioes.length} {reunioes.length === 1 ? "reunião" : "reuniões"}
          </p>
          <FiltroCloserSelect closers={closers} valorInicial={closerFiltro} />
        </div>

        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white shadow-sm">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
                <th className="px-4 py-3 font-medium">Data e hora</th>
                <th className="px-4 py-3 font-medium">Lead</th>
                <th className="px-4 py-3 font-medium">SDR</th>
                <th className="px-4 py-3 font-medium">Closer</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {reunioes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-neutral-400">
                    Nenhuma reunião encontrada
                  </td>
                </tr>
              ) : (
                reunioes.map((reuniao) => {
                  const status = STATUS_LABEL[reuniao.status] ?? {
                    texto: reuniao.status,
                    classe: "bg-neutral-100 text-neutral-600",
                  };
                  return (
                    <tr key={reuniao.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                      <td className="px-4 py-3 text-neutral-600">
                        {formatarData(reuniao.agendada_para)}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/leads/${reuniao.lead_id}`}
                          className="font-medium text-neutral-900 hover:underline"
                        >
                          {reuniao.leads?.nome ?? "—"}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        {nomeUsuario(reuniao.usuario_id)}
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        {reuniao.closer_id ? nomeUsuario(reuniao.closer_id) : "Ainda não definido"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${status.classe}`}
                        >
                          {status.texto}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
