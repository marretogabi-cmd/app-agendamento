"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AppIcon } from "@/components/atoms/app-icon";
import { PageHeader } from "@/components/molecules/page-header";
import { useSignOut } from "@/features/auth";
import {
  useUpdateProfile,
  type BrazilianTimezone,
  type ProfileDto,
} from "@/features/profile";
import styles from "./index.module.css";

const timezones: Array<{
  value: BrazilianTimezone;
  label: string;
  detail: string;
}> = [
  { value: "America/Noronha", label: "Fernando de Noronha", detail: "UTC−2" },
  { value: "America/Sao_Paulo", label: "Horário de Brasília", detail: "UTC−3" },
  { value: "America/Manaus", label: "Amazonas", detail: "UTC−4" },
  { value: "America/Rio_Branco", label: "Acre", detail: "UTC−5" },
];

type ProfileScreenProps = {
  email: string;
  initialProfile?: ProfileDto;
  firstAccess: boolean;
};

export function ProfileScreen({
  email,
  initialProfile,
  firstAccess,
}: ProfileScreenProps) {
  const router = useRouter();
  const update = useUpdateProfile();
  const signOut = useSignOut();
  const [name, setName] = useState(initialProfile?.name ?? "");
  const [phone, setPhone] = useState(initialProfile?.phone ?? "");
  const [publicSlug, setPublicSlug] = useState(
    initialProfile?.publicSlug ?? "",
  );
  const [timezone, setTimezone] = useState<BrazilianTimezone>(
    initialProfile?.timezone ?? "America/Sao_Paulo",
  );
  const [feedback, setFeedback] = useState<string>();
  const [localError, setLocalError] = useState<string>();
  const busy = update.status === "pending" || signOut.status === "pending";
  const sharePath = publicSlug
    ? `/${publicSlug}/agendar`
    : "/seu-endereco/agendar";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(undefined);
    setLocalError(undefined);
    if (!name.trim() || !phone.trim() || !publicSlug.trim()) {
      setLocalError("Preencha nome, celular e endereço público.");
      return;
    }

    const result = await update.update({
      name: name.trim(),
      phone: phone.trim(),
      publicSlug: publicSlug.trim().toLowerCase(),
      timezone,
    });
    if (!result.ok) return;
    setFeedback("Perfil salvo com sucesso.");
    if (firstAccess || !initialProfile) {
      router.push("/inicio");
      router.refresh();
    }
  }

  async function copyShareLink() {
    if (!publicSlug || typeof window === "undefined") return;
    const link = `${window.location.origin}/${publicSlug}/agendar`;
    try {
      await navigator.clipboard.writeText(link);
      setFeedback("Link de compartilhamento copiado.");
      setLocalError(undefined);
    } catch {
      setLocalError("Não foi possível copiar o link neste navegador.");
    }
  }

  async function handleSignOut() {
    const result = await signOut.signOut();
    if (result.ok) {
      router.replace("/sign-in");
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Sua conta"
        title={firstAccess ? "Complete seu perfil" : "Perfil"}
        description={
          firstAccess
            ? "Precisamos destes dados antes de publicar sua agenda."
            : "Mantenha seus dados e seu endereço de agendamento atualizados."
        }
      />

      {firstAccess ? (
        <aside className={styles.onboarding}>
          <strong>Último passo</strong>
          <span>
            Depois de salvar, você poderá configurar horários e receber
            agendamentos.
          </span>
        </aside>
      ) : null}

      <form
        className="grid gap-6 lg:grid-cols-[1fr_0.8fr]"
        onSubmit={handleSubmit}
      >
        <section className={styles.card} aria-labelledby="personal-title">
          <header>
            <h2 className={styles.cardTitle} id="personal-title">
              Dados pessoais
            </h2>
            <p className={styles.cardDescription}>
              O nome será usado na saudação e na agenda pública.
            </p>
          </header>

          <label className={styles.field}>
            <span>Nome</span>
            <input
              autoComplete="name"
              disabled={busy}
              maxLength={120}
              onChange={(event) => setName(event.target.value)}
              required
              value={name}
            />
          </label>

          <label className={styles.field}>
            <span>E-mail da conta</span>
            <input disabled readOnly type="email" value={email} />
            <small>O e-mail é gerenciado pela sua conta de acesso.</small>
          </label>

          <label className={styles.field}>
            <span>Celular</span>
            <input
              autoComplete="tel"
              disabled={busy}
              minLength={7}
              maxLength={30}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="(11) 99999-9999"
              required
              type="tel"
              value={phone}
            />
          </label>

          <label className={styles.field}>
            <span>Fuso horário</span>
            <select
              disabled={busy}
              onChange={(event) =>
                setTimezone(event.target.value as BrazilianTimezone)
              }
              value={timezone}
            >
              {timezones.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label} ({item.detail})
                </option>
              ))}
            </select>
            <small>Todos os horários da agenda usarão este fuso.</small>
          </label>
        </section>

        <aside className="flex flex-col gap-6">
          <section className={styles.card} aria-labelledby="public-link-title">
            <header>
              <h2 className={styles.cardTitle} id="public-link-title">
                Site de agendamento
              </h2>
              <p className={styles.cardDescription}>
                Escolha um endereço curto para compartilhar com seus clientes.
              </p>
            </header>

            <label className={styles.field}>
              <span>Endereço público</span>
              <span className={styles.slugField}>
                <span>/</span>
                <input
                  autoCapitalize="none"
                  disabled={busy}
                  maxLength={80}
                  minLength={3}
                  onChange={(event) =>
                    setPublicSlug(
                      event.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9-]/g, ""),
                    )
                  }
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  placeholder="meu-negocio"
                  required
                  value={publicSlug}
                />
                <span>/agendar</span>
              </span>
            </label>

            <div className={styles.linkPreview}>
              <small>Seu link</small>
              <strong>{sharePath}</strong>
            </div>

            <button
              className={styles.copyButton}
              disabled={!publicSlug || busy}
              onClick={() => void copyShareLink()}
              type="button"
            >
              <AppIcon name="copy" size={19} /> Copiar link de compartilhamento
            </button>
          </section>

          <button
            className={styles.logoutButton}
            disabled={busy}
            onClick={() => void handleSignOut()}
            type="button"
          >
            <AppIcon name="logout" size={19} /> Sair da conta
          </button>
        </aside>

        <footer className="flex flex-col gap-3 lg:col-span-2 lg:items-end">
          {localError || update.error || signOut.error ? (
            <p className={styles.error} role="alert">
              {localError ?? update.error?.message ?? signOut.error?.message}
            </p>
          ) : null}
          {feedback ? (
            <p className={styles.success} role="status">
              {feedback}
            </p>
          ) : null}
          <button className={styles.saveButton} disabled={busy} type="submit">
            {update.status === "pending" ? "Salvando…" : "Salvar perfil"}
          </button>
        </footer>
      </form>
    </div>
  );
}
