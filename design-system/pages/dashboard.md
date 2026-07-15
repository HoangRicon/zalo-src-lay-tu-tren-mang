# Page Override — DashboardView (mobile)

Deviates from MASTER for mobile dashboard-specific charts/KPI stacking.

## KPI grid
- xs: `cols="6"` (2 cards per row)
- sm+: `cols="3"` (4 cards per row)
- Card padding: `pa-3` on xs, `pa-4` on md+
- Icon size: 24 on xs, 28 on md+

## Charts
- xs: stack vertically, each chart full-width, height 240px
- md: `md="8"` for MessageVolumeChart, `md="4"` for PipelineChart
- lg: same as md

## Chart legend position
- xs: bottom
- md+: right

## Page title
- xs: h6 instead of h4 to save vertical space