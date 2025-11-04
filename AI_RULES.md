# AI Editor Rules and Guidelines

This document outlines the technical stack and specific library usage rules for maintaining the **OnlyFocus** application.

## Tech Stack Overview

*   **Framework:** React (Functional Components, Hooks).
*   **Language:** TypeScript.
*   **Routing:** React Router DOM (Routes defined in `src/App.tsx`).
*   **Styling:** Tailwind CSS (Utility-first approach).
*   **UI Components:** shadcn/ui (Pre-built components based on Radix UI).
*   **Icons:** Lucide React.
*   **State Management:** Minimal, primarily using React Context (`src/contexts/UserContext.tsx`) and local component state.
*   **Backend/Database:** Supabase (Used for real-time presence, time tracking, and leaderboard).
*   **Notifications:** Custom `useToast` hook utilizing shadcn/ui's Toast components.
*   **Real-time/WebRTC:** Currently uses Supabase Presence for user tracking, but WebRTC/MediaStream APIs are used directly for video/audio handling in `VideoGrid.tsx`.

## Library Usage Rules

| Feature | Library/Tool | Specific Usage Rules |
| :--- | :--- | :--- |
| **UI Components** | `shadcn/ui` / `Radix UI` | Always use components imported from `@/components/ui/` (e.g., `Button`, `Input`, `Slider`). Do not modify these files directly; create new components if customization is needed. |
| **Styling** | `Tailwind CSS` | Use utility classes exclusively. Ensure designs are responsive. Custom styles (like `glow`, `glass`, `animate-float`) are defined in `src/index.css`. |
| **Icons** | `lucide-react` | Use for all visual icons. |
| **Routing** | `react-router-dom` | Use for all navigation. Keep main routes defined in `src/App.tsx`. |
| **Data Fetching/DB** | `Supabase` | Use the client exported from `@/integrations/supabase/client`. All database interactions (CRUD, RPC, Realtime/Presence) must use this client. |
| **User Session/Auth** | `UserContext` | Use `useUser()` from `@/contexts/UserContext` for accessing/setting the current `username` and handling `logout`. |
| **Notifications** | `useToast` | Use the `useToast` hook from `@/hooks/use-toast.ts` for all user feedback notifications. |
| **Time/Date** | `date-fns` | Use for any complex date manipulation or formatting (though currently minimal). |