import { useState } from 'react';
import { Plus, MapPin, Grip } from 'lucide-react';
import { getItinerary, saveItineraryItem, deleteItineraryItem, setItinerary } from '@/lib/storage';
import { parseISO, differenceInDays, addDays, format } from 'date-fns';
import type { ItineraryItem, ItineraryCategory } from '@/lib/types';
import AddItineraryModal from './AddItineraryModal';
import { cn } from '@/lib/utils';

const CAT_CONFIG: Record<ItineraryCategory, { emoji: string; color: string; label: string }> = {
  travel: { emoji: '🚗', color: 'text-secondary bg-secondary/20', label: 'Travel' },
  hotel: { emoji: '🏨', color: 'text-purple bg-purple/20', label: 'Hotel' },
  sightseeing: { emoji: '🗺️', color: 'text-teal bg-teal/20', label: 'Sightseeing' },
  food: { emoji: '🍽️', color: 'text-gold bg-gold/20', label: 'Food' },
  shopping: { emoji: '🛍️', color: 'text-pink bg-pink/20', label: 'Shopping' },
};

interface Props {
  tripId: string;
  startDate: string;
  endDate: string;
}

export default function ItineraryTab({ tripId, startDate, endDate }: Props) {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  const totalDays = differenceInDays(end, start) + 1;
  const days = Array.from({ length: totalDays }, (_, i) => i + 1);

  const [selectedDay, setSelectedDay] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [, setRefresh] = useState(0);

  const allItems = getItinerary(tripId);
  const dayItems = allItems
    .filter(i => i.day === selectedDay)
    .sort((a, b) => a.order - b.order || a.time.localeCompare(b.time));

  const dayDate = addDays(start, selectedDay - 1);
  const placePins = [...new Set(dayItems.map(i => i.place))];

  function handleDelete(id: string) {
    deleteItineraryItem(tripId, id);
    setRefresh(r => r + 1);
  }

  // Simple drag-reorder
  function handleDragStart(e: React.DragEvent, idx: number) {
    e.dataTransfer.setData('idx', String(idx));
  }

  function handleDrop(e: React.DragEvent, targetIdx: number) {
    const fromIdx = parseInt(e.dataTransfer.getData('idx'));
    if (fromIdx === targetIdx) return;
    const reordered = [...dayItems];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(targetIdx, 0, moved);
    const updated = reordered.map((item, i) => ({ ...item, order: i }));
    const otherItems = allItems.filter(i => i.day !== selectedDay);
    setItinerary(tripId, [...otherItems, ...updated]);
    setRefresh(r => r + 1);
    setDragOverIdx(null);
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Day tabs */}
      <div className="px-4 pt-2 pb-3 flex-shrink-0">
        <h3 className="text-foreground font-black text-lg mb-3">Itinerary</h3>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {days.map(day => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={cn(
                'flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition-all',
                selectedDay === day
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              <span className="block">Day {day}</span>
              <span className="block text-[10px] opacity-70">{format(addDays(start, day - 1), 'MMM d')}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-4 space-y-3">
        <div className="text-foreground/50 text-xs font-semibold mb-2">
          📅 {format(dayDate, 'EEEE, MMMM d')}
        </div>

        {dayItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-muted-foreground text-sm">No plans for Day {selectedDay} yet</p>
          </div>
        ) : (
          dayItems.map((item, idx) => (
            <div
              key={item.id}
              draggable
              onDragStart={e => handleDragStart(e, idx)}
              onDragOver={e => { e.preventDefault(); setDragOverIdx(idx); }}
              onDrop={e => handleDrop(e, idx)}
              onDragLeave={() => setDragOverIdx(null)}
              className={cn(
                'bg-card border border-border rounded-2xl p-4 animate-fade-in flex gap-3 card-shadow transition-all',
                dragOverIdx === idx && 'ring-2 ring-primary'
              )}
            >
              {/* Time column */}
              <div className="flex-shrink-0 w-12 text-center">
                <p className="text-foreground font-black text-xs">{item.time}</p>
                <div className="w-px h-full bg-border mx-auto mt-1" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0', CAT_CONFIG[item.category].color)}>
                    {CAT_CONFIG[item.category].emoji}
                  </div>
                  <div className="flex-1">
                    <p className="text-foreground font-bold text-sm leading-tight">{item.activity}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <p className="text-muted-foreground text-xs">{item.place}</p>
                    </div>
                    {item.notes && <p className="text-muted-foreground text-xs mt-1 italic">"{item.notes}"</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Grip className="w-4 h-4 text-muted-foreground cursor-grab" />
                    <button onClick={() => handleDelete(item.id)} className="text-xs text-destructive/60 hover:text-destructive">✕</button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}

        {/* Map pins placeholder */}
        {placePins.length > 0 && (
          <div className="bg-muted/50 border border-border rounded-2xl p-4 mt-4">
            <p className="text-muted-foreground text-xs font-bold mb-2">📍 Places for Day {selectedDay}</p>
            <div className="space-y-1">
              {placePins.map(place => (
                <div key={place} className="flex items-center gap-2">
                  <MapPin className="w-3 h-3 text-primary flex-shrink-0" />
                  <p className="text-foreground text-sm">{place}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add button */}
      <div className="px-4 pb-4 pt-2 flex-shrink-0">
        <button
          onClick={() => setShowAdd(true)}
          className="w-full py-3.5 rounded-2xl gradient-hero text-white font-bold text-sm flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add to Day {selectedDay}
        </button>
      </div>

      {showAdd && (
        <AddItineraryModal
          tripId={tripId}
          day={selectedDay}
          onClose={() => setShowAdd(false)}
          onSaved={() => { setRefresh(r => r + 1); setShowAdd(false); }}
        />
      )}
    </div>
  );
}
