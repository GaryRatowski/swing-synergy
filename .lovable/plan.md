
# Client Dashboard Implementation Plan

## Overview
Transform the client-facing dashboard from static mock data into a fully functional, interactive experience. The client dashboard will connect to real database tables and provide workout tracking, habit logging, progress visualization, and profile management.

## Current State Analysis
- **Today Tab**: Shows mock workout data, mock habits, mock stats
- **Workouts Tab**: Not implemented (shows same as Today)
- **Progress Tab**: Not implemented (shows same as Today)
- **Messages Tab**: Fully functional
- **Profile Tab**: Not implemented (shows same as Today)
- **ClubheadSpeedChart**: Already fetches real data from `performance_metrics`

## Database Tables to Utilize
- `client_programs` - Links clients to assigned programs
- `programs` - Program details (name, duration, phase)
- `program_exercises` - Exercises within programs
- `exercises` - Exercise details (name, video, cues)
- `workout_logs` - Track completed workouts
- `exercise_logs` - Track individual exercise completion
- `habits` - Client's tracked habits
- `habit_logs` - Daily habit entries
- `performance_metrics` - Performance data (clubhead speed, handicap, etc.)
- `profiles` - User profile information

---

## Implementation Details

### Phase 1: Today Tab - Dashboard Home

**New Component: `src/components/dashboard/client/TodayTab.tsx`**

Features:
- Fetch client's active program from `client_programs` joined with `programs`
- Determine today's workout based on program week/day schedule
- Display real exercises from `program_exercises` joined with `exercises`
- Quick stats pulled from `performance_metrics` and `workout_logs`
- Interactive workout preview card with "Start Workout" button

Data Flow:
```text
client_programs (is_active=true)
    -> programs (name, training_phase)
    -> program_exercises (week_number, day_number)
    -> exercises (name, sets, reps, video_url)
```

### Phase 2: Workouts Tab - Workout Execution

**New Component: `src/components/dashboard/client/WorkoutsTab.tsx`**

Features:
- List of available workouts for the current week
- Active workout execution interface
- View past completed workouts

**New Component: `src/components/dashboard/client/WorkoutExecution.tsx`**

Features:
- Full-screen workout execution mode
- Exercise cards showing:
  - Exercise name, sets x reps, rest time
  - Demo video (if available)
  - Coaching cues
- Input fields for logging:
  - Weight used
  - Reps completed per set
  - RPE (Rate of Perceived Exertion)
  - Notes
- Rest timer between sets
- Mark exercise complete and move to next
- Complete workout summary with overall RPE
- Creates `workout_log` and `exercise_logs` entries on completion

**New Component: `src/components/dashboard/client/ExerciseCard.tsx`**

Features:
- Expandable card showing exercise details
- Video player for demo (opens in modal)
- Coaching cues displayed
- Set tracking (checkboxes for each set)
- Input for weight/reps

### Phase 3: Habits Tab Integration

**New Component: `src/components/dashboard/client/HabitTracker.tsx`**

Features:
- Fetch habits from `habits` table for current client
- Display today's habit progress from `habit_logs`
- Interactive increment/decrement buttons
- Quick-tap to mark habits complete
- Visual progress indicators (circular progress)
- Default habits if none configured:
  - Water intake
  - Sleep hours
  - Stretching

### Phase 4: Progress Tab - Stats & History

**New Component: `src/components/dashboard/client/ProgressTab.tsx`**

Features:
- Performance metrics charts (reuse ClubheadSpeedChart pattern)
- Multiple metric types: clubhead speed, ball speed, handicap
- Add new metric entries (clients can self-report)
- Workout history list with completion dates
- Weekly/monthly workout summary
- Streak counter

### Phase 5: Profile Tab

**New Component: `src/components/dashboard/client/ProfileTab.tsx`**

Features:
- View current profile information
- Edit capabilities for:
  - Full name
  - Phone number
  - Goals
  - Fitness level
  - Golf experience
  - Injury history
  - Handicap
- Avatar upload (if storage is configured)
- Account settings (email display, sign out)

---

## Component Structure

```text
src/components/dashboard/client/
├── TodayTab.tsx           (Dashboard home)
├── WorkoutsTab.tsx        (Workout list & execution)
├── WorkoutExecution.tsx   (Active workout modal)
├── ExerciseCard.tsx       (Individual exercise UI)
├── HabitTracker.tsx       (Habit logging)
├── ProgressTab.tsx        (Stats & history)
├── ProfileTab.tsx         (Profile management)
└── ClubheadSpeedChart.tsx (Existing - no changes)
```

---

## Updated ClientDashboard.tsx Structure

The main dashboard will be refactored to:
1. Import all new tab components
2. Render appropriate component based on `activeTab` state
3. Remove all mock data from the main file
4. Pass necessary props (like `clientId` from profile)

```text
activeTab === "today"     -> <TodayTab />
activeTab === "workouts"  -> <WorkoutsTab />
activeTab === "progress"  -> <ProgressTab />
activeTab === "messages"  -> <MessagingPanel />
activeTab === "profile"   -> <ProfileTab />
```

---

## Technical Considerations

### Data Fetching Strategy
- Use `useEffect` with Supabase queries (matching existing patterns)
- Consider creating custom hooks for reusable data fetching:
  - `useClientProgram()` - Fetch active program
  - `useClientHabits()` - Fetch habits and today's logs
  - `useClientMetrics()` - Fetch performance metrics

### RLS Policies (Already Configured)
- Clients can view their own programs (`client_programs`)
- Clients can manage their workout/exercise logs
- Clients can manage their habits and habit logs
- Clients can manage their own metrics
- No database changes needed

### UI/UX Considerations
- Mobile-first design (matching existing responsive patterns)
- Touch-friendly inputs for workout logging
- Clear visual feedback for completed actions
- Loading states for all data fetches
- Empty states when no data exists

---

## Implementation Order

1. **TodayTab** - Core dashboard functionality
2. **HabitTracker** - Quick interactive wins
3. **WorkoutsTab + WorkoutExecution** - Main workout flow
4. **ProgressTab** - Stats visualization
5. **ProfileTab** - Profile management
6. **ClientDashboard refactor** - Wire everything together

---

## Files to Create
1. `src/components/dashboard/client/TodayTab.tsx`
2. `src/components/dashboard/client/WorkoutsTab.tsx`
3. `src/components/dashboard/client/WorkoutExecution.tsx`
4. `src/components/dashboard/client/ExerciseCard.tsx`
5. `src/components/dashboard/client/HabitTracker.tsx`
6. `src/components/dashboard/client/ProgressTab.tsx`
7. `src/components/dashboard/client/ProfileTab.tsx`

## Files to Modify
1. `src/components/dashboard/ClientDashboard.tsx` - Refactor to use new components
