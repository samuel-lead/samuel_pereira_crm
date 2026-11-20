// Transforma as linhas de uma planilha (CSV ou .xlsx) na lista "nome<TAB>telefone"
// que o formulário de importar leads usa. Fica fora do componente pra poder ser
// testada sozinha. Samuel (20/11/26): o Glauber não conseguia importar contatos
// exportados do WhatsApp — a coluna "Number" (inglês) não era reconhecida e
// todos os leads ficavam com o telefone "55" (o código do país), virando 1
// lead + 98 "duplicados". Também entravam GRUPOS do WhatsApp como se fossem leads.

// Palavras que aparecem no cabeçalho de uma planilha de leads. A comparação é
// por PALAVRA inteira dentro de cada célula ("Nome Fantasia" tem a palavra
// "nome"), senão cabeçalho com mais de uma palavra virava um lead de verdade
// (foi o que aconteceu na Inove Gôndolas: "Nome Fantasia" entrou como lead).
const PALAVRAS_NOME = ["nome", "name", "empresa", "fantasia"];
const PALAVRAS_TELEFONE = [
  "telefone",
  "fone",
  "celular",
  "whatsapp",
  "phone",
  "numero",
  "número",
  "number",
  "mobile",
  "tel",
  "cel",
];
const PALAVRAS_ORIGEM = ["origem"];
const PALAVRAS_OUTRAS_COLUNAS = [
  "razao",
  "razão",
  "social",
  "cnpj",
  "email",
  "e-mail",
  "cidade",
  "estado",
  "uf",
  "endereco",
  "endereço",
  "country",
  "code",
];
// Colunas que têm "nome" no título mas NÃO são o nome da pessoa.
const PALAVRAS_NOME_QUE_NAO_SAO_PESSOA = ["group", "grupo", "country", "pais", "país", "business"];

function palavrasDaCelula(celula: string) {
  return celula
    .toLowerCase()
    .split(/[^a-zà-úç0-9-]+/i)
    .filter(Boolean);
}

function celulaTemPalavra(celula: string, lista: string[]) {
  return palavrasDaCelula(celula).some((p) => lista.includes(p));
}

function linhaPareceCabecalho(celulas: string[]) {
  // Só é cabeçalho se as células forem curtas (títulos de coluna) e alguma
  // tiver uma palavra de coluna conhecida — um nome de empresa comprido na
  // primeira linha não vira cabeçalho só por ter "empresa" no meio.
  const todasCurtas = celulas.every((c) => c.trim().length <= 40);
  return (
    todasCurtas &&
    celulas.some(
      (c) =>
        celulaTemPalavra(c, PALAVRAS_NOME) ||
        celulaTemPalavra(c, PALAVRAS_TELEFONE) ||
        celulaTemPalavra(c, PALAVRAS_ORIGEM) ||
        celulaTemPalavra(c, PALAVRAS_OUTRAS_COLUNAS)
    )
  );
}

function soDigitos(texto: string) {
  return texto.replace(/\D/g, "");
}

// Grupo do WhatsApp aparece nas exportações como se fosse um contato: o "número"
// dele é um código enorme (18+ dígitos) ou "telefone-timestamp". Telefone de
// verdade tem no máximo 15 dígitos (padrão internacional).
export function pareceGrupoDoWhatsapp(telefoneBruto: string): boolean {
  const t = telefoneBruto.trim();
  return soDigitos(t).length > 15 || /\d-\d{6,}/.test(t);
}

// Anotações que o WhatsApp põe na exportação e que não são lead.
function ehContatoDoSistema(nome: string): boolean {
  const n = nome.trim().toLowerCase();
  return /^meu n[uú]mero:?$/.test(n) || n === "meta ai";
}

// Uma coluna "parece de telefone" quando a maioria das células tem só dígitos
// e símbolos de telefone e pelo menos 8 dígitos.
function pareceColunaDeTelefone(valores: string[]): boolean {
  const preenchidos = valores.map((v) => v.trim()).filter(Boolean);
  if (preenchidos.length === 0) return false;
  const boas = preenchidos.filter(
    (v) => /^[+()\d\s.\-:]+$/.test(v) && soDigitos(v).length >= 8
  );
  return boas.length / preenchidos.length >= 0.6;
}

export type ResultadoLista = {
  lista: string;
  // O que ficou de fora de propósito, pra mostrar na tela.
  gruposIgnorados: number;
  estrangeirosIgnorados: number;
  sistemaIgnorados: number;
};

