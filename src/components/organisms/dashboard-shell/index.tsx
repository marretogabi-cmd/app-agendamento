"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppIcon } from "@/components/atoms/app-icon";
import styles from "./index.module.css";

const navigation = [
  { href: "/inicio", label: "Início", icon: "home" as const, exact: true },
  {
    href: "/inicio/agendamentos",
    label: "Agendamentos",
    icon: "calendar" as const,
  },
  { href: "/inicio/horarios", label: "Horários", icon: "clock" as const },
  { href: "/perfil", label: "Perfil", icon: "profile" as const },
];

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-svh bg-base-200 text-base-content">
      <aside className={styles.sidebar} aria-label="Navegação principal">
        <Link className={styles.brand} href="/inicio">
          <span className={styles.brandMark} aria-hidden>
            A
          </span>
          <span>Agendamento</span>
        </Link>
        <nav className="flex flex-col gap-2">
          {navigation.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={styles.navLink}
                data-active={active}
                href={item.href}
                key={item.href}
              >
                <AppIcon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <p className={styles.sidebarHint}>Sua agenda, simples e organizada.</p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className={styles.mobileHeader}>
          <Link className={styles.brand} href="/inicio">
            <span className={styles.brandMark} aria-hidden>
              A
            </span>
            <span>Agendamento</span>
          </Link>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-10 lg:pt-10">
          {children}
        </main>
        <nav className={styles.mobileNav} aria-label="Navegação principal">
          {navigation.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={styles.mobileNavLink}
                data-active={active}
                href={item.href}
                key={item.href}
              >
                <AppIcon name={item.icon} size={21} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
