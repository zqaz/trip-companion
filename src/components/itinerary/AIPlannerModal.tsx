import { useState } from 'react';
import { X, Sparkles, Loader2, Key, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { saveItineraryItem, getItinerary, setItinerary } from '@/lib/storage';
import type { ItineraryItem, ItineraryCategory } from '@/lib/types';
import { cn } from '@/lib/utils';

interface Props {
  tripId: string;
  destination: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  onClose: () => void;
  onGenerated: () => void;
}

interface GeneratedItem {
  time: string;
  place: string;
  activity: string;
  category: ItineraryCategory;
  notes?: string;
  day: number;
  selected: boolean;
}

const GEMINI_KEY_STORAGE = 'gemini_api_key_enc';
const ENC_PREFIX = 'enc:';

// Simple obfuscation using base64 + XOR with a static key (not cryptographically secure,
// but prevents casual reading of the key from localStorage / DevTools)
const OBFUSCATION_KEY = 'WanderVault2024!';

function xorObfuscate(input: string, key: string): string {
  return Array.from(input)
    .map((ch, i) => String.fromCharCode(ch.charCodeAt(0) ^ key.charCodeAt(i % key.length)))
    .join('');
}

function encryptKey(plainKey: string): string {
  const xored = xorObfuscate(plainKey, OBFUSCATION_KEY);
  return ENC_PREFIX + btoa(xored);
}

function decryptKey(stored: string): string {
  if (!stored.startsWith(ENC_PREFIX)) return stored; // legacy plain key
  const b64 = stored.slice(ENC_PREFIX.length);
  const xored = atob(b64);
  return xorObfuscate(xored, OBFUSCATION_KEY);
}

function getGeminiKey(): string {
  const stored = localStorage.getItem(GEMINI_KEY_STORAGE) || '';
  if (!stored) return '';
  return decryptKey(stored);
}

function setGeminiKey(key: string) {
  localStorage.setItem(GEMINI_KEY_STORAGE, encryptKey(key));
}

export default function AIPlannerModal({ tripId, destination, startDate, endDate, totalDays, onClose, onGenerated }: Props) {
  const [step, setStep] = useState<'config' | 'generating' | 'review'>('config');
  const [apiKey, setApiKey] = useState(getGeminiKey());
  const [preferences, setPreferences] = useState('');
  const [selectedDays, setSelectedDays] = useState<number[]>(
    Array.from({ length: totalDays }, (_, i) => i + 1)
  );
  const [generatedItems, setGeneratedItems] = useState<GeneratedItem[]>([]);
  const [error, setError] = useState('');
  const [style, setStyle] = useState<'balanced' | 'packed' | 'relaxed'>('balanced');

  const toggleDay = (day: number) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  async function handleGenerate() {
    if (!apiKey.trim()) {
      setError('Please enter your Gemini API key');
      return;
    }
    setGeminiKey(apiKey.trim());
    setError('');
    setStep('generating');

    const prompt = `You are a travel itinerary planner. Generate a detailed day-by-day itinerary for a trip to ${destination} from ${startDate} to ${endDate}.

Plan for days: ${selectedDays.join(', ')} (out of ${totalDays} total days).
Travel style: ${style} (${style === 'packed' ? '6-8 activities per day' : style === 'relaxed' ? '3-4 activities per day' : '4-6 activities per day'}).
${preferences ? `User preferences: ${preferences}` : ''}

For each activity, provide:
- day (number, starting from 1)
- time (24h format like "09:00", "14:30")
- place (specific place name)
- activity (short description of what to do)
- category (one of: travel, hotel, sightseeing, food, shopping)
- notes (optional helpful tip, 1 sentence max)

Return ONLY a valid JSON array of objects with these fields. No markdown, no explanation, just the JSON array.
Example: [{"day":1,"time":"09:00","place":"CDG Airport","activity":"Arrive & clear customs","category":"travel","notes":"Have passport ready"},...]`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey.trim()}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.8,
              maxOutputTokens: 4096,
              responseMimeType: 'application/json',
            },
          }),
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `API error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('No response from Gemini');

      const parsed: any[] = JSON.parse(text);
      const items: GeneratedItem[] = parsed.map(item => ({
        day: Number(item.day),
        time: String(item.time || '10:00'),
        place: String(item.place || 'Unknown'),
        activity: String(item.activity || ''),
        category: (['travel', 'hotel', 'sightseeing', 'food', 'shopping'].includes(item.category) ? item.category : 'sightseeing') as ItineraryCategory,
        notes: item.notes ? String(item.notes) : undefined,
        selected: true,
      }));

      setGeneratedItems(items);
      setStep('review');
    } catch (err: any) {
      setError(err.message || 'Failed to generate itinerary');
      setStep('config');
    }
  }

  function handleSave() {
    const toSave = generatedItems.filter(g => g.selected);
    const existing = getItinerary(tripId);

    toSave.forEach((item, idx) => {
      const itinItem: ItineraryItem = {
        id: `ai-itin-${Date.now()}-${idx}`,
        tripId,
        day: item.day,
        time: item.time,
        place: item.place,
        activity: item.activity || undefined,
        category: item.category,
        notes: item.notes || undefined,
        order: existing.filter(e => e.day === item.day).length + idx,
      };
      saveItineraryItem(itinItem);
    });

    onGenerated();
  }

  const toggleItem = (idx: number) => {
    setGeneratedItems(prev =>
      prev.map((item, i) => i === idx ? { ...item, selected: !item.selected } : item)
    );
  };

  const selectAll = () => setGeneratedItems(prev => prev.map(i => ({ ...i, selected: true })));
  const deselectAll = () => setGeneratedItems(prev => prev.map(i => ({ ...i, selected: false })));

  const CAT_EMOJI: Record<string, string> = {
    travel: '🚗', hotel: '🏨', sightseeing: '🗺️', food: '🍽️', shopping: '🛍️',
  };

  const groupedByDay = generatedItems.reduce<Record<number, GeneratedItem[]>>((acc, item, idx) => {
    if (!acc[item.day]) acc[item.day] = [];
    acc[item.day].push({ ...item, selected: generatedItems[idx].selected });
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-mobile bg-card rounded-t-3xl px-5 pb-10 pt-5 animate-slide-up max-h-[92vh] overflow-y-auto scrollbar-hide">
        <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-5" />

        {step === 'config' && (
          <>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-foreground font-black text-xl flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-gold" /> AI Planner
              </h2>
              <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>

            <div className="space-y-4">
              {/* API Key */}
              <div>
                <Label className="text-foreground/70 text-xs uppercase tracking-wider mb-2 block flex items-center gap-1.5">
                  <Key className="w-3 h-3" /> Gemini API Key
                </Label>
                <Input
                  type="password"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="AIza..."
                  className="bg-muted border-border font-mono text-xs"
                />
                <p className="text-muted-foreground text-[10px] mt-1">
                  Stored locally in your browser only. Get one free at{' '}
                  <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" className="text-primary underline">
                    aistudio.google.com
                  </a>
                </p>
              </div>

              {/* Travel style */}
              <div>
                <Label className="text-foreground/70 text-xs uppercase tracking-wider mb-2 block">Travel Style</Label>
                <div className="flex gap-2">
                  {(['relaxed', 'balanced', 'packed'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setStyle(s)}
                      className={cn(
                        'flex-1 py-2.5 rounded-xl text-xs font-bold transition-all capitalize',
                        style === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {s === 'relaxed' ? '🧘' : s === 'balanced' ? '⚖️' : '🏃'} {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Days to plan */}
              <div>
                <Label className="text-foreground/70 text-xs uppercase tracking-wider mb-2 block">Days to Plan</Label>
                <div className="flex gap-2 flex-wrap">
                  {Array.from({ length: totalDays }, (_, i) => i + 1).map(day => (
                    <button
                      key={day}
                      onClick={() => toggleDay(day)}
                      className={cn(
                        'w-10 h-10 rounded-xl text-xs font-bold transition-all',
                        selectedDays.includes(day) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preferences */}
              <div>
                <Label className="text-foreground/70 text-xs uppercase tracking-wider mb-2 block">
                  Preferences <span className="normal-case text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Textarea
                  value={preferences}
                  onChange={e => setPreferences(e.target.value)}
                  placeholder="e.g. Focus on food & art, avoid touristy spots, budget-friendly..."
                  className="bg-muted border-border resize-none"
                  rows={3}
                />
              </div>

              {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3">
                  <p className="text-destructive text-xs font-semibold">{error}</p>
                </div>
              )}
            </div>

            <Button
              onClick={handleGenerate}
              disabled={!apiKey.trim() || selectedDays.length === 0}
              className="w-full mt-6 h-12 rounded-2xl font-bold text-base border-0 gradient-hero text-white"
            >
              <Sparkles className="w-4 h-4 mr-2" /> Generate Itinerary
            </Button>
          </>
        )}

        {step === 'generating' && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="relative">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <Sparkles className="w-5 h-5 text-gold absolute -top-1 -right-1 animate-pulse" />
            </div>
            <p className="text-foreground font-bold mt-4">Planning your trip...</p>
            <p className="text-muted-foreground text-sm mt-1">AI is crafting your {destination} itinerary</p>
          </div>
        )}

        {step === 'review' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-foreground font-black text-lg flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-gold" /> AI Suggestions
              </h2>
              <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>

            <div className="flex gap-2 mb-4">
              <button onClick={selectAll} className="px-3 py-1.5 rounded-xl text-xs font-bold bg-primary/20 text-primary">
                Select All
              </button>
              <button onClick={deselectAll} className="px-3 py-1.5 rounded-xl text-xs font-bold bg-muted text-muted-foreground">
                Deselect All
              </button>
              <span className="ml-auto text-xs text-muted-foreground self-center">
                {generatedItems.filter(i => i.selected).length}/{generatedItems.length} selected
              </span>
            </div>

            <div className="space-y-4 max-h-[55vh] overflow-y-auto scrollbar-hide">
              {Object.entries(groupedByDay)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([day, items]) => (
                  <div key={day}>
                    <p className="text-foreground/60 text-xs font-bold mb-2 sticky top-0 bg-card py-1">
                      📅 Day {day}
                    </p>
                    <div className="space-y-2">
                      {items.map((item) => {
                        const globalIdx = generatedItems.findIndex(
                          g => g.day === item.day && g.time === item.time && g.place === item.place
                        );
                        return (
                          <button
                            key={globalIdx}
                            onClick={() => toggleItem(globalIdx)}
                            className={cn(
                              'w-full text-left p-3 rounded-2xl border transition-all flex gap-3',
                              item.selected
                                ? 'bg-primary/5 border-primary/30'
                                : 'bg-muted/50 border-border opacity-50'
                            )}
                          >
                            <div className={cn(
                              'w-5 h-5 rounded-lg border-2 flex items-center justify-center flex-shrink-0 mt-0.5',
                              item.selected ? 'bg-primary border-primary' : 'border-muted-foreground'
                            )}>
                              {item.selected && <Check className="w-3 h-3 text-primary-foreground" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-foreground">{item.time}</span>
                                <span className="text-sm">{CAT_EMOJI[item.category]}</span>
                                <span className="text-foreground font-bold text-sm truncate">{item.activity}</span>
                              </div>
                              <p className="text-muted-foreground text-xs mt-0.5">📍 {item.place}</p>
                              {item.notes && <p className="text-muted-foreground text-[10px] mt-0.5 italic">"{item.notes}"</p>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
            </div>

            <Button
              onClick={handleSave}
              disabled={generatedItems.filter(i => i.selected).length === 0}
              className="w-full mt-4 h-12 rounded-2xl font-bold text-base border-0 gradient-hero text-white"
            >
              <Check className="w-4 h-4 mr-2" /> Add {generatedItems.filter(i => i.selected).length} Items to Itinerary
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
