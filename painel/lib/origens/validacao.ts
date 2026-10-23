// Fica fora de actions.ts porque aquele arquivo é "use server" e só pode
// exportar funções assíncronas — esta é síncrona e também roda no servidor
// da importação (lib/leads/actions.ts).
// Valor que NÃO é nome de origem: data, hora, só número (CNPJ, telefone), ou
// texto comprido demais. Acontece quando uma coluna errada de uma planilha cai
// no campo de origem — já virou 600 "origens" lixo na Inove Gôndolas e 40 na
// Ketlyn (22/10/26). Regra de segurança pra TODOS os CRMs: nunca cria origem
// com esse formato.
export function pareceOrigemInvalida(nome: string): boolean {
  const t = nome.trim();
  return (
    t.length === 0 ||
    t.length > 60 ||
    /^[0-9]{1,2}[/.-][0-9]{1,2}[/.-][0-9]{2,4}$/.test(t) ||
    /^[0-9]{1,2}:[0-9]{2}(:[0-9]{2})?$/.test(t) ||
    /^[0-9.,\-/\s]+$/.test(t)
  );
}
