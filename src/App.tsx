import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import Index from "./pages/Index";
import TripDetail from "./pages/TripDetail";
import NotFound from "./pages/NotFound";
import AuthPage from "./pages/AuthPage";
import { seedDemoData } from "./lib/sampleData";
import { getSession, setSession, clearSession } from "./lib/storage";
import type { User } from "./lib/types";

const queryClient = new QueryClient();

// Apply saved theme on initial load (before React renders)
const savedTheme = localStorage.getItem('app-theme');
if (savedTheme === 'light') {
  document.documentElement.classList.add('light');
} else {
  document.documentElement.classList.remove('light');
}

function TripDetailRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/trip/${id}/docs`} replace />;
}

const App = () => {
  const [user, setUser] = useState<User | null>(() => getSession());

  useEffect(() => { if (user) seedDemoData(); }, [user]);

  function handleAuthenticated(u: User) {
    setSession(u);
    setUser(u);
  }

  function handleLogout() {
    clearSession();
    setUser(null);
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          {/* id="glass-app" activates global glass CSS overrides */}
          <div id="glass-app" className="h-full">
            {!user ? (
              <AuthPage onAuthenticated={handleAuthenticated} />
            ) : (
              <Routes>
                <Route path="/" element={<Index user={user} onLogout={handleLogout} />} />
                <Route path="/trip/:id" element={<TripDetailRedirect />} />
                <Route path="/trip/:id/:tab" element={<TripDetail />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            )}
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
