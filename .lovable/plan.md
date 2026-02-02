
# Client Detail View with Tabbed Interface

## Overview
This plan creates a detailed client profile view accessible from the Coach Dashboard when clicking "View Details" on a client card. The view will have a tabbed interface with Metrics, Documents, Calendar (training sessions), and the ability to add training notes.

## New Components Structure

```text
src/components/dashboard/coach/
  ClientRoster.tsx (existing - add navigation)
  ClientDetailView.tsx (new - main container)
  client-detail/
    OverviewTab.tsx (new - client summary)
    MetricsTab.tsx (new - performance charts)
    DocumentsTab.tsx (new - file management)
    TrainingCalendarTab.tsx (new - calendar with session notes)
    SessionNotesDialog.tsx (new - modal for adding/editing notes)
```

## Database Changes

### 1. Create `client_documents` Table
Store documents uploaded by the coach for each client:
- `id` (uuid, primary key)
- `client_id` (uuid, references profiles)
- `uploaded_by` (uuid, coach who uploaded)
- `name` (text, document name)
- `file_path` (text, storage path)
- `file_type` (text, mime type)
- `file_size` (bigint, bytes)
- `category` (text - e.g., "assessment", "form", "report")
- `notes` (text, optional description)
- `created_at` (timestamp)

### 2. Create Storage Bucket
- Bucket name: `client-documents`
- RLS policies for coach upload and client read access

### 3. Add Coach Notes to `workout_logs`
The `workout_logs` table already has a `notes` column - we'll leverage this for coach training session notes.

## Implementation Details

### Tab 1: Overview
- Display client profile information (name, email, handicap, goals, injury history)
- Current program status and progress
- Quick stats summary
- Membership type badge

### Tab 2: Metrics
- Reusable performance metric charts
- Display clubhead speed, handicap history, workout completion rate
- Filter by date range
- Add new metric entries

### Tab 3: Documents
- List uploaded documents with categories
- Upload new documents with drag-and-drop
- Preview/download functionality
- Delete documents

### Tab 4: Training Calendar
- Monthly calendar view showing workout dates
- Color-coded based on completion status
- Click on a date to view/add session notes
- Session details: exercises completed, RPE, duration, coach notes

## UI/UX Flow

1. From `ClientRoster`, clicking "View Details" opens `ClientDetailView` as either:
   - A slide-over panel (Sheet component), or
   - A modal dialog (Dialog component)
   
2. The detail view shows a header with client avatar, name, and key stats
3. Tab navigation below the header
4. Each tab loads its content dynamically

## Technical Considerations

### State Management
- Pass `clientId` to `ClientDetailView`
- Each tab fetches its own data using the client ID
- Use React Query for caching and background refetching

### File Uploads
- Use Supabase Storage for document uploads
- Generate unique file paths: `{client_id}/{timestamp}_{filename}`
- Store metadata in `client_documents` table

### Calendar Integration
- Use the existing `Calendar` component from shadcn/ui
- Query `workout_logs` by `client_id` and date range
- Display sessions as dots/indicators on calendar dates

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/components/dashboard/coach/ClientDetailView.tsx` | Create | Main tabbed container |
| `src/components/dashboard/coach/client-detail/OverviewTab.tsx` | Create | Client info summary |
| `src/components/dashboard/coach/client-detail/MetricsTab.tsx` | Create | Performance charts |
| `src/components/dashboard/coach/client-detail/DocumentsTab.tsx` | Create | Document management |
| `src/components/dashboard/coach/client-detail/TrainingCalendarTab.tsx` | Create | Calendar with sessions |
| `src/components/dashboard/coach/client-detail/SessionNotesDialog.tsx` | Create | Notes modal |
| `src/components/dashboard/coach/ClientRoster.tsx` | Modify | Add click handler |
| Database migration | Create | `client_documents` table + storage bucket |

## Security (RLS Policies)

### client_documents table:
- Coaches can INSERT, SELECT, UPDATE, DELETE all documents
- Clients can SELECT their own documents only

### Storage bucket:
- Coaches can upload to any client folder
- Clients can read their own folder only
