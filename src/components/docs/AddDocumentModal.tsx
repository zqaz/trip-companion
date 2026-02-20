import { useState } from 'react';
import { X } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { saveDocument } from '@/lib/storage';
import type { TravelDocument, DocumentType, DocumentCategory } from '@/lib/types';

const DOC_TYPES: { value: DocumentType; label: string; emoji: string; category: DocumentCategory }[] = [
  { value: 'passport', label: 'Passport', emoji: '🛂', category: 'docs' },
  { value: 'visa', label: 'Visa', emoji: '📋', category: 'docs' },
  { value: 'flight', label: 'Flight Ticket', emoji: '✈️', category: 'tickets' },
  { value: 'hotel', label: 'Hotel Booking', emoji: '🏨', category: 'stays' },
  { value: 'insurance', label: 'Travel Insurance', emoji: '🛡️', category: 'docs' },
  { value: 'id', label: 'ID Card', emoji: '🪪', category: 'docs' },
  { value: 'other', label: 'Other', emoji: '📄', category: 'other' },
];

interface Props {
  tripId: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function AddDocumentModal({ tripId, onClose, onSaved }: Props) {
  const [type, setType] = useState<DocumentType>('passport');
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState<Date | undefined>();
  const [hasReminder, setHasReminder] = useState(false);
  const [notes, setNotes] = useState('');

  function handleSave() {
    if (!name.trim()) return;
    const selectedType = DOC_TYPES.find(d => d.value === type)!;
    const doc: TravelDocument = {
      id: `doc-${Date.now()}`,
      tripId,
      type,
      category: selectedType.category,
      name: name.trim(),
      number: number.trim(),
      expiryDate: expiryDate ? format(expiryDate, 'yyyy-MM-dd') : undefined,
      notes: notes.trim() || undefined,
      hasReminder,
      createdAt: new Date().toISOString(),
    };
    saveDocument(doc);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-mobile bg-card rounded-t-3xl px-5 pb-10 pt-5 animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-5" />
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-foreground font-black text-xl">Add Document 📄</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        <div className="space-y-4">
          {/* Type selector */}
          <div>
            <Label className="text-foreground/70 text-xs uppercase tracking-wider mb-2 block">Document Type</Label>
            <div className="grid grid-cols-2 gap-2">
              {DOC_TYPES.map(dt => (
                <button
                  key={dt.value}
                  onClick={() => setType(dt.value)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold border transition-all',
                    type === dt.value
                      ? 'bg-primary/20 border-primary text-primary'
                      : 'bg-muted border-transparent text-muted-foreground'
                  )}
                >
                  <span>{dt.emoji}</span> {dt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-foreground/70 text-xs uppercase tracking-wider mb-2 block">Document Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. My Passport" className="bg-muted border-border" />
          </div>

          <div>
            <Label className="text-foreground/70 text-xs uppercase tracking-wider mb-2 block">Number / PNR / Booking ID</Label>
            <Input value={number} onChange={e => setNumber(e.target.value)} placeholder="e.g. P12345678" className="bg-muted border-border" />
          </div>

          <div>
            <Label className="text-foreground/70 text-xs uppercase tracking-wider mb-2 block">Expiry / Travel Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn('w-full justify-start bg-muted border-border', !expiryDate && 'text-muted-foreground')}>
                  <CalendarIcon className="w-3.5 h-3.5 mr-2" />
                  {expiryDate ? format(expiryDate, 'MMM d, yyyy') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-card border-border z-[60]" align="start">
                <Calendar mode="single" selected={expiryDate} onSelect={setExpiryDate} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex items-center justify-between bg-muted rounded-xl px-4 py-3">
            <div>
              <p className="text-foreground text-sm font-semibold">Expiry Reminder</p>
              <p className="text-muted-foreground text-xs">Get notified before expiry</p>
            </div>
            <button
              onClick={() => setHasReminder(r => !r)}
              className={cn('w-11 h-6 rounded-full transition-colors relative', hasReminder ? 'bg-primary' : 'bg-border')}
            >
              <span className={cn('absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow', hasReminder ? 'left-[22px]' : 'left-0.5')} />
            </button>
          </div>

          <div>
            <Label className="text-foreground/70 text-xs uppercase tracking-wider mb-2 block">Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any notes..." className="bg-muted border-border resize-none" rows={3} />
          </div>

          {/* Photo placeholder */}
          <div className="border-2 border-dashed border-border rounded-xl p-6 text-center">
            <p className="text-2xl mb-2">📸</p>
            <p className="text-muted-foreground text-sm font-semibold">Attach Photo / PDF</p>
            <p className="text-muted-foreground text-xs mt-1">Coming soon — storage feature</p>
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={!name.trim()}
          className="w-full mt-6 h-12 rounded-2xl font-bold text-base border-0 gradient-hero text-white"
        >
          Save Document ✅
        </Button>
      </div>
    </div>
  );
}
