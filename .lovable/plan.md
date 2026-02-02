
# Coach Calendar View Implementation

## Overview
Add a comprehensive calendar view to the Coach Dashboard that allows coaches to schedule appointments with clients and visualize their day/week at a glance.

## What Will Be Built

### 1. New Database Table
A `coach_appointments` table to store scheduled events:
- Appointment date/time (start and end)
- Associated client (optional - some appointments may be admin time)
- Appointment type (training, assessment, lesson, meeting, etc.)
- Title and notes
- Coach ID (to scope appointments to the logged-in coach)

### 2. New Calendar Tab in Coach Dashboard
A sixth tab called "Calendar" with:
- Toggle between Day and Week views
- Visual timeline showing appointments
- Color-coded by client or appointment type
- Quick navigation (today, previous/next)

### 3. Add Appointment Dialog
A dialog to create new appointments:
- Client selector (dropdown of all clients)
- Date and time pickers (start/end time)
- Appointment type selector
- Title and notes fields

### 4. Appointment Management
- Click on an appointment to view/edit details
- Delete appointments with confirmation
- Visual indicators for different appointment types

## Technical Details

### Database Migration
```sql
CREATE TABLE public.coach_appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID NOT NULL REFERENCES public.profiles(id),
  client_id UUID REFERENCES public.profiles(id),
  title TEXT NOT NULL,
  appointment_type TEXT DEFAULT 'training',
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.coach_appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can manage their own appointments"
ON public.coach_appointments FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.id = coach_appointments.coach_id
  )
);
```

### New Components
| File | Purpose |
|------|---------|
| `src/components/dashboard/coach/CoachCalendar.tsx` | Main calendar view with day/week toggle |
| `src/components/dashboard/coach/calendar/DayView.tsx` | Day timeline component |
| `src/components/dashboard/coach/calendar/WeekView.tsx` | Week grid component |
| `src/components/dashboard/coach/calendar/AppointmentCard.tsx` | Individual appointment display |
| `src/components/dashboard/coach/calendar/AddAppointmentDialog.tsx` | Create/edit appointment form |

### Modified Components
| File | Change |
|------|--------|
| `src/components/dashboard/CoachDashboard.tsx` | Add Calendar tab (6th tab) |

### Features
- **Day View**: Hourly timeline from 6am-9pm showing appointments as blocks
- **Week View**: 7-day grid with appointments in each day column
- **Client Colors**: Each client gets a consistent color for easy identification
- **Quick Add**: Click on empty time slot to create appointment
- **Navigation**: Today button, prev/next buttons, date picker

## Implementation Steps

1. Create database migration for `coach_appointments` table with RLS
2. Create the `AppointmentCard` component for displaying appointments
3. Create `DayView` and `WeekView` components
4. Create `AddAppointmentDialog` with client selection
5. Create main `CoachCalendar` component combining all pieces
6. Add Calendar tab to `CoachDashboard`
7. Wire up data fetching and CRUD operations

## Visual Design
The calendar will follow the existing app design:
- Clean card-based layout
- Primary color for scheduled appointments
- Client avatars/initials shown on appointments
- Subtle time grid lines
- Responsive design (day view on mobile, week view on desktop)
