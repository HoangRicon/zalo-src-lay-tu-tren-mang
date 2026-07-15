# Findings — mobile-fe-optimization

Live research log. Append-only during execution.

## Stack & tooling
- Vue 3.5, Vuetify 4, Vue Router 4, Pinia 3, vue-i18n 11, Chart.js 4, Vite 8, TS 5.9.
- No test framework installed yet (verified via `frontend/package.json`).
- No `@vueuse/core` installed — will add as dev dep.

## Initial mobile gap audit (2026-07-15)

| File | Issue |
|---|---|
| `DefaultLayout.vue` | `v-navigation-drawer permanent` on all breakpoints → blocks phone content. No bottom nav. |
| `DefaultLayout.vue` | App bar packs 8 elements: orb, title, GlobalSearch, status pill, user name, NotificationBell, theme, logout. No mobile collapse. |
| `DashboardView.vue` | Uses `cols="12" md="8"` etc. — stacks OK, but inside the cards the chart legends are not repositioned. |
| `KpiCards.vue` (TBD read) | Need to verify grid breakpoints. |
| `ChatView.vue` (TBD read) | 2-pane likely; need to confirm pane widths. |
| `OrdersView.vue`, `ContactsView.vue`, `ZaloAccountsView.vue` (TBD read) | Likely use `v-data-table` directly; not responsive. |
| `ContactDetailDialog.vue`, `ZaloAccessDialog.vue` (TBD read) | Likely sized `md/lg/xl`; not fullscreen on phones. |
| `LoginView.vue`, `AuthLayout.vue` | **Skipped** per out-of-scope — already single-column, mobile-friendly. |

## Open questions / decisions made
- ✅ Mode = OpenSpec (default for existing repo).
- ✅ Complexity = Thorough (multi-module, layout decisions).
- ✅ Bottom-nav: use `v-bottom-navigation` if available in Vuetify 4; fallback to custom `<nav>`.
- ✅ Chat stack: URL-driven.
- ✅ Dependencies: Vitest + @vue/test-utils + jsdom + @vueuse/core.

## Open questions (to verify during impl)
- Vuetify 4 `v-bottom-navigation` availability → check at start of Phase 2.1.
- Vuetify 4 theme `surface` token name → check `plugins/vuetify.ts`.
- Existing chart options in each dashboard component → read each before modifying.

## Conventions adopted
- All new components use `<script setup lang="ts">`.
- All breakpoints via `useDisplay()` / `useResponsive()`; no inline `display.xs.value` reads in templates beyond the composable.
- All tests colocated under `__tests__/` for units, `tests/responsive/` for view snapshots.
- i18n keys: dotted lowercase (`nav.dashboard`, `common.search`).
- Touch target: `.touch-target` utility class, never inline styles.