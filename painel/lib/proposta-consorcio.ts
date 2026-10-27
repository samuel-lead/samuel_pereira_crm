// Proposta de consórcio da Banker (Samuel, 27/10/26): o vendedor preenche os
// números no card do lead e o texto sai pronto pra copiar e mandar.
export type PropostaConsorcio = {
  credito: number | null;
  // Percentual do lance embutido: 25% ou 50% (padrão 25%). Propostas antigas,
  // salvas antes dessa escolha, não têm o campo e valem 25%.
  lance_percentual?: 25 | 50;
  lance_embutido: number | null;
  credito_liberado: number | null;
  prazo_meses: number | null;
  valor_parcela: number | null;
  parcelas_apos_contemplacao: number | null;
  // Situação do grupo, texto livre (padrão "Grupo Em Andamento"). Propostas
  // antigas, sem o campo, valem o padrão.
  situacao?: string;
};

export const SITUACAO_PADRAO = "Grupo Em Andamento";

export const PROPOSTA_CONSORCIO_VAZIA: PropostaConsorcio = {
  credito: null,
  lance_percentual: 25,
  lance_embutido: null,
  credito_liberado: null,
  prazo_meses: null,
  valor_parcela: null,
  parcelas_apos_contemplacao: null,
  situacao: SITUACAO_PADRAO,
};

function dinheiro(valor: number | null) {
  if (valor === null) return "";
  return valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Mesma estrutura do modelo que a Banker usa no WhatsApp.
export function montarTextoPropostaConsorcio(p: PropostaConsorcio) {
  return [
    "🚘 CONSÓRCIO VOLKSWAGEN",
    "━━━━━━━━━━━━━━━━",
    "",
    `💰 Crédito: R$ ${dinheiro(p.credito)}`,
    `💳 Lance embutido (${p.lance_percentual ?? 25}%): R$ ${dinheiro(p.lance_embutido)}`,
    "",
    `💰 *Crédito Liberado R$ ${dinheiro(p.credito_liberado)}*`,
    "",
    "📆 Plano de pagamento:",
    `      ▪️ ${p.prazo_meses ?? ""} Meses`,
    `      ▪️ Valor da Parcela: *R$ ${dinheiro(p.valor_parcela)}*`,
    `      ▪️ Parcelas Após contemplação Aproximadamente: R$ ${dinheiro(p.parcelas_apos_contemplacao)}.`,
    "",
    "━━━━━━━━━━━━━━━",
    `🟢 Situação: ${p.situacao?.trim() || SITUACAO_PADRAO}`,
  ].join("\n");
}

// Lê o que veio do formulário (campos prop_*). Devolve null se nada foi preenchido.
export function lerPropostaConsorcioDoForm(formData: FormData): PropostaConsorcio | null {
  function numero(nome: string) {
    const bruto = String(formData.get(nome) ?? "").trim();
    if (!bruto) return null;
    const valor = Number(bruto);
    return Number.isFinite(valor) && valor >= 0 ? valor : null;
  }
  const proposta: PropostaConsorcio = {
    credito: numero("prop_credito"),
    lance_percentual: String(formData.get("prop_lance_pct") ?? "") === "50" ? 50 : 25,
    lance_embutido: numero("prop_lance"),
    credito_liberado: numero("prop_credito_liberado"),
    prazo_meses: numero("prop_prazo"),
    valor_parcela: numero("prop_parcela"),
    parcelas_apos_contemplacao: numero("prop_parcelas_apos"),
    situacao: String(formData.get("prop_situacao") ?? "").trim() || SITUACAO_PADRAO,
  };
  // O percentual sempre vem preenchido (25 por padrão) — só conta o que a pessoa digitou.
  const { lance_percentual: _percentual, situacao: _situacao, ...digitados } = proposta;
  return Object.values(digitados).every((v) => v === null) ? null : proposta;
}
