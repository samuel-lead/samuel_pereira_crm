// Proposta de consórcio da Banker (Samuel, 27/10/26): o vendedor preenche os
// números no card do lead e o texto sai pronto pra copiar e mandar.
export type PropostaConsorcio = {
  credito: number | null;
  lance_embutido: number | null;
  credito_liberado: number | null;
  prazo_meses: number | null;
  valor_parcela: number | null;
  parcelas_apos_contemplacao: number | null;
};

export const PROPOSTA_CONSORCIO_VAZIA: PropostaConsorcio = {
  credito: null,
  lance_embutido: null,
  credito_liberado: null,
  prazo_meses: null,
  valor_parcela: null,
  parcelas_apos_contemplacao: null,
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
    `💳 Lance embutido (25%): R$ ${dinheiro(p.lance_embutido)}`,
    "",
    `💰 *Crédito Liberado R$ ${dinheiro(p.credito_liberado)}*`,
    "",
    "📆 Plano de pagamento:",
    `      ▪️ ${p.prazo_meses ?? ""} Meses`,
    `      ▪️ Valor da Parcela: *R$ ${dinheiro(p.valor_parcela)}*`,
    `      ▪️ Parcelas Após contemplação Aproximadamente: R$ ${dinheiro(p.parcelas_apos_contemplacao)}.`,
    "",
    "━━━━━━━━━━━━━━━",
    "🟢 Situação: Grupo Em Andamento",
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
    lance_embutido: numero("prop_lance"),
    credito_liberado: numero("prop_credito_liberado"),
    prazo_meses: numero("prop_prazo"),
    valor_parcela: numero("prop_parcela"),
    parcelas_apos_contemplacao: numero("prop_parcelas_apos"),
  };
  return Object.values(proposta).every((v) => v === null) ? null : proposta;
}