// Se a primeira linha for cabeçalho, usa ela pra descobrir em qual coluna está o
// nome, o telefone e (se existir) a origem. Só essas colunas seguem pra lista:
// as OUTRAS (Razão Social, CNPJ...) são descartadas — antes elas iam coladas
// atrás do telefone e a terceira virava a ORIGEM de cada lead (na Inove
// Gôndolas, 600 leads ficaram com a razão social como origem).
export function linhasParaLista(linhas: string[][]): ResultadoLista {
  const vazio: ResultadoLista = {
    lista: "",
    gruposIgnorados: 0,
    estrangeirosIgnorados: 0,
    sistemaIgnorados: 0,
  };
  if (linhas.length === 0) return vazio;

  let dados = linhas;
  let indicesNome = [0];
  let indicesTelefone = [1];
  let indiceOrigem = -1;
  let indicePais = -1;
  // Várias colunas de nome onde vale a primeira PREENCHIDA (ex.: WhatsApp:
  // "Contact's Public Display Name" e "Saved Name") — diferente do Google
  // Contatos, onde as partes do nome são juntas ("First Name Last Name").
  let nomeJuntaPartes = false;

  const primeiraLinha = linhas[0];
  if (linhaPareceCabecalho(primeiraLinha)) {
    const minusculas = primeiraLinha.map((c) => c.trim().toLowerCase());
    const posOrigem = primeiraLinha.findIndex((c) => celulaTemPalavra(c, PALAVRAS_ORIGEM));
    if (posOrigem !== -1) indiceOrigem = posOrigem;

    // Coluna "Country Code" (exportação do WhatsApp): serve pra saber se o
    // contato é do Brasil — NÃO é o telefone.
    indicePais = primeiraLinha.findIndex(
      (c) => celulaTemPalavra(c, ["country"]) && celulaTemPalavra(c, ["code"])
    );

    // Exportação do Google Contatos (Samuel, 18/11/26): o nome vem partido em
    // "First Name / Middle Name / Last Name" e cada telefone tem DUAS colunas —
    // "Phone 1 - Label" (só a palavra "Mobile") e "Phone 1 - Value" (o número).
    const partesDoNome = ["first name", "middle name", "last name"]
      .map((t) => minusculas.indexOf(t))
      .filter((i) => i !== -1);
    if (partesDoNome.length > 0) {
      indicesNome = partesDoNome;
      nomeJuntaPartes = true;
    } else {
      const colunasNome = primeiraLinha
        .map((c, i) => ({ c, i }))
        .filter(
          ({ c }) =>
            celulaTemPalavra(c, PALAVRAS_NOME) &&
            !celulaTemPalavra(c, PALAVRAS_NOME_QUE_NAO_SAO_PESSOA)
        )
        .map(({ i }) => i);
      if (colunasNome.length > 0) indicesNome = colunasNome;
    }

    const colunasTelefone = primeiraLinha
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => celulaTemPalavra(c, PALAVRAS_TELEFONE) && !celulaTemPalavra(c, ["country", "code"]));
    // Colunas de telefone que NÃO são "Label"/"Type" (rótulo do tipo de telefone).
    const soNumeros = colunasTelefone.filter(({ c }) => !celulaTemPalavra(c, ["label", "type", "tipo"]));
    const escolhidas = soNumeros.length > 0 ? soNumeros : colunasTelefone;
    if (escolhidas.length > 0) {
      indicesTelefone = escolhidas.map(({ i }) => i);
    } else {
      // Não reconheceu o título da coluna (planilha em outro idioma, nome
      // diferente...): procura pelo CONTEÚDO — a coluna cheia de números de
      // telefone. Antes caía na coluna 2 por chute e pegava o "55" do país.
      const corpo = linhas.slice(1, 201);
      const candidata = primeiraLinha
        .map((_, i) => i)
        .filter((i) => !indicesNome.includes(i) && i !== indicePais && i !== indiceOrigem)
        .find((i) => pareceColunaDeTelefone(corpo.map((l) => l[i] ?? "")));
      if (candidata !== undefined) indicesTelefone = [candidata];
    }
    dados = linhas.slice(1);
  }

  const resultado = { ...vazio };
  const saida: string[] = [];

  for (const linha of dados) {
    if (!linha.some((celula) => celula.trim())) continue;

    const partes = indicesNome.map((i) => (linha[i] ?? "").trim()).filter(Boolean);
    const nome = nomeJuntaPartes ? partes.join(" ") : (partes[0] ?? "");

    // Vários telefones na mesma linha (Phone 1/2/3) ou na mesma célula
    // ("a ::: b"): usa o primeiro que tiver algum dígito.
    const telefone =
      indicesTelefone
        .flatMap((i) => (linha[i] ?? "").split(":::"))
        .map((t) => t.trim())
        .find((t) => /\d/.test(t)) ?? "";
    const origem = indiceOrigem !== -1 ? (linha[indiceOrigem] ?? "").trim() : "";

    if (telefone) {
      if (pareceGrupoDoWhatsapp(telefone)) {
        resultado.gruposIgnorados++;
        continue;
      }
      // Fora do Brasil (código do país diferente de 55, ou "+" com outro país):
      // o CRM é de WhatsApp brasileiro — um "+1 267..." virava um número
      // inventado. Deixa de fora e avisa.
      const pais = indicePais !== -1 ? soDigitos(linha[indicePais] ?? "") : "";
      const comMais = telefone.startsWith("+");
      const digitos = soDigitos(telefone);
      const estrangeiro =
        (pais !== "" && pais !== "55") || (comMais && !digitos.startsWith("55"));
      if (estrangeiro) {
        resultado.estrangeirosIgnorados++;
        continue;
      }
    }

    if (nome && ehContatoDoSistema(nome)) {
      resultado.sistemaIgnorados++;
      continue;
    }

    // Telefone vazio vira só o nome (sem coluna vazia no meio).
    if (!telefone) {
      if (nome) saida.push(nome);
      continue;
    }
    saida.push(origem ? [nome, telefone, origem].join("\t") : [nome, telefone].join("\t"));
  }

  resultado.lista = saida.join("\n");
  return resultado;
}
