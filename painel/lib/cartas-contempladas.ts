// Cartas contempladas — cotas de consórcio já contempladas, à venda pelo
// sistema do parceiro (amigo do Samuel). É exclusivo do público
// imobiliário. Essa API é de terceiro, fora do nosso controle: pode ficar
// fora do ar ou mudar sem aviso — por isso todo erro vira uma mensagem
// amigável, nunca quebra a página.

const URL_CARTAS_CONTEMPLADAS = "https://credtfinanceira.contempladas.net/api/v2/cotas/list";

export type CartaContemplada = {
  id: number;
  segmento: string;
  credito: number;
  entrada: number;
  parcela: number;
  prazo: number;
  transferencia: number;
  taxa_analise: number;
  seguro: number;
  vencimento: string | null;
  status: string;
  observacoes: string | null;
  administradora: string;
  administrator: { id: number; name: string; logo: string | null } | null;
};

export async function buscarCartasContempladas(): Promise<{
  cartas: CartaContemplada[];
  erro: string | null;
}> {
  try {
    const resposta = await fetch(URL_CARTAS_CONTEMPLADAS, {
      next: { revalidate: 60 },
    });

    if (!resposta.ok) {
      return {
        cartas: [],
        erro: `O sistema do parceiro respondeu com erro (código ${resposta.status}). Tenta de novo em alguns minutos.`,
      };
    }

    const dados = await resposta.json();
    if (!Array.isArray(dados)) {
      return { cartas: [], erro: "O sistema do parceiro retornou num formato inesperado." };
    }

    return { cartas: dados as CartaContemplada[], erro: null };
  } catch {
    return {
      cartas: [],
      erro: "Não consegui falar com o sistema do parceiro agora. Tenta de novo em alguns minutos.",
    };
  }
}
