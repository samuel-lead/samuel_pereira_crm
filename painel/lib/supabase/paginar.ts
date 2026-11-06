// O Supabase devolve no máximo 1000 linhas por consulta — passou disso, o
// resto some calado (sem erro). Empresa com mais de 1000 leads numa tela
// (ex.: Inove Gôndolas, 1.400+ em Pré-vendas depois de uma importação) via
// só uma parte. Este helper busca de 1000 em 1000 até acabar.
//
// Recebe uma função que monta a consulta do zero pra cada pedaço (a
// consulta do Supabase não pode ser reaproveitada depois de executada). A
// consulta precisa ter um .order() estável — sem isso o banco pode repetir
// ou pular linhas entre um pedaço e outro.
const TAMANHO_PAGINA = 1000;

export async function buscarTodas<T>(
  montar: (de: number, ate: number) => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<{ data: T[]; error: unknown }> {
  const todas: T[] = [];
  for (let de = 0; ; de += TAMANHO_PAGINA) {
    const { data, error } = await montar(de, de + TAMANHO_PAGINA - 1);
    if (error) return { data: todas, error };
    const pagina = data ?? [];
    todas.push(...pagina);
    if (pagina.length < TAMANHO_PAGINA) return { data: todas, error: null };
  }
}

// Divide uma lista em pedaços — pra filtros .in("coluna", lista) com muitos
// ids, que estouram o tamanho máximo do endereço da requisição.
export function emPedacos<T>(lista: T[], tamanho: number): T[][] {
  const pedacos: T[][] = [];
  for (let i = 0; i < lista.length; i += tamanho) pedacos.push(lista.slice(i, i + tamanho));
  return pedacos;
}

// Igual a buscarTodas, mas pede vários pedaços AO MESMO TEMPO (em ondas de 4):
// uma Base com 3.500 leads vira 1 ida e volta em vez de 4 em fila. Se a onda
// vier cheia, pede a próxima. Mesma exigência: .order() estável na consulta.
export async function buscarTodasEmParalelo<T>(
  montar: (de: number, ate: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  pedacosPorOnda = 4
): Promise<{ data: T[]; error: unknown }> {
  const todas: T[] = [];
  for (let inicio = 0; ; inicio += pedacosPorOnda) {
    const respostas = await Promise.all(
      Array.from({ length: pedacosPorOnda }, (_, i) => {
        const de = (inicio + i) * TAMANHO_PAGINA;
        return montar(de, de + TAMANHO_PAGINA - 1);
      })
    );
    let acabou = false;
    for (const resposta of respostas) {
      if (resposta.error) return { data: todas, error: resposta.error };
      const pagina = resposta.data ?? [];
      todas.push(...pagina);
      if (pagina.length < TAMANHO_PAGINA) {
        acabou = true;
        break;
      }
    }
    if (acabou) return { data: todas, error: null };
  }
}
