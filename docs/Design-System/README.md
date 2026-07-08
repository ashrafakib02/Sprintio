# Sprintio Design System

> Version: 1.0 | Date: 2026-07-08
> AI-enhanced collaborative work management platform

---

## Files

| File | Topic | Sections |
|------|-------|----------|
| [01-SPACING.md](./01-SPACING.md) | Spacing system | 4px grid, 24 tokens, semantic tokens, element map, responsive |
| [02-TOKENS.md](./02-TOKENS.md) | Design tokens | Colors, typography, shadows, borders, motion, CSS variables |
| [03-TAILWIND-CONFIG.md](./03-TAILWIND-CONFIG.md) | Tailwind config | Vite setup, @theme, dark mode, responsive, utilities |
| [04-21ST-DEV-STRATEGY.md](./04-21ST-DEV-STRATEGY.md) | Component library | 21st.dev integration, inventory, brand customization |
| [05-BUTTONS.md](./05-BUTTONS.md) | Button | 7 variants, 7 sizes, CVA defs, accessibility |
| [06-CARDS.md](./06-CARDS.md) | Card | 6 variants, composable primitives, Sprintio task cards |
| [07-INPUTS.md](./07-INPUTS.md) | Input components | Text, textarea, select, checkbox, form fields, validation |
| [08-MODALS.md](./08-MODALS.md) | Modal / Dialog | 5 dialog variants, command palette, confirmations |

## Source Documents

| File | Description |
|------|-------------|
| [DESIGN-SYSTEM-CONSOLIDATED.md](./DESIGN-SYSTEM-CONSOLIDATED.md) | Master consolidated reference (~1200 lines) |
| [../uxDocs/05-COLOR-SYSTEM.md](../uxDocs/05-COLOR-SYSTEM.md) | Sprintio color palette |
| [../uxDocs/06-TYPOGRAPHY.md](../uxDocs/06-TYPOGRAPHY.md) | Sprintio typography system |

## Architecture

```
Primitive → Semantic → Component

Raw values   Purpose aliases   Per-component overrides
──────────   ──────────────   ────────────────────────
#6366F1  →   --primary     →   --button-bg
gray-50  →   --background  →   --card-bg
0.5rem   →   --radius      →   --dialog-radius
```

## Quick Start

1. Read `02-TOKENS.md` for the full CSS variables file
2. Paste into `src/styles/globals.css`
3. Set up `03-TAILWIND-CONFIG.md` for theme mapping
4. Install components via `04-21ST-DEV-STRATEGY.md`
5. Reference `05-08` for component-specific specs
