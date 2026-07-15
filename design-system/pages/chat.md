# Page Override — ChatView (mobile)

Deviates from MASTER for mobile chat stack.

## Routes (URL-driven)
- `/chat` → ConversationList (full screen on xs)
- `/chat/:id` → MessageThread (full screen on xs; back to /chat)
- `/chat/:id/contact` → ChatContactPanel (full screen on xs; back to /chat/:id)

## App bar on xs
- ConversationList: title "Tin nhắn"
- MessageThread: back arrow + conversation name + contact icon (pushes to /chat/:id/contact)
- ChatContactPanel: back arrow + contact name

## Message composer
- Pinned to bottom of MessageThread on xs, respecting `env(safe-area-inset-bottom)`
- Send button ≥44px hit area

## Contact panel actions (Orders, Appointments)
- Each action opens as fullscreen ResponsiveDialog on xs