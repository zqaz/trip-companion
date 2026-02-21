import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { getPackingList, savePackingItem, deletePackingItem } from '@/lib/storage';
import { getOOTD, saveOOTDEntry, deleteOOTDEntry } from '@/lib/storage';
import { parseISO, differenceInDays, addDays, format } from 'date-fns';
import type { PackingItem, PackingCategory, OOTDEntry } from '@/lib/types';
import { Progress } from '@/components/ui/progress';
import ImageUpload from '@/components/ui/ImageUpload';
import { cn } from '@/lib/utils';

const PACKING_CATS: { value: PackingCategory; label: string; emoji: string }[] = [
  { value: 'clothes', label: 'Clothes', emoji: '👕' },
  { value: 'toiletries', label: 'Toiletries', emoji: '🧴' },
  { value: 'electronics', label: 'Electronics', emoji: '🔌' },
  { value: 'documents', label: 'Documents', emoji: '📄' },
  { value: 'medicines', label: 'Medicines', emoji: '💊' },
  { value: 'accessories', label: 'Accessories', emoji: '🕶️' },
];

interface Props {
  tripId: string;
  startDate: string;
  endDate: string;
}

export default function PackingTab({ tripId, startDate, endDate }: Props) {
  const [subTab, setSubTab] = useState<'packing' | 'ootd'>('packing');
  const [, setRefresh] = useState(0);

  const start = parseISO(startDate);
  const end = parseISO(endDate);
  const totalDays = differenceInDays(end, start) + 1;
  const days = Array.from({ length: totalDays }, (_, i) => i + 1);

  const items = getPackingList(tripId);
  const packedCount = items.filter(i => i.isPacked).length;
  const pct = items.length ? Math.round((packedCount / items.length) * 100) : 0;

  function refresh() { setRefresh(r => r + 1); }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header + sub-tabs */}
      <div className="px-4 pt-2 pb-3 flex-shrink-0">
        <h3 className="text-foreground font-black text-lg mb-3">Packing & OOTD</h3>
        <div className="flex gap-1 bg-muted p-1 rounded-xl">
          {(['packing', 'ootd'] as const).map(t => (
            <button
              key={t}
              onClick={() => setSubTab(t)}
              className={cn('flex-1 py-1.5 rounded-lg text-xs font-bold capitalize transition-all', subTab === t ? 'bg-card text-foreground shadow' : 'text-muted-foreground')}
            >
              {t === 'packing' ? '🧳 Packing' : '👗 OOTD'}
            </button>
          ))}
        </div>
      </div>

      {subTab === 'packing' ? (
        <PackingChecklist tripId={tripId} items={items} packedCount={packedCount} pct={pct} onRefresh={refresh} />
      ) : (
        <OOTDPlanner tripId={tripId} days={days} start={start} onRefresh={refresh} />
      )}
    </div>
  );
}

