"use client";

import { useState, useTransition } from "react";
import { registrarLeadIsca, type RespostasIsca } from "@/lib/iscas/actions";

type Passo =
  | { tipo: "escolha"; chave: "tempoMercado" | "atuacao"; pergunta: string; opcoes: string[] }
  | { tipo: "simNao"; chave: "prioridade"; pergunta: string }
  | { tipo: "texto"; chave: "maiorDesafio" | "nome" | "telefone" | "instagram"; pergunta: string; placeholder: string; tipoInput?: string };

const PASSOS: Passo[] = [
  {
    tipo: "escolha",
    chave: "tempoMercado",
    pergunta: "Há quanto tempo você está no mercado imobiliário?",
    opcoes: ["Comecei agora", "6 meses", "Mais de 1 ano", "Mais de 2 anos"],
  },
  {
    tipo: "texto",
    chave: "maiorDesafio",
    pergunta: "Qual tem sido o seu maior desafio?",
    placeholder: "Escreve aqui...",
  },
  {
    tipo: "simNao",
    chave: "prioridade",
    pergunta: "Resolver esse desafio para você hoje é uma prioridade?",
  },
  {
    tipo: "escolha",
    chave: "atuacao",
    pergunta: "Hoje você é...",
    opcoes: ["Corretor", "Gerente", "Dono de imobiliária"],
  },
  {
    tipo: "texto",
    chave: "nome",
    pergunta: "Qual o seu nome?",
    placeholder: "Seu nome",
  },
  {
    tipo: "texto",
    chave: "telefone",
    pergunta: "Qual o seu WhatsApp?",
    placeholder: "(11) 99999-9999",
    tipoInput: "tel",
  },
  {
    tipo: "texto",
    chave: "instagram",
    pergunta: "Qual o @ do seu Instagram?",
    placeholder: "@seuusuario",
  },
];

const RESPOSTAS_INICIAIS: RespostasIsca = {
  nome: "",
  telefone: "",
  instagram: "",
  tempoMercado: "",
  maiorDesafio: "",
  prioridade: null,
  atuacao: "",
};

