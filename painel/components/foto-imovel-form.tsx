"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { atualizarFotoImovel, type EstadoFoto } from "@/lib/imoveis/actions";

const estadoInicial: EstadoFoto = { erro: null };

// Quadro de ajuste (o que a pessoa vê e arrasta) e tamanho final exportado
// — sempre 4:3 deitado, igual o quadro onde a foto aparece. Samuel pegou ao
// vivo: foto em formato de stories (vertical e grande) mandada direto
// "bugava tudo". Agora a foto é redimensionada AQUI, antes de enviar, então
// qualquer tamanho/formato entra, e dá pra posicionar (arrastar + zoom).
const QUADRO_L = 320;
const QUADRO_A = 240;
const SAIDA_L = 1200;
const SAIDA_A = 900;
// O servidor só aceita envio de até ~1MB — a gente baixa a qualidade até
// caber, pra nunca estourar esse limite.
const LIMITE_BYTES = 900 * 1024;

function gerarBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    const tentar = (qualidade: number) => {
      canvas.toBlob(
        (blob) => {
          if (blob && blob.size > LIMITE_BYTES && qualidade > 0.4) {
            tentar(qualidade - 0.1);
          } else {
            resolve(blob);
          }
        },
        "image/jpeg",
        qualidade
      );
    };
    tentar(0.88);
  });
}

