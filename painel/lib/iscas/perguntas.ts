// Perguntas que quem cria o formulário de captura escolhe (Samuel, 13/11/26).
// Nome e WhatsApp são sempre fixos; as perguntas abaixo são as extras.
export type PerguntaFormulario = {
  id: string;
  rotulo: string;
  tipo: "texto" | "opcoes";
  opcoes: string[];
  obrigatoria: boolean;
};

export const MAX_PERGUNTAS = 12;

// Sugestões de um clique no construtor (mercado imobiliário).
export const PERGUNTAS_SUGERIDAS: Omit<PerguntaFormulario, "id">[] = [
  { rotulo: "Qual tipo de imóvel você procura?", tipo: "opcoes", opcoes: ["Casa", "Apartamento", "Terreno", "Sala comercial"], obrigatoria: false },
  { rotulo: "Em qual região ou bairro?", tipo: "texto", opcoes: [], obrigatoria: false },
  { rotulo: "Quanto pretende investir?", tipo: "opcoes", opcoes: ["Até R$ 200 mil", "R$ 200 a 400 mil", "R$ 400 a 700 mil", "Acima de R$ 700 mil"], obrigatoria: false },
  { rotulo: "Quando pretende comprar?", tipo: "opcoes", opcoes: ["Agora", "Em até 3 meses", "Em até 6 meses", "Só pesquisando"], obrigatoria: false },
  { rotulo: "Vai usar financiamento?", tipo: "opcoes", opcoes: ["Sim", "Não", "Ainda não sei"], obrigatoria: false },
  { rotulo: "Qual o seu e-mail?", tipo: "texto", opcoes: [], obrigatoria: false },
];

// Limpa o que chega do navegador/banco: só aceita o formato certo, corta
// tamanhos e gera id quando faltar. Nunca confia no que veio de fora.
export function normalizarPerguntas(bruto: unknown): PerguntaFormulario[] {
  if (!Array.isArray(bruto)) return [];
  const resultado: PerguntaFormulario[] = [];
  for (const item of bruto.slice(0, MAX_PERGUNTAS)) {
    if (!item || typeof item !== "object") continue;
    const p = item as Record<string, unknown>;
    const rotulo = String(p.rotulo ?? "").trim().slice(0, 150);
    if (!rotulo) continue;
    const tipo = p.tipo === "opcoes" ? "opcoes" : "texto";
    const opcoes =
      tipo === "opcoes" && Array.isArray(p.opcoes)
        ? p.opcoes.map((o) => String(o ?? "").trim().slice(0, 80)).filter(Boolean).slice(0, 20)
        : [];
    if (tipo === "opcoes" && opcoes.length < 2) continue;
    const id = String(p.id ?? "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40) || `p${resultado.length + 1}${Date.now().toString(36)}`;
    resultado.push({ id, rotulo, tipo, opcoes, obrigatoria: p.obrigatoria === true });
  }
  return resultado;
}
