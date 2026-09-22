// deno-lint-ignore no-import-prefix
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.116.0";
import { dbError } from "./http.ts";

export type TimeRange = { start: string; end: string };
export type AgendaRange = TimeRange & {
  state: "available" | "booked" | "blocked";
  appointmentId?: string;
};

type DbRange = {
  start_datetime: string;
  end_datetime: string;
  is_available?: boolean;
  id?: string;
};

function millis(range: TimeRange): [number, number] {
  return [new Date(range.start).valueOf(), new Date(range.end).valueOf()];
}

function mergeRanges(ranges: TimeRange[]): TimeRange[] {
  const sorted = [...ranges].sort((a, b) => millis(a)[0] - millis(b)[0]);
  const result: TimeRange[] = [];
  for (const current of sorted) {
    const last = result.at(-1);
    if (!last || millis(current)[0] > millis(last)[1]) {
      result.push({ ...current });
      continue;
    }
    if (millis(current)[1] > millis(last)[1]) last.end = current.end;
  }
  return result;
}

function subtractOne(source: TimeRange, removed: TimeRange): TimeRange[] {
  const [sourceStart, sourceEnd] = millis(source);
  const [removedStart, removedEnd] = millis(removed);
  if (removedEnd <= sourceStart || removedStart >= sourceEnd) return [source];
  const result: TimeRange[] = [];
  if (removedStart > sourceStart) {
    result.push({
      start: source.start,
      end: new Date(removedStart).toISOString(),
    });
  }
  if (removedEnd < sourceEnd) {
    result.push({ start: new Date(removedEnd).toISOString(), end: source.end });
  }
  return result;
}

function subtractRanges(
  source: TimeRange[],
  removed: TimeRange[],
): TimeRange[] {
  return removed.reduce(
    (remaining, item) => remaining.flatMap((range) => subtractOne(range, item)),
    source,
  );
}

function clipped(
  range: TimeRange,
  dayStart: number,
  dayEnd: number,
): TimeRange | null {
  const [start, end] = millis(range);
  const clippedStart = Math.max(start, dayStart);
  const clippedEnd = Math.min(end, dayEnd);
  return clippedStart < clippedEnd
    ? {
      start: new Date(clippedStart).toISOString(),
      end: new Date(clippedEnd).toISOString(),
    }
    : null;
}

function ruleRange(
  date: string,
  startTime: string,
  endTime: string,
): TimeRange {
  return {
    start: new Date(`${date}T${startTime}Z`).toISOString(),
    end: new Date(`${date}T${endTime}Z`).toISOString(),
  };
}

export async function calculateDay(
  admin: SupabaseClient,
  providerId: string,
  date: string,
): Promise<{ available: TimeRange[]; agenda: AgendaRange[] }> {
  const dayStart = new Date(`${date}T00:00:00.000Z`).valueOf();
  const dayEnd = dayStart + 86_400_000;
  const dayOfWeek = new Date(dayStart).getUTCDay() || 7;

  const groupsResult = await admin
    .from("AvailabilityRuleGroup")
    .select("id")
    .eq("provider_id", providerId)
    .eq("is_active", true);
  if (groupsResult.error) dbError(groupsResult.error);
  const groupIds = (groupsResult.data ?? []).map((row) => row.id as string);

  let ruleRows: Array<{ start_time: string; end_time: string }> = [];
  if (groupIds.length > 0) {
    const rulesResult = await admin
      .from("AvailabilityRule")
      .select("start_time,end_time")
      .in("group_id", groupIds)
      .eq("day_of_week", dayOfWeek);
    if (rulesResult.error) dbError(rulesResult.error);
    ruleRows = rulesResult.data ?? [];
  }

  const [overridesResult, appointmentsResult] = await Promise.all([
    admin
      .from("AvailabilityOverride")
      .select("start_datetime,end_datetime,is_available")
      .eq("provider_id", providerId)
      .lt("start_datetime", new Date(dayEnd).toISOString())
      .gt("end_datetime", new Date(dayStart).toISOString()),
    admin
      .from("Appointment")
      .select("id,start_datetime,end_datetime")
      .eq("provider_id", providerId)
      .eq("status", "CONFIRMED")
      .lt("start_datetime", new Date(dayEnd).toISOString())
      .gt("end_datetime", new Date(dayStart).toISOString()),
  ]);
  if (overridesResult.error) dbError(overridesResult.error);
  if (appointmentsResult.error) dbError(appointmentsResult.error);

  const overrides = (overridesResult.data ?? []) as DbRange[];
  const appointments = (appointmentsResult.data ?? []) as DbRange[];
  const recurring = ruleRows.map((rule) =>
    ruleRange(date, rule.start_time, rule.end_time)
  );
  const extras = overrides
    .filter((row) => row.is_available)
    .map((row) =>
      clipped(
        { start: row.start_datetime, end: row.end_datetime },
        dayStart,
        dayEnd,
      )
    )
    .filter((row): row is TimeRange => row !== null);
  const blocks = overrides
    .filter((row) => !row.is_available)
    .map((row) =>
      clipped(
        { start: row.start_datetime, end: row.end_datetime },
        dayStart,
        dayEnd,
      )
    )
    .filter((row): row is TimeRange => row !== null);
  const bookings = appointments.flatMap((row) => {
    const range = clipped(
      { start: row.start_datetime, end: row.end_datetime },
      dayStart,
      dayEnd,
    );
    return range ? [{ ...range, id: row.id! }] : [];
  });

  const windows = mergeRanges([...recurring, ...extras]);
  const available = subtractRanges(
    subtractRanges(windows, mergeRanges(blocks)),
    mergeRanges(bookings),
  );
  const agenda: AgendaRange[] = [
    ...available.map((range) => ({ ...range, state: "available" as const })),
    ...blocks.map((range) => ({ ...range, state: "blocked" as const })),
    ...bookings.map((range) => ({
      start: range.start,
      end: range.end,
      state: "booked" as const,
      appointmentId: range.id,
    })),
  ].sort((a, b) => millis(a)[0] - millis(b)[0]);

  return { available, agenda };
}
