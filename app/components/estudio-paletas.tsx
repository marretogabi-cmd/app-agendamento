"use client";

import { useEffect, useState } from "react";
import { PALETAS, SWATCHES, type PaletaId } from "../lib/paletas";

export function EstudioPaletas() {
  const [ativa, setAtiva] = useState<PaletaId>("confianca");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", ativa);
  }, [ativa]);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 py-5">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral/70">
          Paletas DaisyUI
        </p>
        <h1 className="text-2xl font-semibold leading-tight">
          Cores do agendamento
        </h1>
        <p className="text-sm leading-relaxed text-neutral/80">
          Quatro temas para MEI, pensados no celular. Toque uma paleta para ver
          o mesmo fluxo de marcar horário.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-2">
        {PALETAS.map((paleta) => (
          <button
            key={paleta.id}
            type="button"
            data-theme={paleta.id}
            onClick={() => setAtiva(paleta.id)}
            className={`rounded-box border-2 bg-base-100 p-3 text-left text-base-content ${
              ativa === paleta.id
                ? "border-primary"
                : "border-base-300"
            }`}
          >
            <span className="flex gap-1 pb-2">
              <span className="size-4 rounded-full bg-primary" />
              <span className="size-4 rounded-full bg-secondary" />
              <span className="size-4 rounded-full bg-accent" />
            </span>
            <span className="block text-sm font-semibold">{paleta.nome}</span>
            <span className="mt-0.5 block text-[11px] leading-snug opacity-70">
              {paleta.para}
            </span>
          </button>
        ))}
      </div>

      <section className="flex flex-col gap-4">
        <article className="card border border-base-300 bg-base-100">
          <div className="card-body gap-3 p-4">
            <div>
              <h2 className="card-title text-lg">
                {PALETAS.find((paleta) => paleta.id === ativa)?.nome}
              </h2>
              <p className="text-sm leading-relaxed opacity-80">
                {PALETAS.find((paleta) => paleta.id === ativa)?.resumo}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {SWATCHES.map((swatch) => (
                <div key={swatch.token} className="flex flex-col gap-1">
                  <div
                    className="h-10 rounded-field border border-base-300"
                    style={{ backgroundColor: `var(--color-${swatch.token})` }}
                  />
                  <span className="text-[11px] leading-tight opacity-70">
                    {swatch.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="card border border-base-300 bg-base-100">
          <div className="card-body gap-4 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
                  Próximo horário
                </p>
                <h3 className="text-xl font-semibold">Corte · Ana</h3>
                <p className="text-sm opacity-80">Hoje, 10:30 · 45 min</p>
              </div>
              <span className="badge badge-success badge-lg">Confirmado</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="badge badge-warning">Pendente</span>
              <span className="badge badge-error">Cancelado</span>
              <span className="badge badge-info">Lembrete</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className="btn btn-primary btn-lg">
                Agendar
              </button>
              <button type="button" className="btn btn-outline btn-lg">
                Remarcar
              </button>
            </div>
            <button type="button" className="btn btn-secondary btn-block">
              Enviar no WhatsApp
            </button>
            <div className="alert alert-warning text-sm">
              <span>2 clientes ainda não confirmaram amanhã.</span>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
