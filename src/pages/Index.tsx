import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MapPin, FileText, DollarSign, Map, Package, Plane, Trash2, Sun, Moon, LogOut } from 'lucide-react';
import { getTrips, getDocuments, getExpenses, getPackingList, getItinerary, deleteTrip } from '@/lib/storage';
import { formatCurrency } from '@/lib/currencies';
import { useTheme } from '@/hooks/useTheme';
import type { User } from '@/lib/types';
import { differenceInDays, format, isAfter, isBefore, parseISO } from 'date-fns';
import NewTripModal from '@/components/trips/NewTripModal';
import type { Trip } from '@/lib/types';

const COVER_GRADIENTS: Record<string, string> = {
  coral: 'from-primary to-pink',
  teal: 'from-secondary to-teal-light',
  purple: 'from-purple to-primary',
  gold: 'from-gold to-coral',
};

function getTripStatus(trip: Trip): 'upcoming' | 'active' | 'past' {
  const now = new Date();
  const start = parseISO(trip.startDate);
  const end = parseISO(trip.endDate);
  if (isAfter(start, now)) return 'upcoming';
  if (isBefore(end, now)) return 'past';
  return 'active';
}

function CountdownBadge({ trip }: { trip: Trip }) {
  const now = new Date();
  const start = parseISO(trip.startDate);
  const status = getTripStatus(trip);
  if (status === 'past') return <span className="text-xs text-muted-foreground">Trip completed</span>;
  if (status === 'active') return <span className="text-xs font-bold text-secondary">🟢 Happening now!</span>;
  const days = differenceInDays(start, now);
  return <span className="text-xs font-semibold text-foreground/70">{days} days to go ✈️</span>;
}

interface Props { user: User; onLogout: () => void; }