function PackingChecklist({ tripId, items, packedCount, pct, onRefresh }: {
  tripId: string; items: PackingItem[]; packedCount: number; pct: number; onRefresh: () => void;
}) {
  const [addingCat, setAddingCat] = useState<PackingCategory | null>(null);
  const [newItemName, setNewItemName] = useState('');

  function toggleItem(item: PackingItem) {
    savePackingItem({ ...item, isPacked: !item.isPacked });
    onRefresh();
  }

  function addItem(cat: PackingCategory) {
    if (!newItemName.trim()) return;
    const newItem: PackingItem = {
      id: `pack-${Date.now()}`,
      tripId,
      category: cat,
      name: newItemName.trim(),
      isPacked: false,
      isCustom: true,
    };
    savePackingItem(newItem);
    setNewItemName('');
    setAddingCat(null);
    onRefresh();
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Progress */}
      <div className="px-4 pb-3 flex-shrink-0">
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-foreground font-bold text-sm">Packing Progress</p>
            <p className="text-muted-foreground text-sm font-semibold">{packedCount} / {items.length} items</p>
          </div>
          <Progress value={pct} className="h-2" />
          <p className="text-muted-foreground text-xs mt-1">{pct}% packed 🧳</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-4 space-y-4">
        {PACKING_CATS.map(cat => {
          const catItems = items.filter(i => i.category === cat.value);
          const isAdding = addingCat === cat.value;
          return (
            <div key={cat.value} className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-4 py-3 flex items-center justify-between border-b border-border">
                <div className="flex items-center gap-2">
                  <span>{cat.emoji}</span>
                  <span className="text-foreground font-bold text-sm">{cat.label}</span>
                  <span className="text-muted-foreground text-xs">({catItems.filter(i => i.isPacked).length}/{catItems.length})</span>
                </div>
                <button onClick={() => setAddingCat(isAdding ? null : cat.value)} className="text-primary text-xs font-bold">
                  {isAdding ? 'Cancel' : '+ Add'}
                </button>
              </div>

              {catItems.map(item => (
                <div key={item.id} className="px-4 py-2.5 flex items-center gap-3 border-b border-border last:border-0">
                  <button
                    onClick={() => toggleItem(item)}
                    className={cn(
                      'w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all',
                      item.isPacked ? 'bg-secondary border-secondary' : 'border-border'
                    )}
                  >
                    {item.isPacked && <span className="text-white text-xs font-black">✓</span>}
                  </button>
                  <p className={cn('text-sm flex-1', item.isPacked ? 'line-through text-muted-foreground' : 'text-foreground')}>
                    {item.name}
                  </p>
                  {item.isCustom && (
                    <button onClick={() => { deletePackingItem(tripId, item.id); onRefresh(); }} className="text-destructive/50 hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}

              {isAdding && (
                <div className="px-4 py-3 flex gap-2">
                  <input
                    value={newItemName}
                    onChange={e => setNewItemName(e.target.value)}
                    placeholder="Item name..."
                    className="flex-1 bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    onKeyDown={e => e.key === 'Enter' && addItem(cat.value)}
                    autoFocus
                  />
                  <button onClick={() => addItem(cat.value)} className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold">Add</button>
                </div>
              )}

              {catItems.length === 0 && !isAdding && (
                <p className="px-4 py-3 text-muted-foreground text-xs">No items — tap + Add</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OOTDPlanner({ tripId, days, start, onRefresh }: {
  tripId: string; days: number[]; start: Date; onRefresh: () => void;
}) {
  const [addingDay, setAddingDay] = useState<number | null>(null);
  const [outfitName, setOutfitName] = useState('');
  const [description, setDescription] = useState('');
  const [photoRef, setPhotoRef] = useState<string | undefined>();

  const allOOTD = getOOTD(tripId);

  function saveOutfit(day: number) {
    if (!outfitName.trim()) return;
    const entry: OOTDEntry = {
      id: `ootd-${Date.now()}`,
      tripId,
      day,
      outfitName: outfitName.trim(),
      description: description.trim() || undefined,
      photoRef,
      createdAt: new Date().toISOString(),
    };
    saveOOTDEntry(entry);
    setOutfitName('');
    setDescription('');
    setPhotoRef(undefined);
    setAddingDay(null);
    onRefresh();
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-4 space-y-4">
      {days.map(day => {
        const dayOOTD = allOOTD.filter(o => o.day === day);
        const dayDate = addDays(start, day - 1);
        const isAdding = addingDay === day;

        return (
          <div key={day} className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between bg-muted/30">
              <div>
                <p className="text-foreground font-bold text-sm">Day {day}</p>
                <p className="text-muted-foreground text-xs">{format(dayDate, 'EEEE, MMM d')}</p>
              </div>
              <button onClick={() => setAddingDay(isAdding ? null : day)} className="text-primary text-xs font-bold">
                {isAdding ? 'Cancel' : '+ Add OOTD'}
              </button>
            </div>

            {dayOOTD.map(entry => (
              <div key={entry.id} className="px-4 py-3 border-t border-border">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-16 bg-muted rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden text-2xl">
                    {entry.photoRef && entry.photoRef.startsWith('data:image') ? (
                      <img src={entry.photoRef} alt={entry.outfitName} className="w-full h-full object-cover" />
                    ) : (
                      '👗'
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-foreground font-bold text-sm">{entry.outfitName}</p>
                    {entry.description && <p className="text-muted-foreground text-xs mt-1">{entry.description}</p>}
                  </div>
                  <button onClick={() => { deleteOOTDEntry(tripId, entry.id); onRefresh(); }} className="text-destructive/50 hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {dayOOTD.length === 0 && !isAdding && (
              <p className="px-4 py-3 text-muted-foreground text-xs border-t border-border">No outfit planned</p>
            )}

            {isAdding && (
              <div className="px-4 py-3 border-t border-border space-y-2">
                <input
                  value={outfitName}
                  onChange={e => setOutfitName(e.target.value)}
                  placeholder="Outfit name (e.g. Museum Day)"
                  className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                />
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Style notes, colors, etc..."
                  className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  rows={2}
                />
                <ImageUpload value={photoRef} onChange={setPhotoRef} />
                <button onClick={() => saveOutfit(day)} className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold">
                  Save Outfit ✨
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
