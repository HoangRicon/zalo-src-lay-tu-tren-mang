# Design System Master — ZaloCRM Mobile-FE

> Project: ZaloCRM
> Stack: Vue 3 + Vuetify 4 + Vite 8 + TypeScript
> Surface: Web (responsive; mobile-first for ≤600px)
> Style keyword: glassmorphism dark-mode (existing brand) + mobile-first responsive shell
> Persisted: 2026-07-15 — for change `mobile-fe-optimization`

---

## 1. Style & Pattern

**Pattern**: Responsive dashboard / CRM admin panel.
**Style**: Glassmorphism dark (existing) extended with mobile-first shell.
**Density**: Information-dense (KPI cards, tables, charts) but with comfortable touch targets on phones.
**Mode**: Light + Dark. Tokens must work in both; never invert 1:1 — use desaturated lighter variants in dark.

Anti-patterns:
- No emoji as icons. Use Material Design Icons via `@mdi/font` (already installed) or Vuetify icons.
- No raw hex in components. Use Vuetify theme tokens (`primary`, `surface`, `on-surface`, etc.).
- No fixed px container widths on phones.
- No horizontal scroll at ≥360px viewport.

---

## 2. Color Tokens

Reuse existing Vuetify theme tokens; no new tokens added.

| Token | Light | Dark | Use |
|---|---|---|---|
| `primary` | #0077B6 | #00F2FF | Brand cyan, primary CTA |
| `surface` | #FFFFFF | #0E1116 | Card / nav background |
| `on-surface` | rgba(0,0,0,0.87) | rgba(255,255,255,0.87) | Body text |
| `on-surface-variant` | rgba(0,0,0,0.60) | rgba(255,255,255,0.60) | Secondary text |
| `outline` | rgba(0,0,0,0.12) | rgba(255,255,255,0.12) | Dividers |
| `success` | #2E7D32 | #66BB6A | Status positive |
| `warning` | #ED6C02 | #FFA726 | Status warn |
| `error` | #C62828 | #EF5350 | Status negative, destructive |
| `info` | #0288D1 | #29B6F6 | Informational chips |

Contrast: primary text ≥4.5:1 against surface in both modes (verified by Vuetify defaults).

---

## 3. Typography

| Role | Size | Weight | Use |
|---|---|---|---|
| Display | 32px | 700 | NotFoundView hero only |
| Headline | 24px | 700 | View titles on `xs` |
| Title | 20px | 600 | Section headers, card titles |
| Body | 16px | 400 | Default body (≥16 to prevent iOS auto-zoom) |
| Caption | 12px | 500 | Secondary labels, table headers |

Font family: existing project font stack (system default).

Hierarchy rules:
- Bold (600–700) for headings; Medium (500) for labels; Regular (400) for body.
- Tabular figures for prices, counters: `font-variant-numeric: tabular-nums`.
- Never truncate when you can wrap. If truncate is necessary, ellipsis + tooltip.

---

## 4. Spacing & Layout

4/8dp rhythm. Tokens:

| Token | px | Use |
|---|---|---|
| `space-1` | 4 | Tight inline |
| `space-2` | 8 | Stack gap |
| `space-3` | 12 | Component padding |
| `space-4` | 16 | Section padding |
| `space-6` | 24 | Major section gap |
| `space-8` | 32 | View spacing on tablet+ |

Page padding on `xs`: 16px horizontal (`px-4`). On `md+`: 24px (`px-6`).

Bottom-nav height: 64px + `env(safe-area-inset-bottom)`.
App-bar height: 56px on `xs`, 64px on `md+`.

---

## 5. Breakpoints (Vuetify 4 defaults; locked)

| Alias | Range | Width |
|---|---|---|
| `xs` | 0–599 | phones |
| `sm` | 600–959 | large phones / small tablets |
| `md` | 960–1279 | tablets |
| `lg` | 1280–1919 | desktops |
| `xl` | 1920+ | large desktops |

Use `useDisplay()` (Vuetify) wrapped by project `useResponsive()` composable.

---

## 6. Navigation Pattern (priority: HIGH)

| Breakpoint | Primary nav | Secondary nav |
|---|---|---|
| `xs` | BottomNav (5 items) | Drawer hidden; profile/menu via app-bar action |
| `sm` | Drawer toggle (hamburger) + BottomNav | Drawer as temporary overlay |
| `md+` | Drawer (rail/expanded, permanent) | — |

BottomNav rules:
- Max 5 items (Material Design).
- Each item: icon + short label.
- Active item: primary color fill + bold label.
- Label below icon (icon-and-text pattern, never icon-only).
- Items: Dashboard, Tin nhắn, Khách hàng, Lịch hẹn, Đơn hàng.

Drawer (md+):
- Width: expanded 256px, rail 64px.
- Items: same destinations + Tài khoản Zalo, Báo cáo, Nhân viên, API & Webhook.
- Active item: tonal background + primary text color.

---

## 7. Touch & Interaction