export function FotoImovelForm({
  imovelId,
  fotoUrl,
}: {
  imovelId: string;
  fotoUrl: string | null;
}) {
  const acaoComId = atualizarFotoImovel.bind(null, imovelId);
  const [estado, acaoFormulario, pendente] = useActionState(acaoComId, estadoInicial);
  const [preview, setPreview] = useState<string | null>(null);
  const [erroLocal, setErroLocal] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const enviandoRef = useRef(false);

  useEffect(() => {
    if (pendente) {
      enviandoRef.current = true;
      return;
    }
    if (enviandoRef.current) {
      enviandoRef.current = false;
      if (estado.erro === null) {
        setSalvo(true);
        const timeout = setTimeout(() => setSalvo(false), 2000);
        return () => clearTimeout(timeout);
      }
    }
  }, [pendente, estado]);

  const [imagemEscolhida, setImagemEscolhida] = useState<string | null>(null);
  const [natural, setNatural] = useState({ largura: 0, altura: 0 });
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement>(null);
  const arrastoRef = useRef({ ativo: false, inicioX: 0, inicioY: 0, posInicioX: 0, posInicioY: 0 });

  // Escala mínima pra foto cobrir o quadro todo (igual object-fit: cover).
  const escalaBase =
    natural.largura > 0 && natural.altura > 0
      ? Math.max(QUADRO_L / natural.largura, QUADRO_A / natural.altura)
      : 1;
  const escalaTotal = escalaBase * zoom;
  const larguraImg = natural.largura * escalaTotal;
  const alturaImg = natural.altura * escalaTotal;

  function limitarPos(x: number, y: number) {
    const limiteX = Math.max(0, (larguraImg - QUADRO_L) / 2);
    const limiteY = Math.max(0, (alturaImg - QUADRO_A) / 2);
    return {
      x: Math.min(limiteX, Math.max(-limiteX, x)),
      y: Math.min(limiteY, Math.max(-limiteY, y)),
    };
  }

  function aoEscolherArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setErroLocal(null);
    if (!arquivo.type.startsWith("image/")) {
      setErroLocal("O arquivo precisa ser uma imagem.");
      e.target.value = "";
      return;
    }
    setZoom(1);
    setPos({ x: 0, y: 0 });
    setNatural({ largura: 0, altura: 0 });
    setImagemEscolhida(URL.createObjectURL(arquivo));
    e.target.value = "";
  }

  function aoCarregarImagem() {
    const img = imgRef.current;
    if (!img) return;
    setNatural({ largura: img.naturalWidth, altura: img.naturalHeight });
  }

  function aoMudarZoom(novoZoom: number) {
    setZoom(novoZoom);
    setPos((atual) => limitarPos(atual.x, atual.y));
  }

  async function aoConfirmar() {
    const img = imgRef.current;
    if (!img || natural.largura === 0) return;

    const canvas = document.createElement("canvas");
    canvas.width = SAIDA_L;
    canvas.height = SAIDA_A;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Mapeia o quadro visível (já com zoom/posição) de volta pros pixels
    // da foto original.
    const origemX = natural.largura / 2 - (QUADRO_L / 2 + pos.x) / escalaTotal;
    const origemY = natural.altura / 2 - (QUADRO_A / 2 + pos.y) / escalaTotal;
    ctx.drawImage(
      img,
      origemX,
      origemY,
      QUADRO_L / escalaTotal,
      QUADRO_A / escalaTotal,
      0,
      0,
      SAIDA_L,
      SAIDA_A
    );

    const blob = await gerarBlob(canvas);
    if (!blob) {
      setErroLocal("Não consegui preparar essa foto. Tente outra.");
      return;
    }
    const arquivo = new File([blob], "foto.jpg", { type: "image/jpeg" });
    setPreview(URL.createObjectURL(arquivo));
    const formData = new FormData();
    formData.set("foto", arquivo);
    acaoFormulario(formData);
    setImagemEscolhida(null);
  }

  const fotoAtual = preview ?? fotoUrl;

  return (
    <>
      <div className="flex items-center gap-4">
        <div className="h-24 w-32 shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
          {fotoAtual ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fotoAtual} alt="Foto do imóvel" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-center text-xs text-neutral-400">
              Sem foto
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <label className="text-sm font-medium text-neutral-700">Foto do imóvel</label>
          <input
            type="file"
            accept="image/*"
            onChange={aoEscolherArquivo}
            className="block w-full text-sm text-neutral-600 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
          />
          <p className="text-xs text-neutral-400">
            Qualquer foto serve (até vertical, de celular ou stories). Você posiciona antes de salvar.
          </p>
          {pendente && <p className="text-xs text-blue-600">Enviando...</p>}
          {salvo && <p className="text-xs font-medium text-green-600">Foto salva ✓</p>}
          {(erroLocal || estado.erro) && (
            <p className="text-xs text-red-600">{erroLocal ?? estado.erro}</p>
          )}
        </div>
      </div>

      {imagemEscolhida && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setImagemEscolhida(null)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-1 text-sm font-semibold text-neutral-800">Posicione a foto</h2>
            <p className="mb-3 text-xs text-neutral-400">
              Arraste a foto pra o canto que quiser e use o zoom pra aproximar.
            </p>

            <div
              className="relative mx-auto max-w-full touch-none cursor-grab overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 active:cursor-grabbing"
              style={{ width: QUADRO_L, height: QUADRO_A }}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                arrastoRef.current = {
                  ativo: true,
                  inicioX: e.clientX,
                  inicioY: e.clientY,
                  posInicioX: pos.x,
                  posInicioY: pos.y,
                };
              }}
              onPointerMove={(e) => {
                if (!arrastoRef.current.ativo) return;
                setPos(
                  limitarPos(
                    arrastoRef.current.posInicioX + (e.clientX - arrastoRef.current.inicioX),
                    arrastoRef.current.posInicioY + (e.clientY - arrastoRef.current.inicioY)
                  )
                );
              }}
              onPointerUp={() => {
                arrastoRef.current.ativo = false;
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={imagemEscolhida}
                alt="Prévia da foto"
                draggable={false}
                onLoad={aoCarregarImagem}
                className="absolute max-w-none select-none"
                style={{
                  width: larguraImg || undefined,
                  height: alturaImg || undefined,
                  left: larguraImg ? (QUADRO_L - larguraImg) / 2 + pos.x : 0,
                  top: alturaImg ? (QUADRO_A - alturaImg) / 2 + pos.y : 0,
                  visibility: natural.largura ? "visible" : "hidden",
                }}
              />
            </div>

            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-neutral-500">Zoom</span>
              <input
                type="range"
                min="1"
                max="3"
                step="0.02"
                value={zoom}
                onChange={(e) => aoMudarZoom(Number(e.target.value))}
                className="flex-1"
              />
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setImagemEscolhida(null)}
                className="flex-1 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={aoConfirmar}
                disabled={pendente}
                className="flex-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
              >
                Usar essa foto
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
