import type { RotinaEquipe } from "@/lib/rotina/actions";
import { ATIVIDADES_ROTINA } from "@/lib/rotina/atividades";

const IDS_ATUAIS = new Set<string>(ATIVIDADES_ROTINA.map((a) => a.id));

function diaCurto(iso: string) {
  const [, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}

// Só o admin vê: quanto cada SDR marcou da rotina hoje (com o detalhe de
// cada atividade) e o resumo dos últimos 7 dias — pra saber se o time está
// mesmo usando o check. Conta só as atividades da rotina atual (marcações
// antigas de atividades que não existem mais são ignoradas).
export function RotinaEquipeAdmin({ equipe }: { equipe: RotinaEquipe }) {
  const total = ATIVIDADES_ROTINA.length;
  const hoje = equipe.dias[equipe.dias.length - 1];

  return (
    <section className="mx-6 mb-8 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-extrabold tracking-tight text-neutral-900">
        Acompanhamento da equipe
      </h2>
      <p className="mb-4 mt-0.5 text-xs text-neutral-500">
        Só você (admin) vê isso. Quanto cada SDR marcou da rotina hoje e nos últimos 7 dias.
      </p>

      {equipe.pessoas.length === 0 ? (
        <p className="py-6 text-center text-sm text-neutral-400">Nenhum SDR cadastrado ainda.</p>
      ) : (
        <div className="divide-y divide-neutral-100">
          {equipe.pessoas.map((pessoa) => {
            const feitasHoje = (pessoa.porDia[hoje] ?? []).filter((id) => IDS_ATUAIS.has(id));
            return (
              <div key={pessoa.id} className="py-3.5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-neutral-900">{pessoa.nome}</p>
                  <p className="text-sm font-extrabold text-neutral-900">
                    {feitasHoje.length}{" "}
                    <span className="text-xs font-medium text-neutral-400">de {total} hoje</span>
                  </p>
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {ATIVIDADES_ROTINA.map((a) => {
                    const feita = feitasHoje.includes(a.id);
                    return (
                      <span
                        key={a.id}
                        title={`${a.hora} · ${a.titulo}`}
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          feita
                            ? "bg-green-100 text-green-700"
                            : "bg-neutral-100 text-neutral-400"
                        }`}
                      >
                        {feita ? "✓" : "○"} {a.hora.split("–")[0]}
                      </span>
                    );
                  })}
                </div>

                <div className="mt-2.5 flex gap-1.5 overflow-x-auto">
                  {equipe.dias.map((dia) => {
                    const feitas = (pessoa.porDia[dia] ?? []).filter((id) => IDS_ATUAIS.has(id)).length;
                    return (
                      <div
                        key={dia}
                        className={`min-w-[52px] flex-1 rounded-lg border px-2 py-1.5 text-center ${
                          feitas === 0
                            ? "border-neutral-200 bg-neutral-50"
                            : feitas === total
                              ? "border-green-300 bg-green-50"
                              : "border-amber-200 bg-amber-50"
                        }`}
                      >
                        <p className="text-[10px] text-neutral-400">{diaCurto(dia)}</p>
                        <p className="text-sm font-bold text-neutral-800">
                          {feitas}/{total}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
