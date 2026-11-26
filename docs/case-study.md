# Case study — Lastro

*[Leia em português](case-study.pt-BR.md)*

**Role:** product, UX and engineering, end to end · **Period:** Oct 2026 – today, 50+ releases · **Users:** a real
family, every day

## The problem

The family's money lived in five places: the bank app, credit-card SMS, a brokerage, a crypto exchange and long chats
with an AI that produced excellent monthly dashboards — as HTML files nobody opened on a phone. The questions that
mattered day to day ("how much can we still spend this month?", "will next month be tight?", "where should this month's
investment go?") needed a laptop and twenty minutes.

## Goals

- Answer "how much can we still spend?" in one glance, on the phone, for both adults.
- Log a card purchase in seconds, ideally straight from the bank SMS.
- Keep the AI as the analyst — without retyping its math and without disagreeing with it.
- Zero running cost, zero servers to maintain, and **no third party able to read the data**.

## Key decisions

| Decision | Why | Trade-off |
|---|---|---|
| **Use the AI's dashboard as the calculation engine** (hidden iframe, call its functions) | One source of truth for the math; new blocks from the AI show up without a release | The app depends on the dashboard's function names → every call is optional and guarded, with the raw dashboard as fallback |
| **GitHub as an encrypted database** | Free, versioned, auditable, already has an API | One commit per sync → batched in a 3-second queue, cash flow + portfolio in a single commit |
| **Client-side encryption + fingerprint-sealed key (WebAuthn PRF)** | Nothing readable on servers or on the device | PRF support varies → three protection modes chosen automatically |
| **Empty push notifications** | The push service never sees content | The phone has to download and decrypt to write the text |
| **Pure functions for every financial action** | Exact undo, easy tests, auditable trail | More code than mutating state in place |
| **No framework, no build** | Fast to load, nothing to upgrade, long-lived | Hand-written components, charts and `.xlsx` writer |
| **MCP connector for the AI (opt-in)** | Removes download/attach friction | The key lives on the server while on → revocable, field allowlist, dry run |

## What shipped

- A "Today" briefing that answers "what is truly free to spend?" — what is left until the card bill closes, after bills and the plan's investments.
- Two-tap logging from the "+" or from the bank SMS (several at once, with duplicate detection and remembered categories).
- Credit card item by item, budgets with 80%/100% alerts, subscriptions review, a real Excel export.
- Portfolio with live estimate, goals, dividends, liquidity ladder, fixed-income switch simulator and an investment plan
  checked against the month's safe surplus.
- Month selector: correct closed months, plan future ones.
- Guided monthly closing with the AI, then an MCP connector so the AI reads and writes directly.

## Product principles that came from real use

1. **Always ask for the scope.** Editing or removing something that repeats asks "this month only / this and next /
   only next". Removing a subscription once silently removed it from the future — never again.
2. **Full control, never locked.** Past, present and future are editable; unusual cases warn instead of blocking.
3. **No new steps.** Features fit into what the family already does (logging, monthly closing) — no extra chats.
4. **Every control that looks like it changes data does change it**; simulations are labeled as such.

## Quality

257 Playwright regression checks, 62 end-to-end checks across two simulated phones with the real Worker, 30+ unit test
files, a screen sweeper that flags `undefined/NaN`, horizontal overflow and empty cards — run against real-shaped data
before each release. A built-in diagnostics screen (no values) turned "it doesn't work" reports into fixable bugs.

## Lessons

- **Let the expert component stay the expert.** Wrapping the AI's dashboard instead of rewriting it avoided a whole
  class of "the app says X, the analysis says Y" bugs.
- **Real data finds what fixtures miss.** Several bugs (an expired token silently stopping sync, category names drifting
  between the app and the AI, a dividend counted twice) only appeared with real months — the test suite now calibrates
  itself from the data it is given.
- **Security can be invisible.** Fingerprint-sealed keys and empty pushes cost the family zero extra taps.
