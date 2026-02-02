
# Add Exercise Library Tab for Clients

## Overview
Add a new "Exercises" tab to the client dashboard that displays the full exercise database in a read-only, browseable format. This allows clients to explore all available exercises, view video demos, and understand proper form before or after their workouts.

## Changes Required

### 1. Create Client Exercise Library Component
**New File: `src/components/dashboard/client/ExerciseLibraryTab.tsx`**

A read-only version of the exercise library tailored for clients:
- Search functionality (by name, body part)
- Filter by exercise type (Power, Strength, Mobility, etc.)
- Filter by difficulty level (Beginner, Intermediate, Advanced)
- Exercise cards showing:
  - Exercise name and description
  - Video demo placeholder (clickable to play if video_url exists)
  - Coaching cues (helpful for clients learning proper form)
  - Body part and equipment needed
  - Difficulty and type badges
- No edit/delete buttons (coach-only features removed)
- No "Add Exercise" or "Import CSV" options

### 2. Update Client Dashboard Navigation
**File: `src/components/dashboard/ClientDashboard.tsx`**

Add "Exercises" tab to navigation arrays:
- Desktop sidebar navigation (between Workouts and Progress)
- Mobile bottom navigation (between Workouts and Progress)
- Main content rendering logic

Navigation item:
```text
{ name: "Exercises", icon: Library, tab: "exercises" }
```

Updated tab order:
1. Today (Home)
2. Workouts (Dumbbell)
3. Exercises (Library) - NEW
4. Progress (TrendingUp)
5. Messages (MessageSquare)
6. Profile (User)

---

## Technical Details

### Component Structure
The client exercise library will:
- Fetch exercises from `exercises` table using existing RLS policy ("Authenticated users can view exercises")
- Display in a responsive grid (1 col mobile, 2 cols tablet, 3+ cols desktop)
- Include loading and empty states
- Optionally show exercise detail modal when clicked (for viewing coaching cues and video)

### UI Differences from Coach Version
| Feature | Coach | Client |
|---------|-------|--------|
| Edit button | Yes | No |
| Delete button | Yes | No |
| Add Exercise dialog | Yes | No |
| Import CSV link | Yes | No |
| View exercise details | Yes | Yes |
| Search & filter | Yes | Yes |

---

## Files to Create
1. `src/components/dashboard/client/ExerciseLibraryTab.tsx` - Read-only exercise browser for clients

## Files to Modify
1. `src/components/dashboard/ClientDashboard.tsx` - Add navigation item and tab rendering
