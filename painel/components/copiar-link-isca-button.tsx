"use client";

import { useState } from "react";

export function CopiarLinkIscaButton({ link }: { link: string }) {
  const [copiado, setCopiado] = useState(false);

  function aoClicar() {
    navigator.clipboard?.writeText(link).catch(() => {});
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={aoClicar}
      className="rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-600 transition hover:bg-neutral-50"
    >
      {copiado ? "Copiado ✓" : "Copiar link"}
    </button>
  );
}
