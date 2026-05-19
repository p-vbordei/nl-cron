const DAYS: Record<string, number> = {
  sunday: 0, sun: 0,
  monday: 1, mon: 1,
  tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3, weds: 3,
  thursday: 4, thu: 4, thurs: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6,
};

const MONTHS: Record<string, number> = {
  january: 1, jan: 1,
  february: 2, feb: 2,
  march: 3, mar: 3,
  april: 4, apr: 4,
  may: 5,
  june: 6, jun: 6,
  july: 7, jul: 7,
  august: 8, aug: 8,
  september: 9, sep: 9, sept: 9,
  october: 10, oct: 10,
  november: 11, nov: 11,
  december: 12, dec: 12,
};

const NAMED_TIMES: Record<string, [number, number]> = {
  morning: [9, 0],
  afternoon: [15, 0],
  evening: [18, 0],
  night: [22, 0],
  midnight: [0, 0],
  noon: [12, 0],
};

const ALIAS_CRON: Record<string, string> = {
  hourly: "0 * * * *",
  daily: "0 0 * * *",
  midnight: "0 0 * * *",
  noon: "0 12 * * *",
  weekly: "0 0 * * 0",
  monthly: "0 0 1 * *",
  yearly: "0 0 1 1 *",
  annually: "0 0 1 1 *",
};

export interface ParseOptions {
  /** When true, interpret bare integers (e.g. "at 9") as 24h. Default: 12h ambiguous → assume morning if < 12. */
  assume24h?: boolean;
}

export interface ParseResult {
  cron: string;
}

function clockToHM(raw: string, opts: ParseOptions): [number, number] | null {
  const m = raw.trim().match(/^(\d{1,2})(?::(\d{1,2}))?\s*(a\.?m\.?|p\.?m\.?)?$/i);
  if (!m) {
    const named = NAMED_TIMES[raw.trim()];
    return named ? [named[0]!, named[1]!] : null;
  }
  let h = parseInt(m[1]!, 10);
  const mm = m[2] ? parseInt(m[2], 10) : 0;
  const suffix = m[3]?.replace(/\./g, "").toLowerCase();
  if (mm < 0 || mm > 59) return null;
  if (suffix === "pm") {
    if (h < 1 || h > 12) return null;
    if (h < 12) h += 12;
  } else if (suffix === "am") {
    if (h < 1 || h > 12) return null;
    if (h === 12) h = 0;
  } else {
    if (!opts.assume24h && h > 12) {
      if (h > 23) return null;
    } else if (opts.assume24h && h > 23) {
      return null;
    } else if (h > 23) {
      return null;
    }
  }
  return [h, mm];
}

