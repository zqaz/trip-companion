import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { saveItineraryItem, getItinerary } from '@/lib/storage';
import type { ItineraryItem, ItineraryCategory } from '@/lib/types';
import { cn } from '@/lib/utils';

const CATEGORIES: { value: ItineraryCategory; label: string; emoji: string }[] = [
  { value: 'travel', label: 'Travel', emoji: '🚗' },
  { value: 'hotel', label: 'Hotel', emoji: '🏨' },
  { value: 'sightseeing', label: 'Sightseeing', emoji: '🗺️' },
  { value: 'food', label: 'Food', emoji: '🍽️' },
  { value: 'shopping', label: 'Shopping', emoji: '🛍️' },
];

interface Props {
  tripId: string;
  day: number;
  onClose: () => void;
  onSaved: () => void;
}

export default function AddItineraryModal({ tripId, day, onClose, onSaved }: Props) {
  const [time, setTime] = useState('10:00');
  const [place, setPlace] = useState('');
  const [activity, setActivity] = useState('');
  const [category, setCategory] = useState<ItineraryCategory>('sightseeing');
  const [notes, setNotes] = useState('');

  function handleSave() {
    if (!place.trim() || !activity.trim()) return;
    const existing = getItinerary(tripId).filter(i => i.day === day);
    const item: ItineraryItem = {
      id: `itin-${Date.now()}`,
      tripId,
      day,
      time,
      place: place.trim(),
      activity: activity.trim(),
      category,
      notes: notes.trim() || undefined,
      order: existing.length,
    };
    saveItineraryItem(item);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-mobile bg-card rounded-t-3xl px-5 pb-10 pt-5 animate-slide-up max-h-[90vh] overflow-y-auto scrollbar-hide">
        <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-5" />
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-foreground font-black text-xl">Add to Day {day} 📋</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        <div className="space-y-4">
          {/* Category */}
          <div>
            <Label className="text-foreground/70 text-xs uppercase tracking-wider mb-2 block">Category</Label>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={cn(
                    'flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all',
                    category === cat.value ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                  )}
                >
                  {cat.emoji} {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-foreground/70 text-xs uppercase tracking-wider mb-2 block">Time</Label>
            <Input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              className="bg-muted border-border"
            />
          </div>

          <div>
            <Label className="text-foreground/70 text-xs uppercase tracking-wider mb-2 block">Place / Location</Label>
            <Input value={place} onChange={e => setPlace(e.target.value)} placeholder="e.g. Louvre Museum" className="bg-muted border-border" />
          </div>

          <div>
            <Label className="text-foreground/70 text-xs uppercase tracking-wider mb-2 block">Activity Description</Label>
            <Input value={activity} onChange={e => setActivity(e.target.value)} placeholder="e.g. Visit the Mona Lisa" className="bg-muted border-border" />
          </div>

          <div>
            <Label className="text-foreground/70 text-xs uppercase tracking-wider mb-2 block">Notes (optional)</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any tips or notes..." className="bg-muted border-border resize-none" rows={3} />
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={!place.trim() || !activity.trim()}
          className="w-full mt-6 h-12 rounded-2xl font-bold text-base border-0 gradient-hero text-white"
        >
          Add to Itinerary ✅
        </Button>
      </div>
    </div>
  );
}
