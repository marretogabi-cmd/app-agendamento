"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import styles from "./index.module.css";

const steps = [
  { key: "agendar", label: "Agendar" },
  { key: "dados", label: "Dados" },
  { key: "resumo", label: "Resumo" },
] as const;

export function PublicBookingShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const activeIndex = Math.max(
    0,
    steps.findIndex((step) => pathname.endsWith(`/${step.key}`)),
  );

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <p className={styles.brand}>Lume Agendas</p>
        <nav aria-label="Etapas do agendamento" className={styles.progress}>
          <ol className="grid grid-cols-3">
            {steps.map((step, index) => (
              <li
                aria-current={index === activeIndex ? "step" : undefined}
                className={styles.step}
                data-active={index === activeIndex}
                data-complete={index < activeIndex}
                key={step.key}
              >
                <span className={styles.stepNumber} aria-hidden="true">
                  {index + 1}
                </span>
                <span>{step.label}</span>
              </li>
            ))}
          </ol>
        </nav>
      </header>

      <div className={styles.content}>{children}</div>

      <footer className={styles.footer}>
        <p>Agendamento simples, seguro e sem cadastro.</p>
      </footer>
    </main>
  );
}
