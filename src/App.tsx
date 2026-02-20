import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { useEffect } from "react";
import Index from "./pages/Index";
import TripDetail from "./pages/TripDetail";
import NotFound from "./pages/NotFound";
import { seedDemoData } from "./lib/sampleData";

const queryClient = new QueryClient();

function AppInit({ children }: { children: React.ReactNode }) {
  useEffect(() => { seedDemoData(); }, []);
  return <>{children}</>;
}

function TripDetailRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/trip/${id}/docs`} replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppInit>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/trip/:id" element={<TripDetailRedirect />} />
            <Route path="/trip/:id/:tab" element={<TripDetail />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppInit>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
