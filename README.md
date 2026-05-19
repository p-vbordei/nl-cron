# nl-cron

[![ci](https://github.com/p-vbordei/nl-cron/actions/workflows/ci.yml/badge.svg)](https://github.com/p-vbordei/nl-cron/actions/workflows/ci.yml)

[![npm](https://img.shields.io/npm/v/nl-cron.svg)](https://www.npmjs.com/package/nl-cron)
[![downloads](https://img.shields.io/npm/dm/nl-cron.svg)](https://www.npmjs.com/package/nl-cron)
[![bundle](https://img.shields.io/bundlejs/size/nl-cron)](https://bundlejs.com/?q=nl-cron)

> Parse natural-language schedule phrases into 5-field cron expressions. Zero runtime dependencies.

```ts
import { parse } from "nl-cron";

parse("every morning at 9");        // { cron: "0 9 * * *" }
parse("every monday at 3pm");       // { cron: "0 15 * * 1" }
parse("every 5 minutes");           // { cron: "*/5 * * * *" }
parse("the 1st of january");        // { cron: "0 0 1 1 *" }
parse("complete gibberish");        // null
```

## Install

```sh
npm install nl-cron
```

Works with Node 20+, browsers, Bun, Deno. ESM + CJS.

## Why

You're building a feature where a user types **"every monday at 9am"** and you need a cron expression. Most schedule libraries go the other direction (cron → human description). Going human → cron is rarely covered, and when it is, the parser is either too permissive (accepts garbage) or buried inside a 50KB date library.

`nl-cron` is **deliberately predictable**:

- Returns `null` for anything it can't unambiguously parse — so you can fall back to letting the user paste raw cron without false success.
- Never throws — safe to call on any string.
- Zero dependencies, ~250 lines.

## Recipes

### Two-step form: NL input with cron fallback

```ts
import { parse } from "nl-cron";

function userInputToCron(input: string): string | null {
  const r = parse(input);
  if (r) return r.cron;

  // Fall back: treat input as raw cron (validate with cron-describe if needed)
  if (/^[\d*/\-,a-z\s]+$/i.test(input)) return input.trim();
  return null;
}
```

### Reminder app

```ts
import { parse } from "nl-cron";

const reminders = [
  "every weekday at 9am",
  "every friday at 5pm",
  "the 1st of every month",  // ← not supported, returns null
];

for (const r of reminders) {
  const parsed = parse(r);
  if (parsed) scheduleJob(parsed.cron, () => notify(r));
  else        console.warn(`could not parse: ${r}`);
}
```

### Multiple days of week

```ts
parse("monday, wednesday and friday at 10:30");
// { cron: "30 10 * * 1,3,5" }

parse("every weekday at 9am");
// { cron: "0 9 * * 1-5" }

parse("every weekend at 10");
// { cron: "0 10 * * 0,6" }
```

### Combining with cron-describe for round-trip

```ts
import { parse } from "nl-cron";
import { describe } from "cron-describe";

const r = parse(userInput);
if (r) {
  const d = describe(r.cron);
  if (d.valid) confirmWithUser(`I'll schedule "${userInput}" — that means ${d.description}.`);
}
```

## API

### `parse(input: string, opts?: ParseOptions): { cron: string } | null`

Returns a `{ cron }` object for input it can interpret, or `null` for anything it cannot. **Never throws.**

The returned cron string is the standard 5-field form: `minute hour day-of-month month day-of-week`.

#### Supported forms (case-insensitive)

| Form | Example | Output |
|---|---|---|
| Aliases | `hourly`, `daily`, `weekly`, `monthly`, `yearly`, `midnight`, `noon`, `annually` | `0 * * * *`, ... |
| Every-N | `every 5 minutes`, `every 2 hours`, `every 3 days` | `*/5 * * * *`, ... |
| Every-unit | `every minute`, `every hour`, `every week`, `every month`, `every year` | `* * * * *`, ... |
| Named time of day | `every morning` (9am), `every afternoon` (3pm), `every evening` (6pm), `every night` (10pm) | `0 9 * * *`, ... |
| Time-only | `at 9am`, `at 14:00`, `at 9:30pm`, `at noon`, `at midnight` | `0 9 * * *`, ... |
| Day-of-week | `every monday at 3pm`, `mon, wed and fri at 10:30` | `0 15 * * 1`, ... |
| Weekday/weekend | `every weekday at 9am`, `every weekend at 10` | `0 9 * * 1-5`, ... |
| Calendar date | `the 1st of january`, `the 15th of mar at noon`, `the 1st of jan, jun and dec at 9am` | `0 0 1 1 *`, ... |

Day names accepted: full (`monday`, `tuesday`, …) and short (`mon`, `tue`, `tues`, `wed`, `thu`, `thurs`, `fri`, `sat`, `sun`).
Month names accepted: full and short (`jan`, `feb`, …, `dec`).

#### `ParseOptions`

| Field | Type | Default | Meaning |
|---|---|---|---|
| `assume24h` | `boolean` | `false` | If true, bare `at 9` is interpreted as 09:00 (24h). If false, ambiguous bare integers are kept as-is. |

## Caveats

- **No DST handling.** This is a cron-string generator. Whatever runs the cron handles DST (typically by skipping or duplicating the hour twice a year).
- **No "the Nth weekday of the month".** E.g. `"the second tuesday of every month"` is not supported because plain 5-field cron can't express it. Use [cron-next](https://github.com/p-vbordei/cron-next) directly or a 6-field Quartz-style cron library if you need this.
- **First-of-each-month abbreviation isn't recognized.** Write `"the 1st of every month"` and you'll get `null`. Use `"the 1st of january, february, march, …"` or fall back to raw cron `0 0 1 * *`.
- **English-only.** No i18n; phrases like "all luni la 9" won't parse.

## License

Apache-2.0 © Vlad Bordei
