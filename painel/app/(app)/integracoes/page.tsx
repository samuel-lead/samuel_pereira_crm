import { PageHeader } from "@/components/page-header";

type Integracao = {
  id: string;
  nome: string;
  descricao: string;
  status: "conectado" | "nao_conectado" | "em_breve";
  corIcone: string;
  letraIcone: string;
};

const INTEGRACOES: Integracao[] = [
  {
    id: "whatsapp",
    nome: "WhatsApp (Z-API)",
    descricao:
      "Canal principal do CRM — é por aqui que os leads chegam e os comandos por voz/texto são interpretados.",
    status: "conectado",
    corIcone: "bg-emerald-100 text-emerald-700",
    letraIcone: "W",
  },
  {
    id: "facebook-lead-ads",
    nome: "Facebook / Instagram Lead Ads",
    descricao:
      "Formulário nativo de anúncio — quando alguém preenche, o lead cai direto em Pré-vendas → Leads, sem responsável, pronto pra alguém reivindicar.",
    status: "nao_conectado",
    corIcone: "bg-sky-100 text-sky-700",
    letraIcone: "F",
  },
];

const STATUS_LABEL: Record<Integracao["status"], { texto: string; classe: string }> = {
  conectado: { texto: "Conectado", classe: "bg-emerald-100 text-emerald-700" },
  nao_conectado: { texto: "Não conectado", classe: "bg-neutral-200 text-neutral-600" },
  em_breve: { texto: "Em breve", classe: "bg-amber-100 text-amber-700" },
};

export default function IntegracoesPage() {
  return (
    <>
      <PageHeader titulo="Integrações" />

      <main className="max-w-3xl px-6 py-6">
        <p className="mb-6 text-sm text-neutral-500">
          Canais e ferramentas que alimentam o CRM automaticamente, sem
          precisar digitar nada na mão.
        </p>

        <div className="space-y-3">
          {INTEGRACOES.map((integracao) => {
            const status = STATUS_LABEL[integracao.status];
            return (
              <div
                key={integracao.id}
                className="flex items-start gap-4 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm"
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-base font-bold ${integracao.corIcone}`}
                >
                  {integracao.letraIcone}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-semibold text-neutral-900">
                      {integracao.nome}
                    </h2>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${status.classe}`}
                    >
                      {status.texto}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-neutral-500">
                    {integracao.descricao}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}
