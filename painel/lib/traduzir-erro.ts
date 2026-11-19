// Mensagens de erro do Supabase (login, banco) chegam em inglês. Samuel (19/11/26): todo
// aviso na tela tem que ser em português. Este tradutor cobre os casos conhecidos e, se
// sobrar algo em inglês que não conhecemos, mostra uma frase genérica em português.
const TRADUCOES: [RegExp, string][] = [
  [/already (been )?registered|already exists|email_exists|user_already_exists/i, "Já existe um usuário cadastrado com esse e-mail."],
  [/password should be at least|weak.?password|password.*too short/i, "A senha é muito curta ou fraca. Use pelo menos 6 caracteres."],
  [/invalid login credentials/i, "E-mail ou senha incorretos."],
  [/email not confirmed/i, "Esse e-mail ainda não foi confirmado."],
  [/unable to validate email|invalid email|email address .* is invalid/i, "Esse e-mail não é válido."],
  [/duplicate key value violates unique constraint/i, "Esse registro já existe (valor repetido)."],
  [/violates row-level security|permission denied|not authorized|unauthorized|forbidden/i, "Você não tem permissão pra fazer isso."],
  [/violates foreign key constraint/i, "Esse item está ligado a outros dados e não pode ser mexido assim."],
  [/violates check constraint/i, "Algum campo tem um valor que o sistema não aceita."],
  [/null value in column/i, "Falta preencher um campo obrigatório."],
  [/jwt expired|session.*(expired|missing)|not authenticated|invalid jwt/i, "Sua sessão expirou. Entre de novo no sistema."],
  [/rate limit|too many requests|over_.*_rate_limit/i, "Muitas tentativas seguidas. Espere um pouco e tente de novo."],
  [/failed to fetch|fetch failed|network|timeout|timed out|econn/i, "Sem conexão com o servidor. Tente de novo em instantes."],
  [/not found/i, "Não encontrei o que você pediu."],
  [/signups? not allowed|signup is disabled/i, "O cadastro de novos usuários está desativado."],
];

// Só considera "inglês" o texto sem acento e com palavras comuns do idioma.
const PARECE_INGLES =
  /\b(the|is|are|was|has|have|been|failed|error|invalid|cannot|could|unable|not|with|this|that|already|user|please|something|wrong|went|happened|unexpected|required|missing|exist|exists|does|did|table|row|from|here|there|found|allowed|expired|request|should|must|for|and|to|of|in)\b/i;

export function traduzirErro(mensagem: string | null | undefined): string {
  const texto = (mensagem ?? "").trim();
  if (!texto) return "Não deu pra concluir. Tente de novo.";
  for (const [padrao, traducao] of TRADUCOES) {
    if (padrao.test(texto)) return traducao;
  }
  if (!/[à-úÀ-Ú]/.test(texto) && PARECE_INGLES.test(texto)) {
    console.error("[erro em inglês sem tradução]", texto);
    return "Não deu pra concluir a ação. Tente de novo.";
  }
  return texto;
}
