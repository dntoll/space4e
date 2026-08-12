# AGENTS.md

Write readable code, not compressed. One class per file.

## Language

All UI text is in English. User-facing strings live in `src/game/view/view-strings.ts` — do not hard-code display text in components. Add new strings there and reference them via `ViewStrings`.

Game-balance and numeric constants live in `src/game/game-constants.ts` — reference them via `GameConstants` instead of inline magic numbers.

The model layer (`src/game/model`) stays browser- and view-independent: it may import `GameConstants` but must not import from `view/`.

## Maintenance

Remove dead code when you find it. If a method becomes unreferenced after a change (no callers in `src/` and no test usage), delete it rather than leaving it for "later" — unused helpers rot and mislead future readers. Verify with a search before deleting; keep the method only if it is part of a public API that external code relies on.
