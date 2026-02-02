
# Add AI Chatbot to Client Dashboard

## Overview
Add an AI-powered golf performance assistant chatbot to the client dashboard. The chatbot will help clients with questions about their workouts, exercises, nutrition, golf performance, and training tips. It will be accessible via a floating chat button that appears on all tabs.

## Implementation Approach

### Design Decision: Floating Chat Button vs. New Tab
I recommend a **floating chat button** approach rather than a new tab because:
- Clients can access the AI assistant from any screen without navigating away
- It feels more like a helpful assistant that's always available
- Doesn't clutter the navigation (already 6 tabs)
- Better mobile UX

The button will appear in the bottom-right corner (above the mobile nav) and open a slide-up chat panel.

---

## Components to Create

### 1. Backend: AI Chat Edge Function
**New File: `supabase/functions/ai-chat/index.ts`**

- Uses Lovable AI gateway (no API key needed from user)
- Streaming responses for real-time typing effect
- Golf performance-focused system prompt
- Handles conversation context (sends full history)

System prompt will include:
- Golf performance expertise
- Knowledge of strength training, mobility, power development
- Ability to explain exercises and provide form tips
- Encouraging, coach-like personality

### 2. Frontend: AI Chat Component
**New File: `src/components/ai-chat/AIChatBot.tsx`**

Features:
- Floating action button (bottom-right corner)
- Expandable chat panel with smooth animation
- Message history with user/assistant styling
- Real-time streaming response display
- Loading states and error handling
- Markdown rendering for formatted responses
- Persists conversation during session (state-based, not DB)

### 3. Frontend: Chat Message Component
**New File: `src/components/ai-chat/ChatMessage.tsx`**

- Renders individual messages
- Supports markdown formatting
- Different styling for user vs AI messages
- Timestamp display

### 4. Frontend: Chat Hook
**New File: `src/hooks/useAIChat.ts`**

- Manages chat state
- Handles streaming responses
- Error handling and retry logic

---

## Integration

### Update Client Dashboard
**File: `src/components/dashboard/ClientDashboard.tsx`**

- Import and render AIChatBot component
- Position above mobile navigation
- Available on all tabs

---

## Technical Details

### Edge Function Structure
```text
POST /ai-chat
Body: { messages: [{ role: "user"|"assistant", content: string }] }
Response: SSE stream with tokens
```

### Streaming Implementation
- Edge function proxies to Lovable AI gateway
- Frontend parses SSE events line-by-line
- Updates UI token-by-token for smooth typing effect

### UI Behavior
- Button shows a chat icon with subtle pulse animation
- Click opens chat panel (slides up on mobile, expands on desktop)
- Close button or click outside to collapse
- Maintains conversation history during session
- Welcome message on first open

---

## Files to Create
1. `supabase/functions/ai-chat/index.ts` - Edge function for AI responses
2. `src/components/ai-chat/AIChatBot.tsx` - Main chatbot component with floating button
3. `src/components/ai-chat/ChatMessage.tsx` - Individual message component
4. `src/hooks/useAIChat.ts` - Chat state and streaming logic

## Files to Modify
1. `src/components/dashboard/ClientDashboard.tsx` - Add AIChatBot component
2. `supabase/config.toml` - Register the new edge function

---

## User Experience Flow

```text
1. Client sees floating chat button (bottom-right)
           ↓
2. Clicks button → Chat panel opens with welcome message
           ↓
3. Types question → Sends to edge function
           ↓
4. AI responds with streaming text (typing effect)
           ↓
5. Client continues conversation or closes panel
```

---

## Example Interactions

The AI will be able to help with:
- "What muscles does the deadlift target?"
- "How can I improve my golf swing power?"
- "What should I eat before a workout?"
- "I'm feeling sore, should I still train today?"
- "Explain the tempo notation 3-1-2-0"
- "What's a good warm-up routine?"
