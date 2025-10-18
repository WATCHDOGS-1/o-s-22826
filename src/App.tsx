import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Home from "./pages/Home";
import StudyRoom from "./pages/StudyRoom";
import Leaderboard from "./pages/Leaderboard";
import Profile from "./pages/Profile";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import Footer from "./components/Footer";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="flex flex-col min-h-screen">
          <div className="flex-1">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/home" element={<Home />} />
              <Route path="/study/:roomId" element={<StudyRoom />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
          <Footer />
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
