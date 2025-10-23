# AI Rules for OnlyFocus Application

This document outlines the core technologies used in the OnlyFocus application and provides guidelines for using specific libraries.

## Tech Stack Overview

*   **React**: The primary JavaScript library for building the user interface.
*   **TypeScript**: Used for type safety and improved code quality across the entire codebase.
*   **Tailwind CSS**: A utility-first CSS framework for styling components, ensuring a consistent and responsive design.
*   **shadcn/ui**: A collection of beautifully designed, accessible, and customizable UI components built with Radix UI and Tailwind CSS.
*   **React Router**: For declarative routing within the application.
*   **Supabase**: The backend-as-a-service platform providing authentication, real-time database, and storage functionalities.
*   **WebRTC**: For real-time communication, enabling video/audio streams and screen sharing in study rooms.
*   **Zod**: A TypeScript-first schema declaration and validation library, primarily used for form validation.
*   **React Query**: For managing server state, data fetching, caching, and synchronization.
*   **Lucide React**: A library providing a set of beautiful and customizable open-source icons.
*   **Radix UI**: The unstyled component primitives that shadcn/ui is built upon, ensuring accessibility and robust functionality.

## Library Usage Rules

To maintain consistency and leverage the strengths of each library, please adhere to the following guidelines:

*   **UI Components**: Always use components from `shadcn/ui` (e.g., `Button`, `Input`, `Card`, `Dialog`, `Sheet`, `Progress`, `ScrollArea`) for all standard user interface elements. If a specific component is not available in `shadcn/ui`, create a new component following the existing styling conventions.
*   **Styling**: Exclusively use **Tailwind CSS** classes for all styling. Avoid writing custom CSS or inline styles unless absolutely necessary for dynamic, calculated values.
*   **Routing**: Use **React Router** (`react-router-dom`) for all navigation and route management within the application.
*   **State Management**:
    *   For **server state** (data fetched from Supabase), use **React Query**.
    *   For **local component state**, use React's built-in `useState` and `useReducer` hooks.
*   **Authentication, Database & Realtime**: All interactions with the backend (user authentication, database queries, real-time subscriptions) must be done using the **Supabase client** (`@/integrations/supabase/client`).
*   **Real-time Communication**: For video, audio, and screen sharing functionalities, utilize the existing **WebRTCManager** (`src/lib/webrtc.ts`).
*   **Icons**: Use icons from **Lucide React**.
*   **Form Validation**: Implement schema validation for forms using **Zod**.
*   **Notifications**: For user feedback and notifications, use the `useToast` hook from `@/hooks/use-toast.ts`.