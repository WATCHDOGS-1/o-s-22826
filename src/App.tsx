import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import React from "react";
import { UserProvider } from "./hooks/useUser";

const App = () => (
  <TooltipProvider>
    <UserProvider>
      {/* Using Sonner for toasts as requested in the FocusTimer component */}
      <Sonner /> 
      <Toaster />
      <Index />
    </UserProvider>
  </TooltipProvider>
);

export default App;