"use client";

import Link from "next/link";
import { AppIcon } from "@/components/atoms/app-icon";
import { PageHeader } from "@/components/molecules/page-header";
import { ResourceFeedback } from "@/components/molecules/resource-feedback";
import {
  summarizeDays,
  summarizeRanges,
} from "@/components/organisms/schedule-group-form/index.function";
import { useGroupMutation, useScheduleGroups } from "@/features/schedule-rules";
import styles from "./index.module.css";

export function ScheduleListScreen() {
  const groups = useScheduleGroups();
  const mutation = useGroupMutation();

  async function toggleGroup(id: string, isActive: boolean) {
    const result = await mutation.setActive({ id, isActive });
    if (result.ok) groups.refetch();
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Disponibilidade"
        title="Seus horários"
        description="Organize dias com a mesma rotina em grupos e ligue somente os que estão em uso."
        action={
          <Link className={styles.createButton} href="/inicio/horarios/criar">
            <AppIcon name="plus" size={19} />
            <span>Novo grupo</span>
          </Link>
        }
      />

      {groups.status === "pending" ? (
        <ResourceFeedback kind="loading" title="Carregando seus horários…" />
      ) : null}
      {groups.status === "error" ? (
        <ResourceFeedback
          kind="error"
          title="Não foi possível carregar os grupos"
          description={groups.error.message}
          onRetry={groups.refetch}
        />
      ) : null}
      {groups.status === "empty" ? (
        <ResourceFeedback
          title="Você ainda não criou horários"
          description="Crie seu primeiro grupo para começar a receber agendamentos."
        />
      ) : null}
      {mutation.error ? (
        <ResourceFeedback
          kind="error"
          title={
            mutation.isConflict
              ? "Esse grupo conflita com outro horário ativo"
              : "Não foi possível alterar o grupo"
          }
          description={mutation.error.message}
        />
      ) : null}

      {groups.status === "success" ? (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {groups.data.map((group) => (
            <li className={styles.groupCard} key={group.id}>
              <header className="flex items-start justify-between gap-3">
                <div>
                  <span className={styles.status} data-active={group.isActive}>
                    {group.isActive ? "Ativo" : "Inativo"}
                  </span>
                  <h2 className={styles.groupName}>{group.name}</h2>
                </div>
                <label className={styles.switch}>
                  <span className="sr-only">
                    {group.isActive ? "Desativar" : "Ativar"} {group.name}
                  </span>
                  <input
                    checked={group.isActive}
                    disabled={mutation.isPending}
                    onChange={(event) =>
                      void toggleGroup(group.id, event.target.checked)
                    }
                    type="checkbox"
                  />
                  <span aria-hidden />
                </label>
              </header>

              <dl className="flex flex-col gap-3">
                <div>
                  <dt className={styles.detailLabel}>Dias</dt>
                  <dd className={styles.detailValue}>
                    {summarizeDays(group.rules)}
                  </dd>
                </div>
                <div>
                  <dt className={styles.detailLabel}>Faixas</dt>
                  <dd className={styles.detailValue}>
                    {summarizeRanges(group.rules)}
                  </dd>
                </div>
              </dl>

              <Link
                className={styles.editButton}
                href={`/inicio/horarios/editar?grupo=${group.id}`}
              >
                Editar grupo <AppIcon name="chevron-right" size={18} />
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
