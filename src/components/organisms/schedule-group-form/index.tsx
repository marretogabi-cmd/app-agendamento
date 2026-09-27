"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AppIcon } from "@/components/atoms/app-icon";
import {
  useSaveScheduleGroup,
  type DayOfWeek,
  type SaveScheduleGroupInput,
  type ScheduleTimeRangeInput,
} from "@/features/schedule-rules";
import { WEEKDAYS, validateSchedule } from "./index.function";
import styles from "./index.module.css";

type ScheduleGroupFormProps = {
  initialValue?: SaveScheduleGroupInput;
  mode: "create" | "edit";
};

const defaultRange: ScheduleTimeRangeInput = {
  startTime: "08:00",
  endTime: "12:00",
};

export function ScheduleGroupForm({
  initialValue,
  mode,
}: ScheduleGroupFormProps) {
  const router = useRouter();
  const mutation = useSaveScheduleGroup();
  const [name, setName] = useState(initialValue?.name ?? "");
  const [days, setDays] = useState<DayOfWeek[]>(initialValue?.days ?? []);
  const [ranges, setRanges] = useState<ScheduleTimeRangeInput[]>(
    initialValue?.ranges.length ? initialValue.ranges : [defaultRange],
  );
  const [isActive, setIsActive] = useState(initialValue?.isActive ?? true);
  const [localError, setLocalError] = useState<string>();
  const busy = mutation.status === "pending";

  function toggleDay(day: DayOfWeek) {
    setDays((current) =>
      current.includes(day)
        ? current.filter((item) => item !== day)
        : [...current, day].sort((a, b) => a - b),
    );
  }

  function updateRange(
    index: number,
    field: keyof ScheduleTimeRangeInput,
    value: string,
  ) {
    setRanges((current) =>
      current.map((range, rangeIndex) =>
        rangeIndex === index ? { ...range, [field]: value } : range,
      ),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input: SaveScheduleGroupInput = {
      ...(initialValue?.id ? { id: initialValue.id } : {}),
      name: name.trim(),
      days,
      ranges,
      isActive,
    };
    const validationError = validateSchedule(input);
    setLocalError(validationError);
    if (validationError || busy) return;

    const result = await mutation.save(input);
    if (result.ok) {
      router.push("/inicio/horarios");
      router.refresh();
    }
  }

  return (
    <form className="flex flex-col gap-6" onSubmit={handleSubmit} noValidate>
      <section className={styles.card} aria-labelledby="group-data-title">
        <header>
          <h2 className={styles.cardTitle} id="group-data-title">
            Dados do grupo
          </h2>
          <p className={styles.cardDescription}>
            Use um nome fácil de reconhecer, como “Semana” ou “Sábado”.
          </p>
        </header>
        <label className={styles.field}>
          <span>Nome do grupo</span>
          <input
            disabled={busy}
            maxLength={120}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex.: Horário da semana"
            required
            value={name}
          />
        </label>
      </section>

      <section className={styles.card} aria-labelledby="weekdays-title">
        <header>
          <h2 className={styles.cardTitle} id="weekdays-title">
            Dias da semana
          </h2>
          <p className={styles.cardDescription}>
            As mesmas faixas serão aplicadas a todos os dias marcados.
          </p>
        </header>
        <fieldset className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          <legend className="sr-only">Selecione os dias</legend>
          {WEEKDAYS.map((day) => (
            <label
              className={styles.dayOption}
              data-selected={days.includes(day.value)}
              key={day.value}
            >
              <input
                checked={days.includes(day.value)}
                disabled={busy}
                onChange={() => toggleDay(day.value)}
                type="checkbox"
              />
              <span>{day.short}</span>
            </label>
          ))}
        </fieldset>
      </section>

      <section className={styles.card} aria-labelledby="ranges-title">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h2 className={styles.cardTitle} id="ranges-title">
              Faixas de atendimento
            </h2>
            <p className={styles.cardDescription}>
              Cada faixa será dividida em horários de 1 hora.
            </p>
          </div>
          <button
            className={styles.addButton}
            disabled={busy}
            onClick={() =>
              setRanges((current) => [
                ...current,
                { startTime: "13:00", endTime: "17:00" },
              ])
            }
            type="button"
          >
            <AppIcon name="plus" size={18} /> Adicionar
          </button>
        </header>
        <div className="flex flex-col gap-3">
          {ranges.map((range, index) => (
            <fieldset
              className={styles.rangeRow}
              key={`${index}-${ranges.length}`}
            >
              <legend className="sr-only">Faixa {index + 1}</legend>
              <label className={styles.field}>
                <span>Início</span>
                <input
                  disabled={busy}
                  onChange={(event) =>
                    updateRange(index, "startTime", event.target.value)
                  }
                  required
                  step={1800}
                  type="time"
                  value={range.startTime}
                />
              </label>
              <label className={styles.field}>
                <span>Fim</span>
                <input
                  disabled={busy}
                  onChange={(event) =>
                    updateRange(index, "endTime", event.target.value)
                  }
                  required
                  step={1800}
                  type="time"
                  value={range.endTime}
                />
              </label>
              {ranges.length > 1 ? (
                <button
                  className={styles.removeButton}
                  disabled={busy}
                  onClick={() =>
                    setRanges((current) =>
                      current.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                  type="button"
                >
                  Remover
                </button>
              ) : null}
            </fieldset>
          ))}
        </div>
      </section>

      <label className={styles.activeOption}>
        <input
          checked={isActive}
          disabled={busy}
          onChange={(event) => setIsActive(event.target.checked)}
          type="checkbox"
        />
        <span>
          <strong>Ativar agora</strong>
          <small>
            Os horários começarão a aparecer como disponíveis ao salvar.
          </small>
        </span>
      </label>

      {localError || mutation.error ? (
        <p className={styles.error} role="alert">
          {localError ?? mutation.error?.message}
        </p>
      ) : null}

      <footer className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          className={styles.cancelButton}
          disabled={busy}
          onClick={() => router.push("/inicio/horarios")}
          type="button"
        >
          Cancelar
        </button>
        <button className={styles.saveButton} disabled={busy} type="submit">
          {busy
            ? "Salvando…"
            : mode === "create"
              ? "Criar grupo"
              : "Salvar alterações"}
        </button>
      </footer>
    </form>
  );
}
