"use client";

const campoClasse =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";
const labelClasse = "text-sm font-medium text-neutral-700";

// Campos do formulário "Grupo do WhatsApp": o que a pessoa vê (nome e
// descrição do grupo) e pra onde ela vai depois de se cadastrar (link de
// convite). Usado na criação e na edição do formulário.
export function CamposGrupo({
  inicial,
}: {
  inicial?: { nome: string | null; descricao: string | null; link: string | null };
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className={labelClasse} htmlFor="grupo_nome">
          Nome do grupo *
        </label>
        <input
          id="grupo_nome"
          name="grupo_nome"
          required
          defaultValue={inicial?.nome ?? ""}
          placeholder="Ex.: Lula reeleito, e agora, corretor?"
          className={campoClasse}
        />
      </div>
      <div className="space-y-1">
        <label className={labelClasse} htmlFor="grupo_descricao">
          Descrição do grupo
        </label>
        <textarea
          id="grupo_descricao"
          name="grupo_descricao"
          rows={8}
          defaultValue={inicial?.descricao ?? ""}
          placeholder="O texto que aparece embaixo do nome do grupo"
          className={campoClasse}
        />
        <p className="text-xs text-neutral-400">As quebras de linha e os emojis aparecem do jeito que você escrever.</p>
      </div>
      <div className="space-y-1">
        <label className={labelClasse} htmlFor="grupo_link">
          Link de convite do grupo *
        </label>
        <input
          id="grupo_link"
          name="grupo_link"
          type="url"
          required
          defaultValue={inicial?.link ?? ""}
          placeholder="https://chat.whatsapp.com/..."
          className={campoClasse}
        />
        <p className="text-xs text-neutral-400">
          No WhatsApp: abra o grupo → nome do grupo → &quot;Convidar via link&quot; → copiar link. A pessoa só
          recebe esse link depois de digitar o telefone.
        </p>
      </div>
    </div>
  );
}
