# Feature: Responsive Shell — Layout, App Bar, Navigation

## ADDED Requirements

### SHELL-001: Responsive navigation pattern

The system MUST use a bottom navigation bar on phones (`xs` < 600px) and a side drawer on tablet+ (`md` ≥ 960px). Between (`sm` 600–959px), the side drawer remains accessible via a hamburger button.

**Scenario**: User opens app on a 360×640 phone.
**Given** viewport width < 600px (`xs`)
**When** the shell mounts
**Then** a bottom navigation bar with the 5 most-used destinations (Dashboard, Tin nhắn, Khách hàng, Lịch hẹn, Đơn hàng) is visible at the bottom of the viewport
**And** the side drawer is hidden
**And** the active route's icon is highlighted with the primary color.

**Scenario**: User opens app on a 1280×800 tablet.
**Given** viewport width ≥ 960px
**When** the shell mounts
**Then** the side drawer is visible
**And** no bottom navigation bar is shown.

### SHELL-002: App bar collapses on phones

**Scenario**: User on phone opens the app.
**Given** viewport < 600px
**Then** the app bar shows: hamburger (opens bottom nav drawer if drawer-variant mode), brand orb + "ZaloCRM" title, NotificationBell icon, theme toggle icon
**And** the user full name, "ONLINE" status pill, GlobalSearch, and logout icon are hidden (they remain reachable: search via a search icon that opens a full-screen search dialog; logout via a profile/menu icon).

### SHELL-003: Touch targets ≥44×44px

Every interactive element (icon buttons, list items, nav items, chips, FAB) MUST render with a minimum 44×44px hit area on touch breakpoints (`xs`, `sm`). Desktop hover/click targets remain at their natural size.

### SHELL-004: Safe-area inset support

**Scenario**: User on iPhone with notch.
**Given** safe-area-inset-* env vars are present
**Then** the bottom navigation adds bottom padding equal to `env(safe-area-inset-bottom)`
**And** the app bar adds top padding equal to `env(safe-area-inset-top)`.

### SHELL-005: Reduced motion

**Scenario**: User has `prefers-reduced-motion: reduce`.
**Then** layout transitions (drawer slide, dialog fade) complete in ≤50ms or are skipped.

---

# Feature: Responsive Data Tables

## ADDED Requirements

### TABLE-001: Stacked-card mode on phones

The new shared component `<ResponsiveDataTable>` MUST render a normal `v-data-table` at `md` and above, and a stacked card list at `xs`/`sm`. Each row becomes a card with title (primary column), subtitle (secondary column), and trailing actions.

**Scenario**: User opens OrdersView on a 360px phone.
**Then** the orders table renders as a vertical list of cards
**And** each card shows: order code, customer name, total, status chip, and a "..." action menu
**And** pagination/footer still functions.

### TABLE-002: No horizontal scroll

No `v-data-table` in the app MAY produce a horizontal scrollbar at viewport widths ≥ 360px.

### TABLE-003: Column priority

Columns declared with `priority: 'always' | 'md' | 'lg'` MUST render at or above their declared breakpoint and be hidden otherwise.

---

# Feature: Responsive Dialogs

## ADDED Requirements

### DIALOG-001: Full-screen on phones

A new shared `<ResponsiveDialog>` MUST render as `fullscreen` at `xs` and as a sized dialog at `sm` and above.

**Scenario**: User taps a contact row on phone.
**Then** the contact detail dialog opens in fullscreen with a top app bar containing close + title
**And** action buttons are pinned to the bottom safe area.

### DIALOG-002: Scroll containment

Long-form dialog content scrolls within the dialog body, never the page behind.

---

# Feature: View-level Mobile Optimization

## ADDED Requirements

### VIEW-001: DashboardView

- KPI cards: 2 columns on `xs`, 4 on `sm+`.
- Charts stack vertically on `xs`, 1 large + 1 small on `md`, 2-up on `lg+`.
- Chart legends move below the chart on `xs`.

### VIEW-002: ChatView

- On `xs`/`sm`: master list takes full viewport width; tapping a conversation replaces the list with the message thread; tapping a contact icon replaces the thread with the contact panel. A back arrow returns. URL reflects current step (`/chat`, `/chat/:conversationId`, `/chat/:conversationId/contact`).
- On `md+`: 3-pane layout unchanged (master / thread / panel).

### VIEW-003: OrdersView / ContactsView / ZaloAccountsView

- Use `<ResponsiveDataTable>`.
- Filter bar collapses into a slide-up sheet triggered by a filter icon button on `xs`.

### VIEW-004: AppointmentsView

- Calendar view switches to a vertical day-list on `xs`.

### VIEW-005: ReportsView

- Chart grid: single column on `xs`, 2-up on `sm`, 3-up on `lg+`.
- Date range picker collapses to icon button → bottom sheet on `xs`.

### VIEW-006: SettingsView, ApiSettingsView, SetupView

- Tab navigation reflows to a horizontal scrollable row on `xs` (no clipping).

### VIEW-007: NotFoundView

- Existing layout remains but typography scales down appropriately on `xs`.

---

# Feature: Accessibility & i18n

## ADDED Requirements

### A11Y-001: Focus visibility

Every interactive element MUST show a visible focus ring at all breakpoints.

### A11Y-002: Keyboard parity

All actions reachable by tap MUST be reachable by Tab + Enter/Space. Bottom-nav items must be tab-stops in DOM order.

### A11Y-003: ARIA labels

Icon-only buttons MUST have `aria-label`. Bottom-nav MUST use `role="navigation"` with `aria-label`.

### I18N-001: All new strings translated

Every new label (nav item title, dialog close button text, "Back", filter sheet title, etc.) MUST exist in both `vi` and `en` locale files.