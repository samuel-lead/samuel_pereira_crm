"use client";

import { useActionState, useState } from "react";
import { criarUsuario, type EstadoFormulario } from "@/lib/usuarios/actions";
import { paginasParaPublico } from "@/lib/paginas-permitidas";
import { MenuSelect } from "@/components/menu-select";

const estadoInicial: EstadoFormulario = { erro: null };
const campoClasse =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";
const labelClasse = "text-sm font-medium text-neutral-700";

export function NovoUsuarioForm({ publicoOrg = "mentoria" }: { publicoOrg?: string }) {
  const paginasConfiguraveis = paginasParaPublico(publicoOrg);
  const [estado, acaoFormulario] = useActionState(criarUsuario, estadoInicial);
  const [papel, setPapel] = useState<"admin" | "membro">("membro");

  return (
    <form action={acaoFormulario} className="space-y-4">
      <div className="space-y-1">
        <label className={labelClasse} htmlFor="nome">
          Nome *
        </label>
        <input id="nome" name="nome" required className={campoClasse} />
      </div>

      <div className="space-y-1">
        <label className={labelClasse} htmlFor="email">
          E-mail *
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className={campoClasse}
        />
      </div>

      <div className="space-y-1">
        <label className={labelClasse} htmlFor="wpp_comercial">
          WhatsApp *
        </label>
        <input
          id="wpp_comercial"
          name="wpp_comercial"
          type="tel"
          required
          placeholder="+55 62 99999-9999"
          className={campoClasse}
        />
        <p className="text-xs text-neutral-400">
          Usamos esse número pra avisos importantes, tipo lembrete de contato.
        </p>
      </div>

      <div className="space-y-1">
        <label className={labelClasse} htmlFor="funcao">
          Função
        </label>
        <MenuSelect
          id="funcao"
          name="funcao"
          defaultValue=""
          options={[
            { value: "", label: "— Não definida —" },
            { value: "sdr", label: "SDR" },
            { value: "closer", label: "Closer" },
          ]}
        />
      </div>

      <div className="space-y-1">
        <label className={labelClasse} htmlFor="senha">
          Senha temporária *
        </label>
        <input
          id="senha"
          name="senha"
          type="text"
          required
          minLength={6}
          placeholder="Mínimo 6 caracteres"
          className={campoClasse}
        />
        <p className="text-xs text-neutral-400">
          Combine com a pessoa por fora. Ela consegue trocar depois de entrar.
        </p>
      </div>

      <fieldset className="space-y-2 rounded-md border border-neutral-200 bg-neutral-50 p-3">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Tipo de acesso
        </legend>

        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input
            type="radio"
            name="papel"
            value="admin"
            checked={papel === "admin"}
            onChange={() => setPapel("admin")}
          />
          Administrador — acessa tudo, inclusive Usuários e Configurações
        </label>
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input
            type="radio"
            name="papel"
            value="membro"
            checked={papel === "membro"}
            onChange={() => setPapel("membro")}
          />
          Membro — só acessa as páginas escolhidas abaixo
        </label>
      </fieldset>

      {papel === "membro" && (
        <fieldset className="space-y-2 rounded-md border border-neutral-200 bg-neutral-50 p-3">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Páginas permitidas
          </legend>

          {paginasConfiguraveis.map((pagina) => (
            <label
              key={pagina.chave}
              className="flex items-center gap-2 text-sm text-neutral-700"
            >
              <input
                type="checkbox"
                name="paginas_permitidas"
                value={pagina.chave}
                defaultChecked
              />
              {pagina.label}
            </label>
          ))}
        </fieldset>
      )}

      {estado.erro && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {estado.erro}
        </p>
      )}

      <button
        type="submit"
        className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
      >
        Cadastrar usuário
      </button>
    </form>
  );
}
