import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import React from "react";

const App = () => (
  <TooltipProvider>
    {/* Using Sonner for toasts as requested in the FocusTimer component */}
    <Sonner /> 
    <Toaster />
    <Index />
  </TooltipProvider>
);

export default App;