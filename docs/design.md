# Design system

## Source of truth (in order)

1. `src/theme/tokens.ts` — colors, spacing, radius, motion.
2. `src/theme/typography.ts` — named type styles (incl. `arabicVerse`, `eyebrowLabel`).
3. `src/theme/ThemeProvider.tsx` — `useTheme()`, Day/Lamp themes.

Never hardcode a hex/px/fontFamily that already exists as a token — extend the token file if a
value is genuinely missing, don't ad-hoc it in a screen. For any question about color/spacing/
type/motion: query graphify or read `tokens.ts` — don't guess and don't duplicate values into
docs.

## Locked constants

Wrong values here are a visible regression:

- **Brand (fixed, never altered)**: Primary Dark `#1C1B1E`, Flame Amber `#F5A623` (the one
  recurring accent), Parchment `#F5EDE1`.
- **Reading body floor**: Lora, never below 17px, never tighten line-height below 1.85.

## Identity

1890s / candlelit reading experience. Ambient sounds are nature/ambient only, no music — fits
the identity and avoids licensing (see ROADMAP.md).

Behavioral rules (match design exactly, reuse components, token discipline) live in CLAUDE.md —
not repeated here.
