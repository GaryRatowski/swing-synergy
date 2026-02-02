
# Display Coach Sessions on Client Dashboard

## Problem
Sessions added by coaches (assessments, training sessions, lessons, etc.) are stored in the `workout_logs` table but are not visible to clients. The client dashboard currently only shows program-based workouts, not the ad-hoc sessions and notes that coaches add.

## Solution
Add a "Sessions" section to the client's WorkoutsTab (in the History tab) that displays all workout logs including coach-added sessions with their full structured notes visible in a read-only format.

---

## Implementation Details

### 1. Create Client Session Card Component
**New File: `src/components/dashboard/client/ClientSessionCard.tsx`**

A read-only session card for clients showing:
- Session date and type
- Duration and RPE
- Focus areas as badges
- Expandable section with:
  - Exercise summary
  - Key achievements (what went well)
  - Areas to improve
  - Coach notes/recommendations
- No edit or delete buttons (client is read-only)

### 2. Update WorkoutsTab Component
**File: `src/components/dashboard/client/WorkoutsTab.tsx`**

Modify the History tab to:
- Fetch ALL workout_logs for the client (not just completed ones)
- Include sessions without a program_id (coach-added sessions)
- Display using the new ClientSessionCard component
- Show structured notes data when available

---

## Data Flow

```text
workout_logs table
    |
    |-- Client fetches all their logs
    |
    v
WorkoutsTab (History tab)
    |
    v
ClientSessionCard (read-only view)
    - Session type badge
    - Date, duration, RPE
    - Focus areas
    - Expandable details:
      * Exercise summary
      * Key achievements
      * Areas to improve
      * Coach notes
```

---

## Technical Details

### Session Notes Structure (already defined)
The notes field contains JSON with:
- `sessionType`: training, assessment, lesson, warmup, recovery, competition
- `focusAreas`: array of focus area IDs (power, mobility, strength, etc.)
- `clientEnergy`: 1-10 energy level
- `exerciseSummary`: text description of exercises
- `keyAchievements`: what went well
- `areasToImprove`: areas needing work
- `coachNotes`: additional observations/recommendations

### RLS Policy Check
Existing policy "Users can manage their workout logs" allows:
- Clients to SELECT their own workout_logs (via client_id match)
- No changes needed to RLS

---

## Files to Create
1. `src/components/dashboard/client/ClientSessionCard.tsx` - Read-only session card component

## Files to Modify
1. `src/components/dashboard/client/WorkoutsTab.tsx` - Update History tab to show all sessions with notes
