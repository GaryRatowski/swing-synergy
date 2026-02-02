
# Add Dynamic Warmup Protocol

## Overview
Add the Dynamic Warmup Protocol as a complete program with 12 exercises. This involves:
1. Adding the new warmup exercises to the database
2. Creating the program template
3. Linking exercises to the program with proper ordering
4. Making it visible on both coach and client dashboards

---

## Exercises to Add (12 total)

| # | Exercise Name | Sets | Reps | Equipment | Notes |
|---|--------------|------|------|-----------|-------|
| 1A | 90/90 Hip Switches | 1 | 10 ea | None | Keep upper body steady and drive knees to the ground |
| 2A | 90/90 Glute Reach | 1 | 20-30s | None | Lean over the middle of the front shin. Crawl your way out |
| 2B | 90/90 Internal Rotation Twist | 1 | 20-30s | None | Twist into your back leg. Drive hip down to ground, squeeze ankle/knee every 5s |
| 2C | 90/90 Internal Rotation Knee Lift | 1 | 10 | None | Stay twisted, drive ankle into ground as you raise knee activating outside of hip |
| 2D | 90/90 Hip Lift with Rotation | 1 | 6-8 | None | Twist back chest facing front thigh. Lift back leg and hike it up high with heel rotation |
| 3 | Adductor Groin Rockers with Reach Through | 1 | 10 | None | Knee down, other leg extended. Rock back then reach under arm of knee, open up towards straight |
| 4 | 1/2 Kneel Groin Rockers to Hamstring Stretch | 1 | 5 ea | None | 1/2 kneeling position, rock into front leg then lean back straightening front leg |
| 5 | Side Lying Open Books w/ Band | 1 | 10 ea | Resistance band | Lie on side, top knee bent, pull band open trying to open ribcage to ceiling |
| 6 | Hip Band Monster Walks Forward+Back | 1 | 10 ea | Resistance band | Band above knees, 1/4 squat, walk forward/out 45 degrees then backwards |
| 7 | Lateral Lunge to Rotation | 1 | 8 ea | None | Step out deep into lateral lunge, place inside hand on ground, rotate over leg |
| 8 | Band Shoulder Pass Through | 1 | 12-15 | Resistance band | Hold band shoulder width, reach over head and around to low back, arms straight |
| 9 | Band SL RDL to Hip Airplane | 1 | 8 ea | Resistance band | Band across chest, hinge over, rotate into planted leg then away, stand back up |

---

## Implementation Steps

### Step 1: Add Exercises to Database
Insert 12 new exercises into the `exercises` table with:
- **exercise_type**: "mobility" (all are warmup/mobility focused)
- **difficulty**: "beginner" (accessible warmup exercises)
- **body_part**: Hips, Core, Shoulders as appropriate
- **equipment_needed**: "None" or "Resistance band"
- **coaching_cues**: The detailed notes from the spreadsheet

### Step 2: Create Program Template
Insert new program into `programs` table:
- **name**: "Dynamic Warmup Protocol"
- **description**: "Complete dynamic warmup sequence targeting hip mobility, thoracic rotation, and movement preparation for golf performance"
- **training_phase**: "mobility"
- **duration_weeks**: 1 (single session warmup)
- **session_type**: "at-home" or "gym"
- **is_template**: true

### Step 3: Link Exercises to Program
Insert into `program_exercises` table:
- Link each exercise with proper `order_index` (1-12)
- Set `week_number`: 1, `day_number`: 1
- Include sets and reps from the spreadsheet
- Add notes for circuit instructions (e.g., "Go through 2A-D then repeat on other side")

### Step 4: Update ProgramBuilder Component
Modify `src/components/dashboard/coach/ProgramBuilder.tsx`:
- Fetch real programs from database instead of mock data
- Display the Dynamic Warmup Protocol template

### Step 5: Client Dashboard Integration
The program will automatically appear on client dashboards through:
- Existing `TodayTab.tsx` logic that fetches from `client_programs` and `program_exercises`
- Coaches can assign the program to clients via the "Assign" button

---

## Technical Details

### Database Inserts

**exercises table** - 12 new rows with structure:
```text
name, body_part, description, difficulty, equipment_needed, exercise_type, coaching_cues
```

**programs table** - 1 new row:
```text
name: "Dynamic Warmup Protocol"
training_phase: "mobility"
duration_weeks: 1
session_type: "at-home"
is_template: true
```

**program_exercises table** - 12 new rows linking exercises to program

### Component Updates

**ProgramBuilder.tsx**:
- Replace mock data with real database fetch
- Add loading state
- Show exercise count from actual program_exercises

---

## Files to Create
None

## Files to Modify
1. `src/components/dashboard/coach/ProgramBuilder.tsx` - Fetch real programs from database

## Database Changes
1. Insert 12 exercises into `exercises` table
2. Insert 1 program into `programs` table  
3. Insert 12 program_exercises linking exercises to program
