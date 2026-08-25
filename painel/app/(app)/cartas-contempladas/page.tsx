import { PageHeader } from "@/components/page-header";
import { buscarCartasContempladas, type CartaContemplada } from "@/lib/cartas-contempladas";

const ROTULO_SEGMENTO: Record<string, { texto: string; classe: string }> = {
  imóvel: { texto: "Imóvel", classe: "bg-blue-100 text-blue-700" },
  veículo: { texto: "Veículo", classe: "bg-amber-100 text-amber-700" },
};

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function classeStatus(status: string) {
  const normalizado = status.toLowerCase();
  if (normalizado.includes("dispon")) return "bg-green-100 text-green-700";
  if (normalizado.includes("reserv")) return "bg-amber-100 text-amber-700";
  if (normalizado.includes("vend")) return "bg-neutral-200 text-neutral-600";
  return "bg-neutral-100 text-neutral-600";
}

function formatarData(data: string | null) {
  if (!data) return null;
  const parsed = new Date(`${data}T00:00:00-03:00`);
  if (Number.isNaN(parsed.getTime())) return data;
  return parsed.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export default async function CartasContempladasPage({
  searchParams,
}: {
  searchParams: Promise<{ segmento?: string; administradora?: string }>;
}) {
  const { segmento, administradora } = await searchParams;
  const { cartas, erro } = await buscarCartasContempladas();

  const administradoras = Array.from(new Set(cartas.map((c) => c.administradora))).sort();

  const cartasFiltradas = cartas.filter((carta) => {
    if (segmento && carta.segmento !== segmento) return false;
    if (administradora && carta.administradora !== administradora) return false;
    return true;
  });

  return (
    <>
      <PageHeader titulo="Cartas contempladas" />

      <main className="max-w-5xl px-6 py-6">
        <p className="mb-4 text-sm text-neutral-500">
          Cotas de consórcio já contempladas, à venda pelo sistema do parceiro.
        </p>

        {erro ? (
          <p className="rounded-lg border border-dashed border-red-300 bg-red-50 px-4 py-8 text-center text-sm text-red-600">
            {erro}
          </p>
        ) : (
          <>
            <form className="mb-4 flex flex-wrap items-end gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">
                  Segmento
                </label>
                <select
                  name="segmento"
                  defaultValue={segmento ?? ""}
                  className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
                >
                  <option value="">Todos</option>
                  <option value="imóvel">Imóvel</option>
                  <option value="veículo">Veículo</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">
                  Administradora
                </label>
                <select
                  name="administradora"
                  defaultValue={administradora ?? ""}
                  className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
                >
                  <option value="">Todas</option>
                  {administradoras.map((nome) => (
                    <option key={nome} value={nome}>
                      {nome}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
              >
                Filtrar
              </button>

              {(segmento || administradora) && (
                <a
                  href="/cartas-contempladas"
                  className="text-sm font-medium text-neutral-500 hover:text-neutral-700"
                >
                  Limpar filtro
                </a>
              )}
            </form>

            <p className="mb-4 text-sm text-neutral-500">
              {cartasFiltradas.length}{" "}
              {cartasFiltradas.length === 1 ? "carta encontrada" : "cartas encontradas"}
            </p>

            {cartasFiltradas.length === 0 ? (
              <p className="rounded-lg border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-400">
                Nenhuma carta encontrada com esse filtro
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {cartasFiltradas.map((carta) => (
                  <CardCarta key={carta.id} carta={carta} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}

function CardCarta({ carta }: { carta: CartaContemplada }) {
  const segmentoInfo = ROTULO_SEGMENTO[carta.segmento] ?? {
    texto: carta.segmento,
    classe: "bg-neutral-100 text-neutral-600",
  };
  const vencimento = formatarData(carta.vencimento);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {carta.administrator?.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={carta.administrator.logo}
              alt={carta.administradora}
              className="h-7 w-7 shrink-0 rounded object-contain"
            />
          ) : (
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-neutral-100 text-xs font-bold text-neutral-500">
              {carta.administradora.slice(0, 2).toUpperCase()}
            </span>
          )}
          <span className="truncate text-sm font-medium text-neutral-700">
            {carta.administradora}
          </span>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${segmentoInfo.classe}`}>
          {segmentoInfo.texto}
        </span>
      </div>

      <p className="text-2xl font-bold text-neutral-900">{formatarMoeda(carta.credito)}</p>

      <div className="grid grid-cols-3 gap-2 text-xs text-neutral-500">
        <div>
          <p className="font-medium text-neutral-700">{formatarMoeda(carta.entrada)}</p>
          <p>Entrada</p>
        </div>
        <div>
          <p className="font-medium text-neutral-700">{formatarMoeda(carta.parcela)}</p>
          <p>Parcela</p>
        </div>
        <div>
          <p className="font-medium text-neutral-700">{carta.prazo}x</p>
          <p>Prazo</p>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-neutral-100 pt-3">
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${classeStatus(carta.status)}`}>
          {carta.status}
        </span>
        {vencimento && <span className="text-xs text-neutral-400">Vence {vencimento}</span>}
      </div>
    </div>
  );
}
