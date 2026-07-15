# Tasks — Mobile-FE Optimization

Numbered atomic tasks. Each lists exact file paths and a test strategy.

## 1. Foundation

### 1.1 Add Vitest + responsive test infra
- **Modify**: `frontend/package.json`, `frontend/vite.config.ts`, add `frontend/vitest.setup.ts`
- **Test**: `npm run test:unit -- --run` exits 0 with empty suite.

### 1.2 Responsive composable
- **Create**: `frontend/src/composables/use-responsive.ts`
- **Test**: `frontend/src/composables/__tests__/use-responsive.spec.ts` — breakpoint matrix.

### 1.3 Touch-target utility
- **Create**: `frontend/src/styles/_touch-target.scss`, import in `main.ts`/vite entry.
- **Test**: snapshot at 360px verifies ≥44px.

### 1.4 i18n string scaffolding
- **Modify**: `frontend/src/locales/vi.ts`, `frontend/src/locales/en.ts`
- **Add keys**: `nav.dashboard, nav.messages, nav.contacts, nav.appointments, nav.orders, common.search, common.filters, common.apply, common.back, common.close`.

## 2. Shared Components

### 2.1 BottomNav
- **Create**: `frontend/src/components/layout/BottomNav.vue`
- **Test**: renders 5 items, highlights active route, hidden at `md+`.

### 2.2 MobileSearchDialog
- **Create**: `frontend/src/components/layout/MobileSearchDialog.vue`
- **Test**: fullscreen at xs, modal at md.

### 2.3 ResponsiveDataTable
- **Create**: `frontend/src/components/common/ResponsiveDataTable.vue`
- **Test**: cards at xs, table at md, column priority respected.

### 2.4 ResponsiveDialog
- **Create**: `frontend/src/components/common/ResponsiveDialog.vue`
- **Test**: fullscreen at xs, sized at md.

### 2.5 FilterSheet
- **Create**: `frontend/src/components/common/FilterSheet.vue`
- **Test**: opens from bottom, emits apply/close.

## 3. Layout Shell

### 3.1 DefaultLayout — responsive shell
- **Modify**: `frontend/src/layouts/DefaultLayout.vue`
- **Test**: drawer present at md+, hidden at xs; bottom-nav present at xs only; app-bar collapses elements at xs.

## 4. Per-View Optimization

### 4.1 DashboardView
- **Modify**: `frontend/src/views/DashboardView.vue`
- **Modify**: `frontend/src/components/dashboard/KpiCards.vue`, `MessageVolumeChart.vue`, `PipelineChart.vue`, `SourceChart.vue`, `AppointmentChart.vue`
- **Test**: 360px snapshot shows 2-col KPI grid and stacked charts; 1280px shows 4-col + 2-up charts.

### 4.2 ChatView
- **Modify**: `frontend/src/views/ChatView.vue`, `frontend/src/components/chat/ConversationList.vue`, `MessageThread.vue`, `ChatContactPanel.vue`, `ChatOrders.vue`, `ChatAppointments.vue`
- **Test**: at 360px, master list → thread → panel navigation; URL reflects step.

### 4.3 OrdersView
- **Modify**: `frontend/src/views/OrdersView.vue`, `frontend/src/components/orders/OrderStaffTable.vue`
- **Test**: cards at xs, table at md; filter sheet works.

### 4.4 ContactsView
- **Modify**: `frontend/src/views/ContactsView.vue`, `frontend/src/components/contacts/ContactFilters.vue`, `ContactDetailDialog.vue`
- **Test**: filter sheet at xs, dialog fullscreen at xs.

### 4.5 ZaloAccountsView
- **Modify**: `frontend/src/views/ZaloAccountsView.vue`, `frontend/src/components/settings/ZaloAccessDialog.vue`
- **Test**: cards at xs, table at md; access dialog fullscreen at xs.

### 4.6 AppointmentsView
- **Modify**: `frontend/src/views/AppointmentsView.vue`
- **Test**: list view at xs, calendar at md+.

### 4.7 ReportsView
- **Modify**: `frontend/src/views/ReportsView.vue`
- **Test**: charts stack on xs; date-range sheet works.

### 4.8 SettingsView / ApiSettingsView / SetupView
- **Modify**: each view
- **Test**: tabs horizontally scrollable on xs without clipping.

### 4.9 NotFoundView
- **Modify**: `frontend/src/views/NotFoundView.vue`
- **Test**: typography scales; CTA button ≥44px.

## 5. Quality & Verification

### 5.1 A11y pass
- **Modify**: audit all touched files for focus rings, ARIA labels, role attributes.
- **Test**: axe-core automated check in unit tests for each view.

### 5.2 Reduced-motion check
- **Modify**: any component using `<v-fade-transition>` etc. respects `usePreferredReducedMotion`.

### 5.3 Manual QA checklist
- Document in `frontend/MOBILE-QA.md` (not a code task; recorded in progress.md).

### 5.4 Lighthouse mobile snapshot
- Run `npm run build && npm run preview` and capture Lighthouse mobile report into `progress.md`.

### 5.5 Final responsive snapshot suite
- **Create**: one spec per view under `frontend/tests/responsive/`.
- **Test**: `npm run test:unit -- --run` exits 0.

## 6. Archive

### 6.1 Archive change
- Run `/opsx:archive mobile-fe-optimization` once G4 passes.