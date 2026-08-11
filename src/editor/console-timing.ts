/**
 * Timing helpers for the presenter console.
 *
 * Speaker notes conventionally start with a rough estimate ("~2 min",
 * "~45 sec"). We parse those to give the presenter a pacing signal without
 * asking them to fill in a separate field.
 */

/**
 * Pulls a "~2 min" / "~1.5 min" / "~45 sec" estimate off the front of a note.
 *
 * Anchored deliberately: notes mention durations in passing ("leave this up
 * for the ~30 min discussion") and only a leading estimate is a budget.
 */
export function parseNoteMinutes(notes: string): number | null {
  const match = /^\s*~\s*(\d+(?:\.\d+)?)\s*(min|sec)/i.exec(notes);
  if (!match) return null;
  const value = Number(match[1]);
  return match[2].toLowerCase() === "sec" ? value / 60 : value;
}

/** Sum of the estimates found across a run of notes. Unparseable notes count 0. */
export function plannedMinutes(notes: string[]): number {
  let total = 0;
  for (const note of notes) total += parseNoteMinutes(note) ?? 0;
  return total;
}

/** Seconds as mm:ss, clamped at zero. */
export function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

/** Renders a per-waypoint budget in whichever unit reads better. */
export function formatBudget(minutes: number): string {
  if (minutes < 1) return `${Math.round(minutes * 60)} sec`;
  return `${Number(minutes.toFixed(1))} min`;
}

export type PaceState = "ahead" | "on-plan" | "over";

/**
 * Compares wall-clock elapsed time against the plan up to and including the
 * current waypoint. Within a minute either way counts as on plan.
 */
export function pace(
  elapsedSeconds: number,
  plannedSoFarMinutes: number,
): { state: PaceState; label: string } {
  const delta = elapsedSeconds / 60 - plannedSoFarMinutes;
  if (delta > 1) return { state: "over", label: `${Math.round(delta)} min over` };
  if (delta < -1) return { state: "ahead", label: `${Math.round(-delta)} min ahead` };
  return { state: "on-plan", label: "on plan" };
}
