import { useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, FileText, DollarSign, Map, Package } from 'lucide-react';
import { getTrip } from '@/lib/storage';
import DocumentsTab from '@/components/docs/DocumentsTab';
import ExpensesTab from '@/components/expenses/ExpensesTab';
import ItineraryTab from '@/components/itinerary/ItineraryTab';
import PackingTab from '@/components/packing/PackingTab';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'docs', label: 'Docs', icon: FileText, path: 'docs' },
  { id: 'expenses', label: 'Expenses', icon: DollarSign, path: 'expenses' },
  { id: 'itinerary', label: 'Plan', icon: Map, path: 'itinerary' },
  { id: 'packing', label: 'Packing', icon: Package, path: 'packing' },
] as const;

type TabId = typeof TABS[number]['id'];

export default function TripDetail() {
  const { id, tab } = useParams<{ id: string; tab?: string }>();
  const navigate = useNavigate();
  const activeTab: TabId = (tab as TabId) || 'docs';

  const trip = id ? getTrip(id) : undefined;

  useEffect(() => {
    if (!trip) navigate('/');
  }, [trip, navigate]);

  if (!trip) return null;

  function setTab(tabId: TabId) {
    navigate(`/trip/${id}/${tabId}`, { replace: true });
  }

  const COVER_GRADIENTS: Record<string, string> = {
    coral: 'from-primary to-pink',
    teal: 'from-secondary to-teal-light',
    purple: 'from-purple to-primary',
    gold: 'from-gold to-coral',
  };

  return (
    <div className="flex items-start justify-center h-full">
      <div className="w-full max-w-mobile h-full flex flex-col overflow-hidden">
        {/* Trip Header */}
        <div className={cn('flex-shrink-0 bg-gradient-to-r px-5 pt-12 pb-4', COVER_GRADIENTS[trip.coverColor] || COVER_GRADIENTS.coral)}>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1 text-white/80 text-sm mb-3 active:opacity-70"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{trip.emoji}</span>
            <div>
              <h1 className="text-white font-black text-xl leading-tight">{trip.name}</h1>
              <p className="text-white/80 text-xs mt-0.5">{trip.destination}</p>
            </div>
          </div>
        </div>

        {/* Tab content area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeTab === 'docs' && <DocumentsTab tripId={trip.id} startDate={trip.startDate} endDate={trip.endDate} />}
          {activeTab === 'expenses' && <ExpensesTab tripId={trip.id} />}
          {activeTab === 'itinerary' && <ItineraryTab tripId={trip.id} destination={trip.destination} startDate={trip.startDate} endDate={trip.endDate} />}
          {activeTab === 'packing' && <PackingTab tripId={trip.id} startDate={trip.startDate} endDate={trip.endDate} />}
        </div>

        {/* Bottom Tab Bar */}
        <div className="flex-shrink-0 bg-card border-t border-border px-2 pb-safe">
          <div className="flex">
            {TABS.map(t => {
              const Icon = t.icon;
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    'flex-1 flex flex-col items-center gap-1 py-3 transition-all',
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-bold">{t.label}</span>
                  {isActive && <div className="absolute bottom-0 w-1 h-1 rounded-full bg-primary" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
