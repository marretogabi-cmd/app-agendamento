import type {
  AvailabilityRuleDto,
  DayOfWeek,
  SaveScheduleGroupInput,
  ScheduleTimeRangeInput,
} from "@/features/schedule-rules";

export const WEEKDAYS: Array<{
  value: DayOfWeek;
  short: string;
  label: string;
}> = [
  { value: 1, short: "Seg", label: "Segunda" },
  { value: 2, short: "Ter", label: "Terça" },
  { value: 3, short: "Qua", label: "Quarta" },
  { value: 4, short: "Qui", label: "Quinta" },
  { value: 5, short: "Sex", label: "Sexta" },
  { value: 6, short: "Sáb", label: "Sábado" },
  { value: 7, short: "Dom", label: "Domingo" },
];

export function timeMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function validateSchedule(
  input: SaveScheduleGroupInput,
): string | undefined {
  if (!input.name.trim()) return "Informe um nome para o grupo.";
  if (input.days.length === 0) return "Selecione ao menos um dia da semana.";
  if (input.ranges.length === 0)
    return "Adicione ao menos uma faixa de horário.";

  for (const range of input.ranges) {
    const start = timeMinutes(range.startTime);
    const end = timeMinutes(range.endTime);
    if (end <= start)
      return "O fim de cada faixa deve ser posterior ao início.";
    if (start % 30 !== 0 || end % 30 !== 0 || (end - start) % 60 !== 0) {
      return "Cada faixa deve usar passos de 30 minutos e conter horas completas.";
    }
  }

  const sorted = [...input.ranges].sort((a, b) =>
    a.startTime.localeCompare(b.startTime),
  );
  if (
    sorted.some((range, index) => {
      const next = sorted[index + 1];
      return next ? range.endTime > next.startTime : false;
    })
  ) {
    return "As faixas de horário não podem se sobrepor.";
  }
  return undefined;
}

export function formValuesFromRules(rules: AvailabilityRuleDto[]): {
  days: DayOfWeek[];
  ranges: ScheduleTimeRangeInput[];
} {
  const days = [...new Set(rules.map((rule) => rule.dayOfWeek))].sort(
    (a, b) => a - b,
  ) as DayOfWeek[];
  const firstDay = days[0];
  const ranges = rules
    .filter((rule) => rule.dayOfWeek === firstDay)
    .map((rule) => ({
      startTime: rule.startTime.slice(0, 5),
      endTime: rule.endTime.slice(0, 5),
    }));
  return { days, ranges };
}

export function summarizeDays(rules: AvailabilityRuleDto[]): string {
  const selected = new Set(rules.map((rule) => rule.dayOfWeek));
  if (
    [1, 2, 3, 4, 5].every((day) => selected.has(day as DayOfWeek)) &&
    selected.size === 5
  ) {
    return "Segunda a sexta";
  }
  if (selected.has(6) && selected.has(7) && selected.size === 2)
    return "Fim de semana";
  return WEEKDAYS.filter((day) => selected.has(day.value))
    .map((day) => day.short)
    .join(", ");
}

export function summarizeRanges(rules: AvailabilityRuleDto[]): string {
  const seen = new Set<string>();
  return rules
    .filter((rule) => {
      const key = `${rule.startTime}-${rule.endTime}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((rule) => `${rule.startTime.slice(0, 5)}–${rule.endTime.slice(0, 5)}`)
    .join(" · ");
}
