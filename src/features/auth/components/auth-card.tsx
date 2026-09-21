import type { ReactNode } from "react";

type AuthCardProps = {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
};

export function AuthCard({
  title,
  description,
  children,
  footer,
}: AuthCardProps) {
  return (
    <main className="flex min-h-svh flex-1 items-center justify-center bg-base-200 px-4 py-8 text-base-content sm:px-6">
      <section className="w-full max-w-md" aria-labelledby="auth-title">
        <div className="mb-6 flex items-center justify-center gap-3">
          <span
            aria-hidden="true"
            className="grid size-11 place-items-center rounded-box bg-primary text-xl font-bold text-primary-content"
          >
            A
          </span>
          <span className="text-lg font-bold tracking-tight">Agendamento</span>
        </div>

        <div className="card border border-base-300 bg-base-100 shadow-sm">
          <div className="card-body gap-5 p-5 sm:p-7">
            <header className="space-y-2">
              <h1 id="auth-title" className="text-2xl font-bold text-balance">
                {title}
              </h1>
              <p className="text-sm leading-6 text-base-content/75">
                {description}
              </p>
            </header>

            {children}

            <footer className="border-t border-base-300 pt-5 text-center text-sm">
              {footer}
            </footer>
          </div>
        </div>
      </section>
    </main>
  );
}