export function IscaCapturaForm({ slug, nomeIsca }: { slug: string; nomeIsca: string }) {
  const [passoAtual, setPassoAtual] = useState(0);
  const [respostas, setRespostas] = useState<RespostasIsca>(RESPOSTAS_INICIAIS);
  const [textoAtual, setTextoAtual] = useState("");
  const [enviando, iniciarEnvio] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{
    materialUrl: string | null;
    whatsappContatoE164: string | null;
    whatsappMensagem: string | null;
  } | null>(null);

  const passo = PASSOS[passoAtual];
  const ultimoPasso = passoAtual === PASSOS.length - 1;
  const progresso = Math.round(((passoAtual + (resultado ? 1 : 0)) / PASSOS.length) * 100);

  function avancar(valorParcial: Partial<RespostasIsca>) {
    const novasRespostas = { ...respostas, ...valorParcial };
    setRespostas(novasRespostas);
    setErro(null);
    setTextoAtual("");

    if (!ultimoPasso) {
      setPassoAtual((atual) => atual + 1);
      return;
    }

    iniciarEnvio(async () => {
      const resposta = await registrarLeadIsca(slug, novasRespostas);
      if (resposta.erro) {
        setErro(resposta.erro);
        return;
      }
      setResultado({
        materialUrl: resposta.materialUrl,
        whatsappContatoE164: resposta.whatsappContatoE164,
        whatsappMensagem: resposta.whatsappMensagem,
      });
    });
  }

  function voltar() {
    if (passoAtual === 0) return;
    setErro(null);
    setTextoAtual("");
    setPassoAtual((atual) => atual - 1);
  }

  if (resultado) {
    // Isca "entregar material": mostra o botão de acesso + convite pra
    // compartilhar com um amigo. Isca "só cadastro": não tem material
    // nenhum — só agradece, e só mostra botão de WhatsApp se a isca tiver
    // um número de contato configurado (aí não faz sentido oferecer
    // "compartilhar com amigo", já que aqui é a pessoa falando direto com
    // a equipe do Samuel).
    if (resultado.materialUrl) {
      const linkDaIsca = typeof window !== "undefined" ? window.location.href : "";
      const mensagemCompartilhar = `Olha esse material que eu recebi, pode te ajudar: "${nomeIsca}" — ${linkDaIsca}`;
      const linkCompartilhar = `https://wa.me/?text=${encodeURIComponent(mensagemCompartilhar)}`;

      return (
        <div className="space-y-4 text-center">
          <p className="text-2xl">🎉</p>
          <p className="text-lg font-semibold text-neutral-900">Prontinho!</p>
          <p className="text-sm text-neutral-500">Seu material já está liberado.</p>
          <a
            href={resultado.materialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            Clique aqui para acessar seu material
          </a>
          <a
            href={linkCompartilhar}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-green-500 px-4 py-3 text-sm font-semibold text-green-700 transition hover:bg-green-50"
          >
            Compartilhar no WhatsApp com um amigo(a)
          </a>
        </div>
      );
    }

    const linkFalarComEquipe = resultado.whatsappContatoE164
      ? `https://wa.me/${resultado.whatsappContatoE164}${
          resultado.whatsappMensagem ? `?text=${encodeURIComponent(resultado.whatsappMensagem)}` : ""
        }`
      : null;

    return (
      <div className="space-y-4 text-center">
        <p className="text-2xl">🎉</p>
        <p className="text-lg font-semibold text-neutral-900">Prontinho!</p>
        <p className="text-sm text-neutral-500">
          Obrigado por preencher seus dados
          {linkFalarComEquipe
            ? " — clique no botão abaixo e fale agora mesmo com a nossa equipe."
            : ", logo logo alguém da nossa equipe vai entrar em contato com você."}
        </p>
        {linkFalarComEquipe && (
          <a
            href={linkFalarComEquipe}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700"
          >
            Falar agora com nossa equipe
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
        <div
          className="h-full rounded-full bg-blue-600 transition-all duration-300"
          style={{ width: `${Math.max(progresso, 6)}%` }}
        />
      </div>

      <p className="text-lg font-semibold text-neutral-900">{passo.pergunta}</p>

      {passo.tipo === "escolha" && (
        <div className="space-y-2">
          {passo.opcoes.map((opcao) => (
            <button
              key={opcao}
              type="button"
              disabled={enviando}
              onClick={() => avancar({ [passo.chave]: opcao } as Partial<RespostasIsca>)}
              className="w-full rounded-md border border-neutral-300 px-4 py-3 text-left text-sm font-medium text-neutral-800 transition hover:border-blue-500 hover:bg-blue-50 disabled:opacity-50"
            >
              {opcao}
            </button>
          ))}
        </div>
      )}

      {passo.tipo === "simNao" && (
        <div className="flex gap-3">
          <button
            type="button"
            disabled={enviando}
            onClick={() => avancar({ prioridade: true })}
            className="flex-1 rounded-md border border-neutral-300 px-4 py-3 text-sm font-medium text-neutral-800 transition hover:border-blue-500 hover:bg-blue-50 disabled:opacity-50"
          >
            Sim
          </button>
          <button
            type="button"
            disabled={enviando}
            onClick={() => avancar({ prioridade: false })}
            className="flex-1 rounded-md border border-neutral-300 px-4 py-3 text-sm font-medium text-neutral-800 transition hover:border-blue-500 hover:bg-blue-50 disabled:opacity-50"
          >
            Não
          </button>
        </div>
      )}

      {passo.tipo === "texto" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!textoAtual.trim()) return;
            avancar({ [passo.chave]: textoAtual } as Partial<RespostasIsca>);
          }}
          className="space-y-3"
        >
          {passo.chave === "maiorDesafio" ? (
            <textarea
              autoFocus
              required
              rows={3}
              value={textoAtual}
              onChange={(e) => setTextoAtual(e.target.value)}
              placeholder={passo.placeholder}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          ) : (
            <input
              autoFocus
              required
              type={passo.tipoInput ?? "text"}
              value={textoAtual}
              onChange={(e) => setTextoAtual(e.target.value)}
              placeholder={passo.placeholder}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          )}
          <button
            type="submit"
            disabled={enviando}
            className="w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
          >
            {enviando ? "Enviando..." : ultimoPasso ? "Concluir" : "Continuar"}
          </button>
        </form>
      )}

      {erro && <p className="text-sm text-red-600">{erro}</p>}

      {passoAtual > 0 && (
        <button
          type="button"
          onClick={voltar}
          disabled={enviando}
          className="text-xs font-medium text-neutral-400 hover:text-neutral-600"
        >
          ‹ Voltar
        </button>
      )}
    </div>
  );
}
