

# Session Notes & Google Calendar Integration

## Overview
This plan enhances the session notes system and integrates with Google Calendar to automatically create workout sessions in client profiles when coaching appointments are scheduled.

## Current State
- Session notes dialog exists but only edits existing workout logs
- No way to create new sessions manually
- No calendar integration

## What We'll Build

### Part 1: Enhanced Session Notes (Quick Win)
Allow coaches to manually create new sessions and add comprehensive notes:

- **Add New Session Button**: Create sessions directly from the Training Calendar tab
- **Enhanced Notes Dialog**: Add fields for session type, focus areas, and structured notes
- **Mark as Complete**: Update session status and add completion notes

### Part 2: Google Calendar Integration

#### How It Works
1. **Coach connects Google Calendar** via OAuth2 authorization
2. **Edge function syncs events** that match client names or contain specific tags
3. **Automatic session creation** when calendar events are detected
4. **Session appears in client profile** ready for notes after the appointment

#### Architecture

```text
Google Calendar --> Webhook Notification --> Edge Function --> workout_logs table
                                                    |
                                        Matches client by name/email
```

#### Database Changes

**New table: `google_calendar_connections`**
- `id` (uuid)
- `coach_id` (uuid) - references profiles
- `google_refresh_token` (text, encrypted)
- `google_calendar_id` (text)
- `sync_enabled` (boolean)
- `last_synced_at` (timestamp)
- `created_at` (timestamp)

**New table: `calendar_event_mappings`**
- `id` (uuid)
- `google_event_id` (text, unique)
- `workout_log_id` (uuid) - references workout_logs
- `client_id` (uuid)
- `event_title` (text)
- `event_start` (timestamp)
- `created_at` (timestamp)

#### Edge Functions Required

1. **`google-calendar-auth`**: Handle OAuth2 flow
   - Initiates Google consent screen
   - Exchanges auth code for tokens
   - Stores refresh token securely

2. **`google-calendar-sync`**: Fetch and sync events
   - Called on-demand or via scheduled job
   - Reads calendar events
   - Matches client names to profiles
   - Creates workout_log entries

3. **`google-calendar-webhook`**: Receive push notifications (optional, advanced)
   - Real-time updates when events change
   - Requires public webhook URL

#### UI Components

**Settings/Integration Section:**
- Connect Google Calendar button
- Select which calendar to sync
- Toggle auto-sync on/off
- Manual sync button

**Training Calendar Tab Updates:**
- "Add Session" button for manual creation
- Visual indicator for Google-synced sessions
- Enhanced notes dialog with more fields

## Implementation Phases

### Phase 1: Manual Session Creation (No API needed)
- Add "New Session" button to Training Calendar
- Create session for any date with client pre-selected
- Enhanced notes with duration, RPE, session type

### Phase 2: Google Calendar OAuth Setup
- Create edge function for OAuth flow
- Store encrypted tokens in database
- Settings page for connection management

### Phase 3: Calendar Sync Logic
- Edge function to fetch upcoming/past events
- Client matching algorithm (by name in event title)
- Automatic workout_log creation

### Phase 4: Real-time Webhooks (Optional)
- Set up push notification channel
- Instant sync when events are created/modified

## Required Secrets
- `GOOGLE_CLIENT_ID` - From Google Cloud Console
- `GOOGLE_CLIENT_SECRET` - From Google Cloud Console

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `supabase/functions/google-calendar-auth/index.ts` | Create | OAuth2 flow handler |
| `supabase/functions/google-calendar-sync/index.ts` | Create | Event sync logic |
| `src/components/dashboard/coach/client-detail/AddSessionDialog.tsx` | Create | Manual session creation |
| `src/components/dashboard/coach/client-detail/TrainingCalendarTab.tsx` | Modify | Add new session button |
| `src/components/dashboard/coach/client-detail/SessionNotesDialog.tsx` | Modify | Enhanced fields |
| `src/components/dashboard/coach/settings/GoogleCalendarSettings.tsx` | Create | Integration management |
| Database migration | Create | New tables for calendar sync |

## Security Considerations
- Google refresh tokens stored encrypted in database
- RLS policies ensure coaches only access their own connections
- OAuth scopes limited to calendar read-only
- Client matching uses exact profile lookups

## Limitations & Notes
- Google Calendar push notifications require a publicly accessible webhook URL
- Initial implementation will use manual/scheduled sync (more reliable)
- Client matching requires consistent naming in calendar events (e.g., "Session with John Doe")