function splitList(s: string): string[] {
  return s
    .split(/\s*(?:,|\sand\s|\s&\s)\s*/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function dayList(parts: string[]): string | null {
  const out: number[] = [];
  for (const p of parts) {
    const v = DAYS[p];
    if (v === undefined) return null;
    out.push(v);
  }
  if (!out.length) return null;
  return [...new Set(out)].sort((a, b) => a - b).join(",");
}

function monthList(parts: string[]): string | null {
  const out: number[] = [];
  for (const p of parts) {
    const v = MONTHS[p];
    if (v === undefined) return null;
    out.push(v);
  }
  if (!out.length) return null;
  return [...new Set(out)].sort((a, b) => a - b).join(",");
}

/**
 * Parse a natural-language schedule phrase into a 5-field cron expression
 * (`minute hour day-of-month month day-of-week`).
 *
 * Returns `null` for input it cannot parse.
 *
 * Supported forms (case-insensitive):
 *   - "every N (minute|hour|day)[s]"
 *   - "every (minute|hour|day|week|month|year)"
 *   - aliases: hourly, daily, weekly, monthly, yearly, annually, midnight, noon
 *   - "every <named-time>"  → e.g. "every morning"
 *   - "at <time>"           → e.g. "at 9", "at 9:30am", "at 14:00"
 *   - "<dow>[, <dow>...] at <time>"
 *   - "every <dow>[, <dow>...] at <time>"
 *   - "weekday[s] at <time>" / "weekend[s] at <time>"
 *   - "the Nth of <month>[, <month>...]"
 */
export function parse(input: string, opts: ParseOptions = {}): ParseResult | null {
  if (typeof input !== "string") return null;
  const s = input.trim().toLowerCase().replace(/\s+/g, " ");
  if (!s) return null;

  // Aliases
  if (ALIAS_CRON[s]) return { cron: ALIAS_CRON[s]! };

  // "every N (minute|hour|day)[s]"
  const everyN = s.match(/^every\s+(\d+)\s+(minute|minutes|hour|hours|day|days)$/);
  if (everyN) {
    const n = parseInt(everyN[1]!, 10);
    const unit = everyN[2]!;
    if (n <= 0) return null;
    if (unit.startsWith("minute") && n <= 59) return { cron: `*/${n} * * * *` };
    if (unit.startsWith("hour") && n <= 23) return { cron: `0 */${n} * * *` };
    if (unit.startsWith("day") && n <= 31) return { cron: `0 0 */${n} * *` };
    return null;
  }

  // "every <unit>"
  const everyOne = s.match(/^every\s+(minute|hour|day|week|month|year)$/);
  if (everyOne) {
    const u = everyOne[1]!;
    if (u === "minute") return { cron: "* * * * *" };
    if (u === "hour") return { cron: "0 * * * *" };
    if (u === "day") return { cron: "0 0 * * *" };
    if (u === "week") return { cron: "0 0 * * 0" };
    if (u === "month") return { cron: "0 0 1 * *" };
    if (u === "year") return { cron: "0 0 1 1 *" };
  }

  // Strip optional leading "every "
  let body = s.replace(/^every\s+/, "");

  // Split body by " at " (the schedule time keyword)
  let subjectPart: string | null = null;
  let timePart: string | null = null;
  const atMatch = body.match(/^(.*?)\s+at\s+(.+)$/);
  if (atMatch) {
    subjectPart = atMatch[1]!.trim();
    timePart = atMatch[2]!.trim();
  } else if (body.startsWith("at ")) {
    subjectPart = "day";
    timePart = body.slice(3).trim();
  } else {
    subjectPart = body.trim();
  }

  // Defaults
  let dow = "*";
  let dom = "*";
  let month = "*";

  // Subject resolution
  if (!subjectPart || subjectPart === "day" || subjectPart === "days") {
    // default
  } else if (/^weekdays?$/.test(subjectPart)) {
    dow = "1-5";
  } else if (/^weekends?$/.test(subjectPart)) {
    dow = "0,6";
  } else if (NAMED_TIMES[subjectPart] && !timePart) {
    const [h, mn] = NAMED_TIMES[subjectPart]!;
    return { cron: `${mn} ${h} * * *` };
  } else {
    // Try as list of day names
    const parts = splitList(subjectPart);
    const dl = dayList(parts);
    if (dl !== null) {
      dow = dl;
    } else {
      // Try "the Nth of <month>[, <month>]"
      const dom1 = subjectPart.match(/^(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)?(?:\s+of\s+(.+))?$/);
      if (dom1) {
        const d = parseInt(dom1[1]!, 10);
        if (d < 1 || d > 31) return null;
        dom = String(d);
        if (dom1[2]) {
          const ml = monthList(splitList(dom1[2]!));
          if (ml === null) return null;
          month = ml;
        }
      } else {
        return null;
      }
    }
  }

  // Time resolution
  let h = 0, mn = 0;
  if (timePart) {
    const t = clockToHM(timePart, opts);
    if (!t) return null;
    [h, mn] = t;
  }

  return { cron: `${mn} ${h} ${dom} ${month} ${dow}` };
}

export default parse;
