# Design — Mobile-FE Optimization

## 1. Responsive Shell

### 1.1 Breakpoints (Vuetify 4 defaults, locked for this project)

| Alias | Range | Width |
|-------|-------|-------|
| `xs` | phones | 0–599 |
| `sm` | large phones / small tablets | 600–959 |
| `md` | tablets / small laptop | 960–1279 |
| `lg` | desktops | 1280–1919 |
| `xl` | large desktops | 1920+ |

We use Vuetify's `useDisplay()` composable (no extra dependency).

### 1.2 New composable: `useResponsive()`

`frontend/src/composables/use-responsive.ts`

```ts
// returns reactive booleans; thin wrapper over useDisplay() with project semantics.
export function useResponsive() {
  const display = useDisplay();
  return {
    isPhone: computed(() => display.xs.value),
    isTablet: computed(() => display.smAndDown.value && !display.xs.value),
    isDesktop: computed(() => display.mdAndUp.value),
    // ...
  };
}
```

### 1.3 New components

| Component | Path | Purpose |
|-----------|------|---------|
| `BottomNav.vue` | `frontend/src/components/layout/BottomNav.vue` | 5-item bottom navigation for phones |
| `MobileSearchDialog.vue` | `frontend/src/components/layout/MobileSearchDialog.vue` | Full-screen search invoked from app bar icon |
| `ResponsiveDataTable.vue` | `frontend/src/components/common/ResponsiveDataTable.vue` | Table → stacked cards |
| `ResponsiveDialog.vue` | `frontend/src/components/common/ResponsiveDialog.vue` | Fullscreen-on-phone dialog |
| `FilterSheet.vue` | `frontend/src/components/common/FilterSheet.vue` | Bottom sheet for collapsed filter bars |

### 1.4 DefaultLayout rewrite

```
┌─────────────────────────────────────────────────────────┐
│ App Bar (height 56 on xs, 64 on md+)                    │
│ [Hamburger] [Orb + ZaloCRM]    [Search] [Bell] [Theme] │
│                                  ▲ hidden on xs          │
├──────────┬──────────────────────────────────────────────┤
│ Drawer   │                                              │
│ (md+)    │              <router-view />                 │
│          │                                              │
│          │                                              │
│          │                                              │
│          │                                              │
│          │                                              │
│          │                                              │
│          │  ┌────────────────────────────────────────┐  │
│          │  │ BottomNav (xs only, safe-area aware)  │  │
│          │  └────────────────────────────────────────┘  │
└──────────┴──────────────────────────────────────────────┘
```

- Drawer: `permanent` only at `md+`. At `sm` it becomes `temporary` toggled by hamburger. At `xs` it is not rendered; bottom nav takes its place.
- Bottom nav: `v-bottom-navigation` from Vuetify, `color="surface"`, `elevation="3"`, with safe-area padding.

### 1.5 ChatView flow on phones

```
URL                    Stack
/chat                  [ConversationList]
/chat/:id              [MessageThread]       (back → /chat)
/chat/:id/contact      [ChatContactPanel]    (back → /chat/:id)
```

Implemented with a stack-based sub-router or a local `ref<StackItem[]>` mirrored to the URL via `router.replace`. Choice in implementation phase.

### 1.6 Touch target policy

All `v-btn` instances in new code use `size="default"` (≈40px) wrapped by a 44px container via utility class `.touch-target` (`min-width: 44px; min-height: 44px; display: inline-flex; align-items: center; justify-content: center;`). Existing buttons get a one-time class pass.

## 2. Risk & Trade-offs

| Risk | Mitigation |
|------|-----------|
| Vuetify 4 `v-bottom-navigation` deprecation history | Use `v-bottom-navigation` from Vuetify 4; if removed, fallback to a custom `<nav>` + flex. Check Vuetify 4 docs during implementation. |
| Chart.js legend overflow | Use `options.plugins.legend.position = isPhone ? 'bottom' : 'right'`. |
| URL-driven chat stack breaks browser back semantics | Use `router.replace` for forward push, `router.back` for back button. |
| Touch target wrapper conflicts with Vuetify ripple | Wrapper sits outside the button; ripple still fires. |

## 3. File impact summary

**New files (≈10):**
- `frontend/src/composables/use-responsive.ts`
- `frontend/src/components/layout/BottomNav.vue`
- `frontend/src/components/layout/MobileSearchDialog.vue`
- `frontend/src/components/common/ResponsiveDataTable.vue`
- `frontend/src/components/common/ResponsiveDialog.vue`
- `frontend/src/components/common/FilterSheet.vue`
- `frontend/src/composables/__tests__/use-responsive.spec.ts`
- `frontend/tests/responsive/*.spec.ts` (one per view)
- `frontend/src/styles/_touch-target.scss`

**Modified files (≈16):**
- `frontend/src/layouts/DefaultLayout.vue`
- `frontend/src/views/{Dashboard,Chat,Orders,Contacts,ZaloAccounts,Appointments,Reports,Settings,ApiSettings,Setup,NotFound}View.vue` (11)
- `frontend/src/components/dashboard/{KpiCards,MessageVolumeChart,PipelineChart,SourceChart,AppointmentChart}.vue` (5)
- `frontend/src/components/contacts/ContactDetailDialog.vue`
- `frontend/src/components/settings/ZaloAccessDialog.vue`
- `frontend/src/locales/{vi,en}.ts` (i18n additions)
- `frontend/src/plugins/vuetify.ts` (theme defaults if needed for surface tokens)
- `frontend/vite.config.ts` (add test config if absent)
- `frontend/package.json` (dev dep: vitest, @vue/test-utils, jsdom)

**Not touched:**
- `frontend/src/views/LoginView.vue` (already single-column, mobile-friendly)
- `frontend/src/layouts/AuthLayout.vue`
- Backend code, Pinia store logic beyond layout state.

## 4. Sequence — Bottom Nav Tap → Route

```
User taps BottomNav item
  → BottomNav emits navigate(to)
  → DefaultLayout's <router-view> updates via vue-router (default behavior)
  → active class driven by route.path match
```

## 5. Sequence — Phone → Open Filter Sheet

```
User taps filter icon in OrdersView
  → local ref filterSheetOpen = true
  → <FilterSheet v-model="filterSheetOpen"> renders bottom-anchored sheet
  → User edits filters, taps "Áp dụng"
  → FilterSheet emits apply(filters)
  → OrdersView applies filters; sheet closes.
```

## 6. Test strategy

- **Unit**: `use-responsive` breakpoints.
- **Component**: `ResponsiveDataTable` renders cards at xs and table at md; `ResponsiveDialog` fullscreen at xs.
- **Snapshot/responsive**: For each view, render at 360×640 and 1280×800 and assert layout landmarks (bottom nav present, drawer present, no horizontal overflow).
- **Manual QA**: Run `npm run dev`, open DevTools device emulator, walk through every view.