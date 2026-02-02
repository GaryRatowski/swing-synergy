

# Create New Program and Enhanced Program Editing

This plan adds the ability to create new programs, search and add exercises from the exercise library, create supersets, and inline-edit sets/reps for each exercise.

---

## Overview

We will build:
1. A "Create Program" dialog that opens when clicking the "Create New Program" card
2. An "Add Exercise" panel within the Program Detail dialog to search and add exercises
3. Inline editing for sets, reps, and notes on each exercise row
4. Superset grouping functionality to link exercises together

---

## Implementation Steps

### Step 1: Database Migration for Superset Support

Add a `superset_group` column to the `program_exercises` table. Exercises sharing the same group value (e.g., "A", "B") are performed together as a superset.

```text
program_exercises table changes:
+------------------+--------+----------+
| Column           | Type   | Default  |
+------------------+--------+----------+
| superset_group   | text   | null     |
+------------------+--------+----------+
```

---

### Step 2: Create New Program Dialog

Create a new component `CreateProgramDialog.tsx` that:
- Collects program metadata (name, description, phase, duration, session type)
- Creates the program in the database
- After creation, opens the Program Detail dialog for adding exercises

**File:** `src/components/dashboard/coach/CreateProgramDialog.tsx`

---

### Step 3: Update ProgramBuilder to Use Create Dialog

Modify `ProgramBuilder.tsx` to:
- Add state for the create dialog
- Wire up the "Create New Program" card click to open the dialog
- After program creation, refresh the list and open the detail view

---

### Step 4: Add Exercise Picker to Program Detail Dialog

Enhance `ProgramDetailDialog.tsx` with:
- An "Add Exercises" button that expands a search panel
- Search input with filters for body part and exercise type
- List of matching exercises from the database
- Click-to-add functionality that inserts into `program_exercises`

```text
+------------------------------------------+
|  Program Details                         |
+------------------------------------------+
|  Name: [Dynamic Warmup Protocol    ]     |
|  Description: [                    ]     |
|  Phase: [Mobility v]  Type: [At Home v]  |
|  Duration: [1] weeks   [Save Changes]    |
+------------------------------------------+
|  Exercises (12)           [+ Add]        |
|  +--------------------------------------+|
|  | Search exercises...     [Type v]    ||
|  | ( ) 90/90 Hip Switches - Hips       ||
|  | ( ) Band Pull Aparts - Shoulders    ||
|  +--------------------------------------+|
|  +--------------------------------------+|
|  | 1. 90/90 Hip Switches               ||
|  |    [3] sets x [10 ea] [Notes...]  X ||
|  | A1. 90/90 Glute Reach    [Superset] ||
|  |    [1] sets x [20-30s] [Notes...] X ||
|  | A2. 90/90 IR Twist       [Superset] ||
|  |    [1] sets x [20-30s] [Notes...] X ||
|  +--------------------------------------+|
+------------------------------------------+
```

---

### Step 5: Inline Exercise Editing

For each exercise row in the program, add:
- Editable `sets` input (number)
- Editable `reps` input (text - supports "10", "10 ea", "20-30s")
- Editable `notes` input (text)
- Auto-save on blur or debounced typing

---

### Step 6: Superset Management

Add superset functionality:
- A "Link as Superset" button when multiple exercises are selected
- Visual grouping with labels (A1, A2, B1, B2, etc.)
- Ability to remove an exercise from a superset
- Supersets share the same `superset_group` value in the database

---

## Component Structure

```text
src/components/dashboard/coach/
  ProgramBuilder.tsx          (updated - add create dialog trigger)
  CreateProgramDialog.tsx     (new - program metadata form)
  ProgramDetailDialog.tsx     (updated - add exercise picker, inline editing, supersets)
  ExercisePicker.tsx          (new - searchable exercise list for adding)
```

---

## Technical Details

### Database Changes
- Add `superset_group TEXT NULL` to `program_exercises`
- No RLS changes needed (existing policies cover this)

### State Management
- Local state in dialogs for form data and exercise list
- Optimistic updates for inline editing
- Debounced save (300ms) for text inputs

### Data Flow
1. Coach clicks "Create New Program" card
2. `CreateProgramDialog` opens, coach fills metadata
3. On submit, new program created in `programs` table
4. Dialog closes, `ProgramDetailDialog` opens for the new program
5. Coach uses exercise picker to add exercises
6. Each added exercise creates a `program_exercises` record
7. Coach can inline-edit sets/reps/notes (auto-saved)
8. Coach can group exercises into supersets

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `CreateProgramDialog.tsx` | Create | New program form |
| `ExercisePicker.tsx` | Create | Search and add exercises |
| `ProgramBuilder.tsx` | Update | Wire up create dialog |
| `ProgramDetailDialog.tsx` | Update | Add picker, inline editing, supersets |
| Database migration | Create | Add superset_group column |

