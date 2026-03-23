import { useState } from 'react';
import { Plus, MapPin, Grip, FileText, Ticket, Pencil, Trash2, Sparkles } from 'lucide-react';
import { getItinerary, saveItineraryItem, deleteItineraryItem, setItinerary, getDocuments } from '@/lib/storage';
import { parseISO, differenceInDays, addDays, format } from 'date-fns';
import type { ItineraryItem, ItineraryCategory } from '@/lib/types';
import AddItineraryModal from './AddItineraryModal';
import AIPlannerModal from './AIPlannerModal';
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
  destination: string;
  startDate: string;
  endDate: string;
}

export default function ItineraryTab({ tripId, destination, startDate, endDate }: Props) {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  const totalDays = differenceInDays(end, start) + 1;
  const days = Array.from({ length: totalDays }, (_, i) => i + 1);

  const [selectedDay, setSelectedDay] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [editItem, setEditItem] = useState<ItineraryItem | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [, setRefresh] = useState(0);

  const allItems = getItinerary(tripId);
  const dayItems = allItems
    .filter(i => i.day === selectedDay)
    .sort((a, b) => a.order - b.order || a.time.localeCompare(b.time));

  const dayDate = addDays(start, selectedDay - 1);
  const dayDateStr = format(dayDate, 'yyyy-MM-dd');
  const placePins = [...new Set(dayItems.map(i => i.place))];

  // Documents whose travel/expiry date matches this day
  const allDocs = getDocuments(tripId);
  const docsForDay = allDocs.filter(d => d.expiryDate === dayDateStr);

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
          dayItems.map((item, idx) => {
            const isConfirming = confirmDeleteId === item.id;
            return (
              <div
                key={item.id}
                draggable={!isConfirming}
                onDragStart={e => handleDragStart(e, idx)}
                onDragOver={e => { e.preventDefault(); setDragOverIdx(idx); }}
                onDrop={e => handleDrop(e, idx)}
                onDragLeave={() => setDragOverIdx(null)}
                className={cn(
                  'bg-card border border-border rounded-2xl animate-fade-in card-shadow transition-all overflow-hidden',
                  dragOverIdx === idx && 'ring-2 ring-primary'
                )}
              >
                {/* Main content row */}
                <div className="p-4 flex gap-3">
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
                        {item.activity && (
                          <p className="text-foreground font-bold text-sm leading-tight">{item.activity}</p>
                        )}
                        <div className="flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          <p className="text-muted-foreground text-xs">{item.place}</p>
                        </div>
                        {item.ticketPrice != null && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <Ticket className="w-3 h-3 text-gold flex-shrink-0" />
                            <p className="text-gold text-xs font-semibold">${item.ticketPrice.toFixed(2)}</p>
                          </div>
                        )}
                        {item.notes && <p className="text-muted-foreground text-xs mt-1 italic">"{item.notes}"</p>}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Grip className="w-4 h-4 text-muted-foreground cursor-grab" />
                        <button
                          onClick={() => setEditItem(item)}
                          className="p-1 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          aria-label="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(isConfirming ? null : item.id)}
                          className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          aria-label="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Inline delete confirm */}
                {isConfirming && (
                  <div className="px-4 pb-3 pt-0 flex items-center justify-between gap-3 border-t border-border/40">
                    <p className="text-xs text-foreground/70 flex-1">Remove this item?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-muted text-muted-foreground"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => { handleDelete(item.id); setConfirmDeleteId(null); }}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-destructive text-white"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Map pins */}
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

        {/* Documents needed today */}
        {docsForDay.length > 0 && (
          <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 mt-2">
            <p className="text-primary text-xs font-bold mb-2 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Documents for Reference
            </p>
            <ul className="space-y-1">
              {docsForDay.map(doc => (
                <li key={doc.id} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                  <p className="text-foreground text-sm">{doc.name}</p>
                  {doc.number && <span className="text-muted-foreground text-xs">· {doc.number}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="px-4 pb-4 pt-2 flex-shrink-0 flex gap-2">
        <button
          onClick={() => setShowAI(true)}
          className="flex-1 py-3.5 rounded-2xl bg-gold/20 text-gold font-bold text-sm flex items-center justify-center gap-2 border border-gold/30"
        >
          <Sparkles className="w-4 h-4" /> AI Plan
        </button>
        <button
          onClick={() => setShowAdd(true)}
          className="flex-1 py-3.5 rounded-2xl gradient-hero text-white font-bold text-sm flex items-center justify-center gap-2"
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
      {editItem && (
        <AddItineraryModal
          tripId={tripId}
          day={editItem.day}
          itemToEdit={editItem}
          onClose={() => setEditItem(null)}
          onSaved={() => { setRefresh(r => r + 1); setEditItem(null); }}
        />
      )}
      {showAI && (
        <AIPlannerModal
          tripId={tripId}
          destination={destination}
          startDate={startDate}
          endDate={endDate}
          totalDays={totalDays}
          onClose={() => setShowAI(false)}
          onGenerated={() => { setRefresh(r => r + 1); setShowAI(false); }}
        />
      )}
    </div>
  );
}