export default function Index({ user, onLogout }: Props) {
  const navigate = useNavigate();
  const { theme, toggle: toggleTheme } = useTheme();
  const [showNewTrip, setShowNewTrip] = useState(false);
  const [, setRefresh] = useState(0);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function handleDeleteTrip(id: string) {
    deleteTrip(id);
    setConfirmDeleteId(null);
    setRefresh(r => r + 1);
  }

  const trips = getTrips();
  const activeTrip = trips.find(t => getTripStatus(t) === 'active') || trips.find(t => getTripStatus(t) === 'upcoming') || trips[0];

  const activeDocs = activeTrip ? getDocuments(activeTrip.id).length : 0;
  const activeExpenses = activeTrip ? getExpenses(activeTrip.id) : [];
  const totalSpent = activeExpenses.reduce((sum, e) => sum + e.convertedAmount, 0);
  const packingItems = activeTrip ? getPackingList(activeTrip.id) : [];
  const packingPct = packingItems.length ? Math.round((packingItems.filter(i => i.isPacked).length / packingItems.length) * 100) : 0;
  const todayItems = activeTrip ? getItinerary(activeTrip.id).filter(i => {
    const tripStart = parseISO(activeTrip.startDate);
    const today = new Date();
    const day = differenceInDays(today, tripStart) + 1;
    return i.day === day;
  }) : [];

  function handleTripCreated() {
    setRefresh(r => r + 1);
    setShowNewTrip(false);
  }

  return (
    <div className="flex items-start justify-center min-h-screen">
      <div className="w-full max-w-mobile flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-12 pb-4 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl gradient-hero flex items-center justify-center">
                <Plane className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-black text-foreground tracking-tight">WanderVault</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 pl-10">Hey, {user.name.split(' ')[0]} 👋</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-xl glass-card flex items-center justify-center text-foreground/70 hover:text-foreground transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {/* Logout */}
            <button
              onClick={onLogout}
              className="w-9 h-9 rounded-xl glass-card flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto scrollbar-hide px-5 pb-8">

          {/* Active Trip Hero Card */}
          {activeTrip ? (
            <div
              className={`rounded-2xl p-5 mb-4 bg-gradient-to-br ${COVER_GRADIENTS[activeTrip.coverColor] || COVER_GRADIENTS.coral} cursor-pointer active:scale-[0.98] transition-transform card-shadow`}
              onClick={() => navigate(`/trip/${activeTrip.id}`)}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-white/70 text-xs font-medium uppercase tracking-wider">Active Trip</p>
                  <h2 className="text-white text-2xl font-black mt-1 leading-tight">{activeTrip.name}</h2>
                  <div className="flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3 text-white/80" />
                    <span className="text-white/80 text-sm">{activeTrip.destination}</span>
                  </div>
                </div>
                <span className="text-4xl">{activeTrip.emoji}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-white/70 text-xs">
                  {format(parseISO(activeTrip.startDate), 'MMM d')} – {format(parseISO(activeTrip.endDate), 'MMM d, yyyy')}
                </div>
                <CountdownBadge trip={activeTrip} />
              </div>
            </div>
          ) : (
            <div className="rounded-2xl p-5 mb-4 border border-dashed border-border text-center">
              <p className="text-muted-foreground text-sm">No trips yet — add one below!</p>
            </div>
          )}

          {/* Quick Summary Row */}
          {activeTrip && (
            <div className="grid grid-cols-4 gap-2 mb-5">
              <div className="bg-card rounded-xl p-3 text-center card-shadow">
                <FileText className="w-4 h-4 text-primary mx-auto mb-1" />
                <p className="text-foreground font-bold text-base leading-none">{activeDocs}</p>
                <p className="text-muted-foreground text-[10px] mt-1">Docs</p>
              </div>
              <div className="bg-card rounded-xl p-3 text-center card-shadow">
                <DollarSign className="w-4 h-4 text-secondary mx-auto mb-1" />
                <p className="text-foreground font-bold text-base leading-none">${totalSpent.toFixed(0)}</p>
                <p className="text-muted-foreground text-[10px] mt-1">Spent</p>
              </div>
              <div className="bg-card rounded-xl p-3 text-center card-shadow">
                <Map className="w-4 h-4 text-gold mx-auto mb-1" />
                <p className="text-foreground font-bold text-base leading-none">{todayItems.length}</p>
                <p className="text-muted-foreground text-[10px] mt-1">Today</p>
              </div>
              <div className="bg-card rounded-xl p-3 text-center card-shadow">
                <Package className="w-4 h-4 text-purple mx-auto mb-1" />
                <p className="text-foreground font-bold text-base leading-none">{packingPct}%</p>
                <p className="text-muted-foreground text-[10px] mt-1">Packed</p>
              </div>
            </div>
          )}

          {/* My Trips Section */}
          <div className="mb-4">
            <h3 className="text-foreground font-bold text-base mb-3">My Trips</h3>
            {trips.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center">
                <p className="text-4xl mb-3">🌍</p>
                <p className="text-foreground font-semibold">No trips yet</p>
                <p className="text-muted-foreground text-sm mt-1">Tap the + button to plan your first adventure!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {trips.map(trip => {
                  const status = getTripStatus(trip);
                  const isConfirming = confirmDeleteId === trip.id;
                  return (
                    <div key={trip.id} className="bg-card rounded-2xl card-shadow border border-border overflow-hidden">
                      {/* Main row */}
                      <div
                        className="p-4 flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-transform"
                        onClick={() => { if (!isConfirming) navigate(`/trip/${trip.id}`); }}
                      >
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${COVER_GRADIENTS[trip.coverColor] || COVER_GRADIENTS.coral} flex items-center justify-center flex-shrink-0`}>
                          <span className="text-2xl">{trip.emoji}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground font-bold text-sm truncate">{trip.name}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                            <p className="text-muted-foreground text-xs truncate">{trip.destination}</p>
                          </div>
                          <p className="text-muted-foreground text-xs mt-0.5">
                            {format(parseISO(trip.startDate), 'MMM d')} – {format(parseISO(trip.endDate), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <StatusBadge status={status} />
                        <button
                          onClick={e => { e.stopPropagation(); setConfirmDeleteId(isConfirming ? null : trip.id); }}
                          className="ml-1 p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
                          aria-label="Delete trip"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Inline confirm banner */}
                      {isConfirming && (
                        <div className="px-4 pb-4 flex items-center justify-between gap-3 border-t border-border/50 pt-3">
                          <p className="text-sm text-foreground/80 flex-1">
                            Delete <span className="font-bold">{trip.name}</span> and all its data?
                          </p>
                          <div className="flex gap-2 flex-shrink-0">
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-muted text-muted-foreground"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleDeleteTrip(trip.id)}
                              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-destructive text-white"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Floating Action Button */}
        <div className="flex-shrink-0 flex justify-end px-5 pb-8 pt-2">
          <button
            onClick={() => setShowNewTrip(true)}
            className="w-14 h-14 rounded-full gradient-hero shadow-lg flex items-center justify-center active:scale-95 transition-transform"
            style={{ boxShadow: '0 8px 32px hsl(16 90% 60% / 0.5)' }}
          >
            <Plus className="w-7 h-7 text-white" />
          </button>
        </div>

        {showNewTrip && (
          <NewTripModal
            onClose={() => setShowNewTrip(false)}
            onCreated={handleTripCreated}
          />
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: 'upcoming' | 'active' | 'past' }) {
  if (status === 'active') return (
    <span className="text-xs font-bold px-2 py-1 rounded-full bg-secondary/20 text-secondary flex-shrink-0">Active</span>
  );
  if (status === 'upcoming') return (
    <span className="text-xs font-bold px-2 py-1 rounded-full bg-primary/20 text-primary flex-shrink-0">Soon</span>
  );
  return (
    <span className="text-xs font-bold px-2 py-1 rounded-full bg-muted text-muted-foreground flex-shrink-0">Done</span>
  );
}
