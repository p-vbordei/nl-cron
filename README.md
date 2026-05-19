# nl-cron

[![ci](https://github.com/p-vbordei/nl-cron/actions/workflows/ci.yml/badge.svg)](https://github.com/p-vbordei/nl-cron/actions/workflows/ci.yml)

Parse natural-language schedule phrases into 5-field cron expressions. Zero runtime dependencies.

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

## API

### `parse(input: string, opts?: ParseOptions): { cron: string } | null`

Returns a `{ cron }` object for input it can interpret, or `null` for anything it cannot. **Never throws.**

The returned cron string is the standard 5-field form: `minute hour day-of-month month day-of-week`.

#### Supported forms (case-insensitive)

| Form | Example | Output |
|---|---|---|
| Aliases | `hourly`, `daily`, `weekly`, `monthly`, `yearly`, `midnight`, `noon` | `0 * * * *`, ... |
| Every-N | `every 5 minutes`, `every 2 hours`, `every 3 days` | `*/5 * * * *`, ... |
| Every-unit | `every minute`, `every hour`, `every week` | `* * * * *`, ... |
| Named time of day | `every morning` (9am), `every afternoon` (3pm), `every evening` (6pm), `every night` (10pm) | `0 9 * * *`, ... |
| Time-only | `at 9am`, `at 14:00`, `at 9:30pm` | `0 9 * * *`, ... |
| Day-of-week | `every monday at 3pm`, `mon, wed and fri at 10:30` | `0 15 * * 1`, ... |
| Weekday/weekend | `every weekday at 9am`, `every weekend at 10` | `0 9 * * 1-5`, ... |
| Calendar date | `the 1st of january`, `the 15th of mar at noon` | `0 0 1 1 *`, ... |

#### `ParseOptions`

| Field | Type | Default | Meaning |
|---|---|---|---|
| `assume24h` | `boolean` | `false` | If true, bare `at 9` is interpreted as 09:00 24h. If false, bare numbers under 13 are kept as-is (treated as morning). |

## Why

Most cron parsers go cron → human. This goes human → cron, which is what you want when accepting schedule input from end users. It's deliberately small and predictable — it returns `null` for anything it can't unambiguously parse, so you can fall back to letting the user supply raw cron.

## License

Apache-2.0 © Vlad Bordei
