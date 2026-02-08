
# Plan: Convert Coach Dashboard Tabs to Left Sidebar Navigation

## Overview
Transform the crowded horizontal tab bar (10 tabs) into a vertical left-side navigation using the existing shadcn Sidebar component system. This will provide better organization, clearer labels, and room for future navigation items.

## Current Problem
- 10 tabs in a horizontal row (`grid-cols-10`) creates visual clutter
- Labels hidden on smaller screens (`hidden sm:inline`)
- Tab triggers are cramped and hard to click
- No room for expansion

## Solution
Replace the horizontal `TabsList` with a collapsible left sidebar using the existing `SidebarProvider`, `Sidebar`, and related components already in the project.

---

## Implementation Steps

### 1. Restructure CoachDashboard Layout
- Wrap the main content in `SidebarProvider`
- Add a `Sidebar` component on the left side with navigation items
- Move header inside `SidebarInset` for proper layout
- Keep `Tabs` component but remove `TabsList` (navigation handled by sidebar)

### 2. Create Sidebar Navigation Items
Convert each tab trigger into a sidebar menu item:

| Icon | Label | Value |
|------|-------|-------|
| Sun | Today | today |
| CalendarDays | Calendar | calendar |
| Users | Clients | clients |
| AlertTriangle | Flags | flags (with badge) |
| Dumbbell | Exercises | exercises |
| Calendar | Programs | programs |
| ClipboardList | Assessments | assessments |
| MessageSquare | Messages | messages |
| BarChart3 | Analytics | analytics |
| Settings | Settings | settings |

### 3. Sidebar Structure
```text
+------------------+
| GP Logo + Title  |  <- SidebarHeader
+------------------+
| Today            |
| Calendar         |
| Clients          |
| Flags      [3]   |  <- Badge for pending flags
| Exercises        |
| Programs         |
| Assessments      |
| Messages         |
| Analytics        |
+------------------+
| Settings         |  <- SidebarFooter
+------------------+
| Sign Out         |
+------------------+
```

### 4. Mobile Behavior
- On mobile (< 768px): Sidebar appears as a slide-out sheet
- Add `SidebarTrigger` (hamburger menu) in the header
- Sidebar auto-closes after selecting a nav item on mobile

### 5. Desktop Behavior
- Sidebar stays fixed on the left
- Collapsible to icon-only mode (press `Ctrl+B`)
- Show full labels when expanded

---

## Technical Details

### Files to Modify
- `src/components/dashboard/CoachDashboard.tsx` - Main restructure

### Key Changes
1. Import Sidebar components:
   - `SidebarProvider`, `Sidebar`, `SidebarContent`, `SidebarHeader`, `SidebarFooter`
   - `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton`, `SidebarTrigger`, `SidebarInset`

2. Replace layout structure:
   - Current: `<div>` with header + content
   - New: `<SidebarProvider>` with `<Sidebar>` + `<SidebarInset>`

3. Navigation items use `SidebarMenuButton` with `isActive={activeTab === 'value'}` and `onClick={() => setActiveTab('value')}`

4. Keep `TabsContent` components unchanged (just remove `TabsList`)

5. Context-aware action buttons (Add Client, etc.) move into the main content area header

---

## Visual Comparison

**Before (Horizontal Tabs)**:
```text
[Today][Calendar][Clients][Flags][Exercises][Programs][Assessments][Messages][Analytics][Settings]
```

**After (Vertical Sidebar)**:
```text
+------------+------------------------------------------+
| GP         |  Coach Dashboard                         |
| Today    * |  Welcome back, Coach Name                |
| Calendar   |  [Stats Grid]                            |
| Clients    |                                          |
| Flags [3]  |  [Content Area]                          |
| Exercises  |                                          |
| Programs   |                                          |
| Assess...  |                                          |
| Messages   |                                          |
| Analytics  |                                          |
+------------+                                          |
| Settings   |                                          |
| Sign Out   |                                          |
+------------+------------------------------------------+
```

---

## Benefits
- Clear, readable navigation labels always visible
- Room for future navigation items
- Consistent with modern dashboard patterns
- Mobile-friendly with slide-out drawer
- Collapsible for maximum content space when needed
- Better accessibility with larger click targets
