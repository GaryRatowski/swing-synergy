
# Pending Client Status Implementation

## Overview
When a coach adds a new client, create a profile record immediately with a "pending" status. The status changes to "active" once the client signs up through the invite link.

## What Will Be Built

### 1. Database Changes
Add a `status` column to the `profiles` table:
- **pending**: Client added by coach but hasn't signed up yet
- **active**: Client has signed up and logged in

Update the `handle_new_user` trigger to:
- Check if a pending profile exists for the email
- If yes: link the `user_id` and change status to "active"
- If no: create a new profile as before

### 2. Add Client Dialog Updates
Modify `AddClientDialog.tsx` to:
- Create a pending profile immediately when coach clicks "Add Client"
- Set `user_id` to a placeholder (will need a workaround since `user_id` is NOT NULL)
- Store coach_id, email, full_name, membership_type, and status="pending"

### 3. Client Roster Updates
Update `ClientRoster.tsx` to:
- Display "Pending" badge for clients with pending status
- Fetch the status column
- Visual distinction for pending vs active clients

## Technical Details

### Database Migration
```sql
-- Add status column with default 'active' for existing records
ALTER TABLE public.profiles 
ADD COLUMN status TEXT DEFAULT 'active' NOT NULL;

-- Update handle_new_user function to check for pending profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if a pending profile exists for this email
  IF EXISTS (SELECT 1 FROM public.profiles WHERE email = NEW.email AND status = 'pending') THEN
    -- Link the user_id and activate the profile
    UPDATE public.profiles 
    SET user_id = NEW.id,
        status = 'active',
        updated_at = now()
    WHERE email = NEW.email AND status = 'pending';
  ELSE
    -- Create new profile as before
    INSERT INTO public.profiles (user_id, email, full_name, role)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
      'client'::user_role
    );
  END IF;
  RETURN NEW;
END;
$function$;
```

**Note**: The `user_id` column is NOT NULL, so we need to handle pending profiles differently. We'll use the coach's user_id temporarily and rely on email matching.

### Alternative Approach (Recommended)
Since `user_id` is required, we'll:
1. Make `user_id` nullable for pending profiles OR
2. Create a separate `pending_clients` table

**Best option**: Make `user_id` nullable to allow pending profiles without a linked auth user.

### Updated Migration
```sql
-- Allow user_id to be nullable for pending profiles
ALTER TABLE public.profiles ALTER COLUMN user_id DROP NOT NULL;

-- Add status column
ALTER TABLE public.profiles 
ADD COLUMN status TEXT DEFAULT 'active' NOT NULL;

-- Update existing records
UPDATE public.profiles SET status = 'active' WHERE user_id IS NOT NULL;
```

### Modified Components

| File | Change |
|------|--------|
| `src/components/dashboard/coach/AddClientDialog.tsx` | Create pending profile on submit |
| `src/components/dashboard/coach/ClientRoster.tsx` | Show status badge, update interface |

### RLS Policy Update
Update profiles RLS to allow coaches to INSERT pending profiles:
```sql
CREATE POLICY "Coaches can insert pending clients"
ON public.profiles FOR INSERT
WITH CHECK (
  is_coach(auth.uid()) AND status = 'pending'
);
```

## Implementation Steps

1. Create database migration:
   - Make `user_id` nullable
   - Add `status` column with default 'active'
   - Update `handle_new_user` trigger to handle pending profiles
   - Add RLS policy for coaches to insert pending clients

2. Update `AddClientDialog.tsx`:
   - On submit, insert a new profile with `status = 'pending'`
   - Set `user_id = NULL` for pending clients
   - Include coach_id, email, full_name, membership_type

3. Update `ClientRoster.tsx`:
   - Add `status` to the Client interface
   - Fetch status column in query
   - Display "Pending" badge with distinct styling
   - Filter tabs for pending vs active

4. Update invite link to include email parameter for auto-fill on signup page

## Visual Design
- **Pending clients**: Yellow/orange "Pending" badge, slightly faded card
- **Active clients**: Green "Active" badge or no badge (default state)
- Filter options: "All", "Active", "Pending"
