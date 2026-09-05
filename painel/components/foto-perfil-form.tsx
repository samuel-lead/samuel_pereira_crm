"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { atualizarFotoPerfil, type EstadoFoto } from "@/lib/configuracoes/actions";
import { AvatarUsuario } from "@/components/avatar-usuario";

const estadoInicial: EstadoFoto = { erro: null };
// Tamanho do quadro de recorte (o círculo que a pessoa vê e ajusta) e do
// arquivo final exportado — sempre quadrado, sempre esse tamanho, não
// importa a foto original.
const QUADRO = 280;
const SAIDA = 480;

export function FotoPerfilForm({
  nome,
  fotoUrl,
}: {
  nome: string;
  fotoUrl: string | null;
}) {
  const [estado, acaoFormulario, pendente] = useActionState(atualizarFotoPerfil, estadoInicial);
  const [preview, setPreview] = useState<string | null>(null);
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

  // Foto recém-escolhida, ainda não recortada/salva — abre o ajuste antes
  // de mandar pro servidor (Samuel pediu: sem isso, a foto ia sem dar
  // chance de posicionar o rosto/ângulo certo).
  const [imagemEscolhida, setImagemEscolhida] = useState<string | null>(null);
  const [natural, setNatural] = useState({ largura: 0, altura: 0 });
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement>(null);
  const arrastoRef = useRef<{
    ativo: boolean;
    inicioX: number;
    inicioY: number;
    posInicioX: number;
    posInicioY: number;
  }>({ ativo: false, inicioX: 0, inicioY: 0, posInicioX: 0, posInicioY: 0 });

  // Escala mínima pra imagem cobrir o quadro inteiro (igual object-fit:
  // cover), calculada à mão porque precisamos dos mesmos números pra
  // desenhar no canvas depois — não dá pra confiar só no CSS.
  const escalaBase =
    natural.largura > 0 && natural.altura > 0
      ? Math.max(QUADRO / natural.largura, QUADRO / natural.altura)
      : 1;
  const escalaTotal = escalaBase * zoom;
  const larguraImg = natural.largura * escalaTotal;
  const alturaImg = natural.altura * escalaTotal;

  function limitarPos(x: number, y: number) {
    const limiteX = Math.max(0, (larguraImg - QUADRO) / 2);
    const limiteY = Math.max(0, (alturaImg - QUADRO) / 2);
    return {
      x: Math.min(limiteX, Math.max(-limiteX, x)),
      y: Math.min(limiteY, Math.max(-limiteY, y)),
    };
  }

  function aoEscolherArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
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

  function aoIniciarArrasto(clientX: number, clientY: number) {
    arrastoRef.current = {
      ativo: true,
      inicioX: clientX,
      inicioY: clientY,
      posInicioX: pos.x,
      posInicioY: pos.y,
    };
  }

  function aoMoverArrasto(clientX: number, clientY: number) {
    if (!arrastoRef.current.ativo) return;
    const dx = clientX - arrastoRef.current.inicioX;
    const dy = clientY - arrastoRef.current.inicioY;
    setPos(limitarPos(arrastoRef.current.posInicioX + dx, arrastoRef.current.posInicioY + dy));
  }

  function aoMudarZoom(novoZoom: number) {
    setZoom(novoZoom);
    setPos((atual) => limitarPos(atual.x, atual.y));
  }

  function fecharAjuste() {
    setImagemEscolhida(null);
  }

  function aoConfirmarRecorte() {
    const img = imgRef.current;
    if (!img || natural.largura === 0) return;

    const canvas = document.createElement("canvas");
    canvas.width = SAIDA;
    canvas.height = SAIDA;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Mapeia o quadro visível (QUADRO x QUADRO, já com zoom/posição) de
    // volta pras coordenadas da imagem original, em pixels de verdade.
    const origemX = natural.largura / 2 - (QUADRO / 2 + pos.x) / escalaTotal;
    const origemY = natural.altura / 2 - (QUADRO / 2 + pos.y) / escalaTotal;
    const tamanhoOrigem = QUADRO / escalaTotal;

    ctx.drawImage(img, origemX, origemY, tamanhoOrigem, tamanhoOrigem, 0, 0, SAIDA, SAIDA);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const arquivoRecortado = new File([blob], "foto.jpg", { type: "image/jpeg" });
        setPreview(URL.createObjectURL(arquivoRecortado));
        const formData = new FormData();
        formData.set("foto", arquivoRecortado);
        acaoFormulario(formData);
        setImagemEscolhida(null);
      },
      "image/jpeg",
      0.9
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex items-center gap-4">
          <AvatarUsuario nome={nome} fotoUrl={preview ?? fotoUrl} tamanho="h-16 w-16 shrink-0 text-lg" />

          <div className="min-w-0 flex-1 space-y-1">
            <input
              type="file"
              accept="image/*"
              onChange={aoEscolherArquivo}
              className="block w-full text-sm text-neutral-600 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
            />
            <p className="text-xs text-neutral-400">JPG ou PNG, até 2MB. Você ajusta o recorte antes de salvar.</p>
            {estado.erro && <p className="text-xs text-red-600">{estado.erro}</p>}
          </div>
        </div>

        {(pendente || salvo) && (
          <span
            className={`shrink-0 rounded-md px-3 py-2 text-sm font-medium text-white shadow-sm ${
              salvo ? "bg-green-600" : "bg-blue-600"
            }`}
          >
            {pendente ? "Salvando..." : "Salvo ✓"}
          </span>
        )}
      </div>

      {imagemEscolhida && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={fecharAjuste}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-1 text-sm font-semibold text-neutral-800">Ajuste sua foto</h2>
            <p className="mb-3 text-xs text-neutral-400">Arraste pra posicionar e use o zoom pra aproximar.</p>

            <div
              className="relative mx-auto touch-none overflow-hidden rounded-full border border-neutral-200 bg-neutral-100"
              style={{ width: QUADRO, height: QUADRO }}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                aoIniciarArrasto(e.clientX, e.clientY);
              }}
              onPointerMove={(e) => aoMoverArrasto(e.clientX, e.clientY)}
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
                className="absolute select-none"
                style={{
                  width: larguraImg || undefined,
                  height: alturaImg || undefined,
                  left: larguraImg ? (QUADRO - larguraImg) / 2 + pos.x : 0,
                  top: alturaImg ? (QUADRO - alturaImg) / 2 + pos.y : 0,
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
                onClick={fecharAjuste}
                className="flex-1 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={aoConfirmarRecorte}
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
