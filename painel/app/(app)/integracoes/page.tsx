import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { integracoes, STATUS_LABEL } from "@/lib/integracoes";
import { usuarioAutenticado, createClient } from "@/lib/supabase/server";

export default async function IntegracoesPage() {
  const { usuario } = await usuarioAutenticado();

  // Google Calendar é "conectado" ou não por empresa — a lista abaixo
  // descreve o desenho de cada integração, mas essa aqui precisa do
  // estado real dessa org específica.
  const supabase = await createClient();
  const { data: googleConectado } = await supabase.rpc("google_calendar_esta_conectado");

  // Z-API (WhatsApp) é uma coisa só, compartilhada pela plataforma inteira
  // (instância A/B configurada nas Secrets do Supabase) — não é por
  // empresa. Antes esse status ficava fixo em "Conectado" no código, sem
  // checar nada de verdade (Samuel pegou isso ao vivo: aparecia conectado
  // mesmo sem ninguém ter configurado). Reaproveita a mesma checagem que
  // já existia (verificar-zapi) — se não der pra chamar (não-admin, etc.),
  // assume não conectado, que é o mais seguro.
  let whatsappConectado = false;
  try {
    const { data: verificacao } = await supabase.functions.invoke<{
      instancias: { configurado: boolean; conectado?: boolean }[];
    }>("verificar-zapi");
    whatsappConectado =
      verificacao?.instancias?.some((i) => i.configurado && i.conectado === true) ?? false;
  } catch {
    whatsappConectado = false;
  }

  return (
    <>
      <PageHeader titulo="Integrações" />

      <main className="max-w-3xl px-6 py-6">
        <p className="mb-6 text-sm text-neutral-500">
          Canais e ferramentas que alimentam o CRM automaticamente, sem
          precisar digitar nada na mão. Clique numa pra ver os detalhes.
        </p>

        <div className="space-y-3">
          {integracoes(usuario!.publico_org).map((integracao) => {
            const status =
              integracao.id === "google-calendar"
                ? STATUS_LABEL[googleConectado === true ? "conectado" : "nao_conectado"]
                : STATUS_LABEL[integracao.status];
            return (
              <Link
                key={integracao.id}
                href={`/integracoes/${integracao.id}`}
                className="flex items-start gap-4 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
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
                    {integracao.descricaoCurta}
                  </p>
                </div>
                <span className="mt-1 shrink-0 text-neutral-300">›</span>
              </Link>
            );
          })}
        </div>
      </main>
    </>
  );
}
