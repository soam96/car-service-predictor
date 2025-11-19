# Volvo Car Service Intelligence System - Design Guidelines

## Design Approach
**Material Design Foundation** adapted for automotive enterprise context. Drawing from industry-standard dashboard patterns (Linear, Asana for task management feel) with automotive precision and Volvo's premium Nordic aesthetic.

## Typography System
**Primary Font:** Inter (Google Fonts)
- Headings: 600 weight, tracking-tight
- Body: 400 weight, leading-relaxed for data readability
- Data/Numbers: 500 weight, tabular-nums for alignment
- Labels: 500 weight, uppercase, tracking-wide, text-xs

**Hierarchy:**
- Dashboard titles: text-2xl font-semibold
- Section headers: text-lg font-semibold
- Card titles: text-base font-medium
- Data labels: text-sm font-medium uppercase
- Body/values: text-sm
- Metrics/stats: text-3xl font-semibold for primary, text-sm for labels

## Layout System
**Spacing Primitives:** Tailwind units of 2, 4, 6, and 8
- Component padding: p-6
- Section spacing: gap-6 or gap-8
- Card internal: p-4
- Tight groups: gap-2
- Form fields: space-y-4

**Grid Structure:**
- Admin Dashboard: Sidebar (w-64) + Main content area
- Stats cards: 4-column grid (grid-cols-4)
- Tables: Full-width with fixed column widths
- User Panel: Centered max-w-4xl with two-column form layouts

## Component Library

### Navigation
**Admin Sidebar:** Fixed left, full-height with logo, nav items with icons (Heroicons), active state indicator, collapse option for mobile
**User Panel Header:** Logo left, minimal navigation, service status indicator right

### Data Display Components

**Stats Cards:**
- Rounded-lg border shadow-sm
- Icon + Label + Large number + Subtitle
- Status indicators (colored dots/badges)
- 4-across desktop, stack mobile

**Worker Table:**
- Sticky header with sort controls
- Status badges (Available/Busy/Offline)
- Load percentage with progress bars
- Skill tags as pills
- Action buttons in last column
- Alternating row backgrounds for readability

**Active Services Table:**
- Service ID (monospace font)
- Progress bars with percentage
- Time remaining countdown
- Color-coded status (In Progress/Queued/Completing)
- Quick action buttons

**Inventory List:**
- Part name + Stock quantity + Status badge
- Low stock warnings (amber badge)
- Restock button inline
- Minimum stock threshold shown

### Forms (User Panel)

**Service Request Form:**
- Two-column layout desktop (Vehicle Info | Service Selection)
- Grouped sections with borders
- Dropdown selects for Car Model, Service Type
- Date pickers for Last Service Date
- Checkbox lists for service tasks with base time shown
- Large submit button with loading state

**Input Styling:**
- Border focus rings
- Helper text below inputs
- Validation states (success/error borders)
- Disabled states clearly differentiated

### Status & Feedback

**Progress Indicators:**
- Linear progress bars for service completion
- Circular loaders for predictions
- Queue position badges
- Time estimates with clock icons

**Alerts/Warnings:**
- Banner style for system messages
- Inline warnings for low stock
- Toast notifications for updates
- Modal confirmations for service completion

**Status Badges:**
- Rounded-full px-3 py-1
- Color-coded backgrounds (subtle)
- Icons paired with text
- Consistent sizing across contexts

### Buttons & Actions
- Primary: Filled, prominent for main actions
- Secondary: Outlined for secondary actions
- Icon buttons: Ghost style for table actions
- Danger: Red for delete/critical actions
- Size variants: lg for CTAs, default for forms, sm for tables

## Real-Time Dashboard Features

**Live Updates Indicators:**
- Pulsing dot for real-time status
- "Last Updated" timestamp
- Auto-refresh toggle
- Skeleton loaders during data fetch

**Queue Visualization:**
- Number badge on queued services
- Estimated wait time prominently displayed
- Queue position indicator

## Responsive Strategy
**Desktop (lg+):** Full dashboard with sidebar, multi-column layouts, expanded tables
**Tablet (md):** Collapsible sidebar, 2-column grids, scrollable tables
**Mobile:** Stacked layouts, bottom navigation, card-based service view, simplified tables

## Professional Polish
- Consistent border-radius (rounded-lg for cards, rounded-md for inputs)
- Subtle shadows (shadow-sm default, shadow-md for elevated)
- Smooth transitions (transition-colors duration-200)
- Loading states for all async operations
- Empty states with helpful messaging
- Disabled states clearly communicated

## Icons
**Heroicons** (outline for navigation, solid for status indicators)
- Dashboard, Users, Wrench, Clock, ChartBar, ExclamationTriangle, CheckCircle

## Images
**No hero image** - This is a functional dashboard application. Instead:
- Volvo logo in header/sidebar
- Worker avatars in tables (placeholder circles with initials)
- Status icons throughout
- Optional: Small Volvo service bay illustration for empty states