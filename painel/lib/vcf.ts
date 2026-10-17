import { normalizarTelefone } from "@/lib/telefone";

// Lê um arquivo de contatos (.vcf) — o que o WhatsApp/celular exporta — e
// devolve nome + telefone de cada pessoa, pronto pra lista de importação.
// Samuel pediu (16/10/26): em vez de mandar cada lista pra eu cadastrar, soltar
// o arquivo direto na tela de importar.

export type ContatoVcf = { nome: string; telefone: string };

// "Corretor - Eron", "Corretora - Gisa", "CI Corretor - Fulano", "Sérgio
// Corretor Silva" etc.: tira a palavra Corretor/Corretora que vem colada no
// nome salvo na agenda. Se sobrar só a palavra (ex.: "Corretor"), mantém o
// original.
export function limparNomeContato(bruto: string): string {
  const original = bruto.replace(/\s+/g, " ").trim();
  let nome = original;
  nome = nome.replace(/^(ci |rr |ap )?corret[a-zõ]*\s*(rr\s*)?[:\-–|]\s*/i, "");
  nome = nome.replace(/\s*[|\-–]\s*corret(or|ora)( de im[oó]veis)?\b.*$/i, "");
  nome = nome.replace(/\bcorret(or|ora)\b:?/gi, " ");
  nome = nome.replace(/\s+/g, " ").trim();
  return nome.length >= 2 ? nome : original;
}

// Quando o nome da agenda ficou com uma palavra só (ex.: "Salomão" ou
// "Corretor Imobiliaria"), tenta o nome do perfil comercial do WhatsApp
// (X-WA-BIZ-NAME) — só se parecer nome de pessoa (2 a 4 palavras, sem
// número, sem "imóveis"/"creci"/"corretor").
function nomeDoPerfilComercial(bruto: string): string | null {
  const nome = bruto.replace(/^~/, "").replace(/\s+/g, " ").trim();
  const palavras = nome.split(" ");
  if (palavras.length < 2 || palavras.length > 4) return null;
  if (/\d/.test(nome) || /im[oó]ve|imobili|creci|corret|consult|\|/i.test(nome)) return null;
  return nome;
}

// Junta linhas continuadas do .vcf (linha que começa com espaço continua a
// anterior) e desfaz o escape de quebra de linha.
function linhasDoVcf(texto: string): string[] {
  const brutas = texto.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const juntas: string[] = [];
  for (const linha of brutas) {
    if (/^[ \t]/.test(linha) && juntas.length > 0) {
      juntas[juntas.length - 1] += linha.slice(1);
    } else {
      juntas.push(linha);
    }
  }
  return juntas;
}

export function lerContatosVcf(texto: string): ContatoVcf[] {
  const contatos: ContatoVcf[] = [];
  const vistos = new Set<string>();
  let atual: { nome: string; telefone: string; perfil: string } | null = null;

  for (const linha of linhasDoVcf(texto)) {
    const maiuscula = linha.toUpperCase();
    if (maiuscula.startsWith("BEGIN:VCARD")) {
      atual = { nome: "", telefone: "", perfil: "" };
      continue;
    }
    if (maiuscula.startsWith("END:VCARD")) {
      if (atual && atual.telefone) {
        const chave = atual.telefone;
        if (!vistos.has(chave)) {
          vistos.add(chave);
          let nome = limparNomeContato(atual.nome) || "Sem nome";
          if (nome.split(" ").length === 1) {
            nome = nomeDoPerfilComercial(atual.perfil) ?? nome;
          }
          contatos.push({ nome, telefone: atual.telefone });
        }
      }
      atual = null;
      continue;
    }
    if (!atual) continue;

    if (/^FN[;:]/i.test(linha)) {
      atual.nome = linha.slice(linha.indexOf(":") + 1);
    } else if (/^X-WA-BIZ-NAME[;:]/i.test(linha)) {
      atual.perfil = linha.slice(linha.indexOf(":") + 1);
    } else if (/^(ITEM\d+\.)?TEL[;:]/i.test(linha) && !atual.telefone) {
      const numero = normalizarTelefone(linha.slice(linha.indexOf(":") + 1));
      if (numero) atual.telefone = numero;
    }
  }

  return contatos;
}
