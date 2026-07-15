id: mobile-fe-optimization
title: Tối ưu tất cả trang FE cho điện thoại
status: proposed
created: 2026-07-15
priority: high
complexity: thorough
type: feature
# Mobile-first responsive optimization across the entire frontend.
# Touches layouts, every view, reusable composables, and shared CSS.

## Why

The current frontend was designed primarily for desktop. On phones (≤600px):

- `DefaultLayout.vue` uses a `permanent` navigation drawer with no mobile breakpoint — it covers the main content on phones, blocking interaction.
- The top `v-app-bar` packs 6+ elements (orb, title, GlobalSearch, status pill, user name, NotificationBell, theme, logout). On phones these overflow or get truncated; the search is unusable.
- Many views use `cols="12" md="8"` without `sm`/`xs` breakpoints → stacks already work but inner cards/tables/dialogs don't reflow.
- Dashboard charts are 4-up on mobile; legends overlap.
- `ChatView` likely uses a 2-pane master/detail that breaks to ~50/50 with no master hide on mobile.
- Tables in `OrdersView`, `ContactsView`, `ZaloAccountsView` don't switch to card lists on mobile.
- Dialogs (`ContactDetailDialog`, `ZaloAccessDialog`) use widths `md/lg/xl` which exceed viewport on phones.
- Touch targets are not consistently ≥44×44px.
- No swipe-to-go-back or pull-to-refresh.
- Bottom navigation does not exist; users on phones must toggle the drawer to navigate.

This change makes the app pleasant to use on a 360×640 phone while preserving the desktop experience.

## What changes

1. **Layout shell**: Responsive navigation. Bottom navigation bar on phones, drawer on tablet+. App bar collapses to icon-only actions on phones.
2. **Responsive grid utility**: Promote the existing `cols` props to `xs/sm/md/lg/xl` per page with sensible defaults.
3. **Responsive tables**: Reusable `<ResponsiveDataTable>` that becomes a stacked card list on `xs`.
4. **Responsive dialogs**: Reusable `<ResponsiveDialog>` that sizes to viewport on phones.
5. **Mobile-first Dashboard**: KPI cards 2×2 then full-width on `xs`; charts single-column with stacked legends.
6. **Mobile-first Chat**: Master list → conversation → contact panel as a step stack on phones (URL-driven).
7. **Forms & filters**: Filter bars collapse into a slide-out sheet on phones.
8. **A11y**: Touch targets ≥44×44, focus rings visible, prefers-reduced-motion respected.
9. **i18n**: All new strings added in `vi` and `en`.
10. **Tests**: Vitest + @vue/test-utils snapshot tests at 360px and 1280px for every view; layout unit tests for the responsive shell.

## What does NOT change (out of scope)

- No backend/API changes.
- No new features, no removed features.
- No changes to backend payload shapes or Pinia store logic beyond layout-related state (`drawerMobileOpen`, etc.).
- No new dependencies beyond optional `@vueuse/core` for `useBreakpoints`/`usePreferredReducedMotion` (already trivial to add; will check before adding).
- No changes to Chart.js chart types, only their responsive options.
- No rebranding or color palette change.
- No changes to `AuthLayout`/`LoginView` (already mobile-friendly single-column).

## Rollback plan

All changes are additive or stylistic within Vue SFCs and a small set of new shared components/composables.

- Single branch + single PR.
- If metrics regress (Core Web Vitals on mobile, user complaints, broken layouts at any breakpoint), revert the merge commit (`git revert`).
- No data migrations; no destructive operations.
- Feature flags: the new `<ResponsiveDataTable>` and `<ResponsiveDialog>` will replace existing usages, but each existing page keeps its current component file unchanged → reverting reverts the imports.

## Success metrics

| Metric | Baseline | Target |
|--------|----------|--------|
| Mobile Lighthouse Performance | unknown | ≥80 |
| Mobile Lighthouse Accessibility | unknown | ≥90 |
| Mobile-first views passing responsive snapshot at 360px | 0/12 | 12/12 |
| Touch targets ≥44×44 | unknown | 100% of interactive elements |
| No horizontal scrollbar at 360px on any view | unknown | 0 views overflow |