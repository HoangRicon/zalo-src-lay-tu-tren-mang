# Task Plan — mobile-fe-optimization

> Source of truth: `openspec/changes/mobile-fe-optimization/{proposal,specs/mobile-fe-optimization,design,tasks}.md`
> Status legend: `[ ]` pending · `[~]` in progress · `[x]` done · `[!]` blocked

## Phase 1 — Foundation (deps, composables, utilities)

- [ ] 1.1 Add Vitest + Vue Test Utils + jsdom + @vueuse/core to `frontend/package.json`; create `frontend/vitest.setup.ts`; wire `test:unit` script. — verify: `npm run test:unit -- --run` exits 0 with empty suite.
- [ ] 1.2 Create `frontend/src/composables/use-responsive.ts` (wraps `useDisplay` + project semantics). — verify: `frontend/src/composables/__tests__/use-responsive.spec.ts` covers xs/sm/md/lg/xl via `vi.stubGlobal('window', { innerWidth: ... })` or jsdom viewport.
- [ ] 1.3 Create `frontend/src/styles/_touch-target.scss` with `.touch-target` utility; import in Vite entry. — verify: visual check + unit asserting min 44×44.
- [ ] 1.4 Add i18n keys to `frontend/src/locales/vi.ts` and `en.ts`. — verify: snapshot of locale modules contains new keys.

## Phase 2 — Shared components

- [ ] 2.1 `frontend/src/components/layout/BottomNav.vue` (5 items, active-route highlight, hidden ≥md). — verify: spec asserts 5 items + hidden at md.
- [ ] 2.2 `frontend/src/components/layout/MobileSearchDialog.vue` (fullscreen xs, modal md). — verify: spec asserts both modes.
- [ ] 2.3 `frontend/src/components/common/ResponsiveDataTable.vue`. — verify: spec asserts cards at xs, table at md, column priority respected.
- [ ] 2.4 `frontend/src/components/common/ResponsiveDialog.vue`. — verify: spec asserts fullscreen xs, sized md.
- [ ] 2.5 `frontend/src/components/common/FilterSheet.vue`. — verify: spec asserts apply/close emit.

## Phase 3 — Layout shell

- [ ] 3.1 Rewrite `frontend/src/layouts/DefaultLayout.vue`: drawer permanent only ≥md; app bar collapses elements <md; bottom nav <md; safe-area padding; reduced-motion respect. — verify: 360px and 1280px snapshot specs.

## Phase 4 — Per-view optimization

- [ ] 4.1 **DashboardView** + 5 dashboard components. — verify: 360/1280 snapshots; chart legend position switches; 2-col KPI at xs.
- [ ] 4.2 **ChatView** + 6 chat components — URL-driven stack (`/chat`, `/chat/:id`, `/chat/:id/contact`). — verify: route-driven back navigation works in tests.
- [ ] 4.3 **OrdersView** + `OrderStaffTable`. — verify: cards at xs; filter sheet works.
- [ ] 4.4 **ContactsView** + `ContactFilters` + `ContactDetailDialog`. — verify: filter sheet xs; dialog fullscreen xs.
- [ ] 4.5 **ZaloAccountsView** + `ZaloAccessDialog`. — verify: cards xs; dialog fullscreen xs.
- [ ] 4.6 **AppointmentsView**. — verify: list at xs, calendar at md+.
- [ ] 4.7 **ReportsView**. — verify: charts stack xs; date-range sheet xs.
- [ ] 4.8 **SettingsView / ApiSettingsView / SetupView**. — verify: tabs scrollable horizontally on xs.
- [ ] 4.9 **NotFoundView**. — verify: typography scales; CTA ≥44px.

## Phase 5 — Quality

- [ ] 5.1 A11y audit pass — focus rings, ARIA, roles across touched files. — verify: axe-core automated check.
- [ ] 5.2 Reduced-motion: transitions respect `usePreferredReducedMotion`.
- [ ] 5.3 Manual QA checklist recorded in `progress.md`.
- [ ] 5.4 Lighthouse mobile run on `npm run preview` → archived in `progress.md`.
- [ ] 5.5 Final responsive snapshot suite green: `npm run test:unit -- --run` exits 0.

## Phase 6 — Archive

- [ ] 6.1 `/opsx:archive mobile-fe-optimization` once G4 passes.

## File structure map

```
frontend/
├── package.json                       (M)
├── vite.config.ts                     (M)
├── vitest.setup.ts                    (N)
├── src/
│   ├── main.ts                        (M, import touch-target)
│   ├── styles/_touch-target.scss      (N)
│   ├── locales/{vi,en}.ts             (M)
│   ├── composables/
│   │   ├── use-responsive.ts          (N)
│   │   └── __tests__/use-responsive.spec.ts (N)
│   ├── components/
│   │   ├── layout/
│   │   │   ├── BottomNav.vue          (N)
│   │   │   └── MobileSearchDialog.vue (N)
│   │   ├── common/
│   │   │   ├── ResponsiveDataTable.vue(N)
│   │   │   ├── ResponsiveDialog.vue   (N)
│   │   │   └── FilterSheet.vue        (N)
│   │   ├── dashboard/{Kpi,Message,Pipeline,Source,Appointment}Chart(s).vue (M)
│   │   ├── contacts/ContactFilters.vue (M), ContactDetailDialog.vue (M)
│   │   ├── chat/{ConversationList,MessageThread,ChatContactPanel,ChatOrders,ChatAppointments}.vue (M)
│   │   ├── orders/OrderStaffTable.vue (M)
│   │   └── settings/ZaloAccessDialog.vue (M)
│   ├── views/{Dashboard,Chat,Orders,Contacts,ZaloAccounts,Appointments,Reports,Settings,ApiSettings,Setup,NotFound}View.vue (M ×11)
│   └── layouts/DefaultLayout.vue      (M)
└── tests/responsive/*.spec.ts         (N ×12)
```
(N) = New, (M) = Modified.

## Risk register

| Risk | Mitigation | Owner |
|---|---|---|
| Vuetify 4 removed `v-bottom-navigation` | Check during 2.1; fallback to custom nav | 2.1 |
| Snapshot tests fragile to whitespace | Use semantic queries, not class names | 5.5 |
| Chart.js legend overflow on xs | Set `position: 'bottom'` in options | 4.1 |
| Chat URL routing breaks if route doesn't exist yet | Add routes before Chat rewrite | 4.2 |