- Min hit area: **44×44 px** on `xs`/`sm`. Use `.touch-target` utility class.
- Press feedback: Vuetify ripple (default) at all sizes; pressed scale 0.98 max.
- Spacing between touch targets: ≥8px.
- Use `touch-action: manipulation` on interactive wrappers to remove 300ms tap delay.
- Hover-dependent affordances must also have a tap alternative.

---

## 8. Dialogs & Sheets

| Component | xs/sm | md+ |
|---|---|---|
| `<ResponsiveDialog>` | fullscreen, top app-bar with close, actions pinned to bottom | sized (`md`–`xl`), centered, scrim 60% |
| `<FilterSheet>` | bottom sheet, drag handle visible | side dialog (480px) |
| `<v-snackbar>` | bottom-aligned above BottomNav (offset 80px) | bottom-aligned |

Dialog content scroll is contained; the page behind never scrolls.

---

## 9. Tables

Default to `<ResponsiveDataTable>`:
- `md+`: standard `v-data-table` with sticky header.
- `xs/sm`: stacked card list. Each card: title (primary col), subtitle (secondary col), trailing actions menu.
- Column priority: `'always'` | `'md'` | `'lg'`.
- No horizontal scroll at any breakpoint.
- Pagination footer remains in both modes.
- Empty state: helpful message + icon (e.g. "Chưa có đơn hàng").

---

## 10. Forms

- Visible label per field (no placeholder-only labels).
- Helper text below complex inputs.
- Inline validation on blur (not keystroke).
- Input height ≥44px on touch breakpoints.
- Use Vuetify `variant="outlined"` for clarity.
- Destructive actions require confirmation dialog with explicit primary action label.

---

## 11. Charts

- Chart.js options adapted via `useResponsive()`:
  - Legend position: `'bottom'` on `xs`, `'right'` on `md+`.
  - Tick density: reduce ticks on `xs`.
  - Touch targets on data points ≥44px (use Chart.js `hitRadius`).
  - Empty state: "Chưa có dữ liệu" + icon.
  - Loading: skeleton placeholder, not empty axis frame.
- Provide `aria-label` summarizing the chart's key insight for screen readers.

---

## 12. Animation & Motion

- Micro-interactions: 150–250ms, ease-out (entering) / ease-in (exiting).
- Use transform/opacity only (no width/height animations).
- Respect `prefers-reduced-motion`: drop durations to ≤50ms or skip.
- Bottom-nav active indicator animates with subtle scale 1 → 1.1.

---

## 13. Accessibility

- Contrast: ≥4.5:1 body text, ≥3:1 large text & UI glyphs in both modes.
- Focus rings: visible 2px outline using `primary` color, always.
- Icon-only buttons: `aria-label` required.
- BottomNav: `role="navigation"`, `aria-label="Điều hướng chính"`.
- Dialogs: `aria-modal="true"`, focus trap, focus returns to opener on close.
- Headings: sequential h1 → h6, no skipping.
- Skip-link "Bỏ qua đến nội dung chính" at top of `<body>`.

---

## 14. i18n Keys (this change)

```ts
nav.dashboard, nav.messages, nav.contacts, nav.appointments, nav.orders,
nav.zaloAccounts, nav.reports, nav.staff, nav.apiWebhook,
common.search, common.filters, common.apply, common.reset, common.back,
common.close, common.cancel, common.confirm, common.more, common.skip_to_content,
a11y.primary_nav, a11y.open_menu, a11y.toggle_theme,
mobile.empty_state.title, mobile.search.placeholder,
chat.back_to_list, chat.contact_panel_title,
filter.title
```

---

## 15. Page-specific Overrides

| Page | Override |
|---|---|
| DashboardView | KPI grid 2-col xs / 4-col md+. Charts stack xs, 2-col md+. |
| ChatView | URL-driven stack: `/chat` → `/chat/:id` → `/chat/:id/contact`. |
| OrdersView / ContactsView / ZaloAccountsView | `<ResponsiveDataTable>` + filter sheet on xs. |
| AppointmentsView | Vertical day-list on xs, calendar grid on md+. |
| ReportsView | Single-col xs, 2-col sm, 3-col lg+. Date range picker → sheet on xs. |
| SettingsView / ApiSettingsView / SetupView | Horizontally scrollable tab bar on xs (no clipping). |
| NotFoundView | Centered, scale typography, CTA ≥44px. |

---

## 16. Pre-delivery Checklist (G3)

- [ ] All touched views render correctly at 360×640 and 1280×800.
- [ ] Bottom-nav visible only on `xs`.
- [ ] Drawer visible only on `md+`.
- [ ] All touch targets ≥44px on `xs`.
- [ ] All icon-only buttons have `aria-label`.
- [ ] No horizontal scroll on any view at 360px.
- [ ] Reduced-motion respected.
- [ ] Light + dark mode both verified.
- [ ] Skip-link present at top of body.
- [ ] All new i18n keys present in `vi` and `en`.