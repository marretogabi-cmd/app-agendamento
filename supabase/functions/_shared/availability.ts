// deno-lint-ignore no-import-prefix
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.116.0";
// deno-lint-ignore no-import-prefix
import { Temporal } from "npm:@js-temporal/polyfill@0.5.1";
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

export function localRuleRange(
  date: string,
  startTime: string,
  endTime: string,
  timezone: string,
): TimeRange {
  return {
    start: Temporal.PlainDateTime.from(`${date}T${startTime}`)
      .toZonedDateTime(timezone)
      .toInstant()
      .toString(),
    end: Temporal.PlainDateTime.from(`${date}T${endTime}`)
      .toZonedDateTime(timezone)
      .toInstant()
      .toString(),
  };
}

export function splitIntoHourlySlots(ranges: TimeRange[]): TimeRange[] {
  const hour = 3_600_000;
  return ranges.flatMap((range) => {
    const [start, end] = millis(range);
    const slots: TimeRange[] = [];
    for (let cursor = start; cursor + hour <= end; cursor += hour) {
      slots.push({
        start: new Date(cursor).toISOString(),
        end: new Date(cursor + hour).toISOString(),
      });
    }
    return slots;
  });
}

export function rangesOverlap(left: TimeRange, right: TimeRange): boolean {
  const [leftStart, leftEnd] = millis(left);
  const [rightStart, rightEnd] = millis(right);
  return leftStart < rightEnd && rightStart < leftEnd;
}

export async function calculateDay(
  admin: SupabaseClient,
  providerId: string,
  date: string,
): Promise<
  { available: TimeRange[]; agenda: AgendaRange[]; timezone: string }
> {
  const profileResult = await admin
    .from("profiles")
    .select("timezone")
    .eq("id", providerId)
    .maybeSingle();
  if (profileResult.error) dbError(profileResult.error);
  const timezone = profileResult.data?.timezone ?? "America/Sao_Paulo";
  const plainDate = Temporal.PlainDate.from(date);
  const dayStart = plainDate
    .toZonedDateTime(timezone)
    .toInstant()
    .epochMilliseconds;
  const dayEnd = plainDate
    .add({ days: 1 })
    .toZonedDateTime(timezone)
    .toInstant()
    .epochMilliseconds;
  const dayOfWeek = plainDate.dayOfWeek;

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
    localRuleRange(date, rule.start_time, rule.end_time, timezone)
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

  const unavailable = [...blocks, ...bookings];
  const now = Date.now();
  const availableByInterval = new Map<string, TimeRange>();
  for (const slot of splitIntoHourlySlots([...recurring, ...extras])) {
    if (
      millis(slot)[0] >= now &&
      !unavailable.some((range) => rangesOverlap(slot, range))
    ) {
      availableByInterval.set(`${slot.start}/${slot.end}`, slot);
    }
  }
  const available = [...availableByInterval.values()].sort(
    (left, right) => millis(left)[0] - millis(right)[0],
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

  return { available, agenda, timezone };
}
