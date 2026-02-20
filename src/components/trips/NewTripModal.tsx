import { useState } from 'react';
import { X } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { saveTrip } from '@/lib/storage';
import type { Trip } from '@/lib/types';
import { CalendarIcon } from 'lucide-react';

const COVER_OPTIONS = [
  { value: 'coral', label: '🌅 Sunset', gradient: 'from-primary to-pink' },
  { value: 'teal', label: '🌊 Ocean', gradient: 'from-secondary to-teal-light' },
  { value: 'purple', label: '🌌 Night', gradient: 'from-purple to-primary' },
  { value: 'gold', label: '🏜️ Desert', gradient: 'from-gold to-coral' },
];

const EMOJIS = ['✈️', '🗼', '🏖️', '🏔️', '🌴', '🗺️', '🏯', '🚂', '🚢', '⛩️'];

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export default function NewTripModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [emoji, setEmoji] = useState('✈️');
  const [coverColor, setCoverColor] = useState('coral');

  function handleCreate() {
    if (!name.trim() || !destination.trim() || !startDate || !endDate) return;
    const trip: Trip = {
      id: `trip-${Date.now()}`,
      name: name.trim(),
      destination: destination.trim(),
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
      emoji,
      coverColor,
      createdAt: new Date().toISOString(),
    };
    saveTrip(trip);
    onCreated();
  }

  const isValid = name.trim() && destination.trim() && startDate && endDate;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-mobile bg-card rounded-t-3xl px-5 pb-10 pt-5 animate-slide-up">
        {/* Handle */}
        <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-5" />

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-foreground font-black text-xl">New Trip ✈️</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Emoji picker */}
          <div>
            <Label className="text-foreground/70 text-xs uppercase tracking-wider mb-2 block">Trip Emoji</Label>
            <div className="flex gap-2 flex-wrap">
              {EMOJIS.map(e => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={cn(
                    'w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all',
                    emoji === e ? 'bg-primary/30 ring-2 ring-primary' : 'bg-muted'
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <Label className="text-foreground/70 text-xs uppercase tracking-wider mb-2 block">Trip Name</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Paris Summer Escape"
              className="bg-muted border-border text-foreground"
            />
          </div>

          {/* Destination */}
          <div>
            <Label className="text-foreground/70 text-xs uppercase tracking-wider mb-2 block">Destination</Label>
            <Input
              value={destination}
              onChange={e => setDestination(e.target.value)}
              placeholder="e.g. Paris, France"
              className="bg-muted border-border text-foreground"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-foreground/70 text-xs uppercase tracking-wider mb-2 block">Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full justify-start bg-muted border-border', !startDate && 'text-muted-foreground')}>
                    <CalendarIcon className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                    {startDate ? format(startDate, 'MMM d') : 'Pick date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-card border-border z-[60]" align="start">
                  <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label className="text-foreground/70 text-xs uppercase tracking-wider mb-2 block">End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full justify-start bg-muted border-border', !endDate && 'text-muted-foreground')}>
                    <CalendarIcon className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                    {endDate ? format(endDate, 'MMM d') : 'Pick date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-card border-border z-[60]" align="start">
                  <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Cover color */}
          <div>
            <Label className="text-foreground/70 text-xs uppercase tracking-wider mb-2 block">Cover Theme</Label>
            <div className="flex gap-2">
              {COVER_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setCoverColor(opt.value)}
                  className={cn(
                    'flex-1 h-12 rounded-xl bg-gradient-to-br transition-all text-white text-xs font-bold',
                    opt.gradient,
                    coverColor === opt.value ? 'ring-2 ring-white ring-offset-2 ring-offset-card' : 'opacity-70'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <Button
          onClick={handleCreate}
          disabled={!isValid}
          className="w-full mt-6 h-12 rounded-2xl gradient-hero text-white font-bold text-base border-0"
          style={{ background: isValid ? 'var(--gradient-hero)' : undefined }}
        >
          Create Trip 🚀
        </Button>
      </div>
    </div>
  );
}
