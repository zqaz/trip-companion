import { useState, useEffect } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { saveExpense, getMembers, getBaseCurrency } from '@/lib/storage';
import { CURRENCIES, CURRENCY_SYMBOLS, convertToBase } from '@/lib/currencies';
import type { Currency, ExpenseCategory, Expense, TripMember } from '@/lib/types';
import { cn } from '@/lib/utils';

const CATEGORIES: { value: ExpenseCategory; label: string; emoji: string }[] = [
  { value: 'food', label: 'Food', emoji: '🍽️' },
  { value: 'transport', label: 'Transport', emoji: '🚗' },
  { value: 'stay', label: 'Stay', emoji: '🏨' },
  { value: 'shopping', label: 'Shopping', emoji: '🛍️' },
  { value: 'activities', label: 'Activities', emoji: '🗺️' },
  { value: 'misc', label: 'Misc', emoji: '📦' },
];

type SplitMode = 'equal' | 'custom' | 'percentage';
type PaidMode = 'single' | 'multi';

interface Props {
  tripId: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function AddExpenseModal({ tripId, onClose, onSaved }: Props) {
  const members = getMembers(tripId);
  const baseCurrency = getBaseCurrency(tripId);

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>(baseCurrency);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [category, setCategory] = useState<ExpenseCategory>('food');
  const [notes, setNotes] = useState('');
  const [useManualRate, setUseManualRate] = useState(false);
  const [manualRate, setManualRate] = useState('');

  // Paid by — single or multi
  const [paidMode, setPaidMode] = useState<PaidMode>('single');
  const [paidById, setPaidById] = useState(members[0]?.id ?? '');
  const [paidAmounts, setPaidAmounts] = useState<Record<string, string>>({});

  // Split
  const [splitMode, setSplitMode] = useState<SplitMode>('equal');
  const [splitWith, setSplitWith] = useState<string[]>(members.map(m => m.id));
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [percentages, setPercentages] = useState<Record<string, string>>({});

  const numAmount = parseFloat(amount) || 0;
  const { converted, rate } = convertToBase(numAmount, currency, baseCurrency, useManualRate && manualRate ? parseFloat(manualRate) : undefined);

  // Init equal percentages when splitWith changes
  useEffect(() => {
    if (splitWith.length === 0) return;
    const eqPct = (100 / splitWith.length).toFixed(1);
    const pct: Record<string, string> = {};
    splitWith.forEach(id => { pct[id] = eqPct; });
    setPercentages(pct);
  }, [splitWith.join(',')]);

  // Computed splits
  const computedSplits = (() => {
    if (splitWith.length === 0) return [];
    if (splitMode === 'equal') {
      const each = converted / splitWith.length;
      return splitWith.map(id => ({ memberId: id, amount: each }));
    }
    if (splitMode === 'custom') {
      return splitWith.map(id => ({ memberId: id, amount: parseFloat(customAmounts[id] || '0') }));
    }
    // percentage
    return splitWith.map(id => {
      const pct = parseFloat(percentages[id] || '0') / 100;
      return { memberId: id, amount: converted * pct };
    });
  })();

  const splitTotal = computedSplits.reduce((s, x) => s + x.amount, 0);
  const splitDiff = Math.abs(splitTotal - converted);
  const splitBalanced = splitDiff < 0.01;

  // Multi-paid
  const paidTotalMulti = Object.values(paidAmounts).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const paidBalancedMulti = Math.abs(paidTotalMulti - converted) < 0.01;

  function handleSave() {
    if (!title.trim() || numAmount <= 0) return;
    if (splitMode !== 'equal' && !splitBalanced) return;
    if (paidMode === 'multi' && !paidBalancedMulti) return;

    // Build paidById for single (use first paid-by member with amount, or fallback)
    const effectivePaidById = paidMode === 'single' ? paidById : (
      Object.entries(paidAmounts).find(([, v]) => parseFloat(v) > 0)?.[0] ?? paidById
    );

    const expense: Expense = {
      id: `exp-${Date.now()}`,
      tripId,
      title: title.trim(),
      amount: numAmount,
      currency,
      baseCurrency,
      convertedAmount: converted,
      rateUsed: rate,
      category,
      paidById: effectivePaidById,
      splits: computedSplits,
      notes: notes.trim() || undefined,
      date: new Date().toISOString().split('T')[0],
      useManualRate,
    };
    saveExpense(expense);
    onSaved();
  }

  const isValid = title.trim() && numAmount > 0 &&
    (splitMode === 'equal' || splitBalanced) &&
    (paidMode === 'single' || paidBalancedMulti) &&
    splitWith.length > 0;

  function toggleSplitMember(id: string) {
    setSplitWith(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-mobile bg-card rounded-t-3xl px-5 pb-10 pt-5 animate-slide-up max-h-[92vh] overflow-y-auto scrollbar-hide">
        <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-5" />
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-foreground font-black text-xl">Add Expense 💸</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <Label className="text-foreground/70 text-xs uppercase tracking-wider mb-2 block">Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Dinner at Bistro" className="bg-muted border-border" />
          </div>

          {/* Amount + Currency pill */}
          <div>
            <Label className="text-foreground/70 text-xs uppercase tracking-wider mb-2 block">Amount</Label>
            <div className="flex gap-2">
              {/* Currency pill */}
              <div className="relative">
                <button
                  onClick={() => setShowCurrencyPicker(p => !p)}
                  className="h-10 px-3 bg-muted border border-border rounded-xl flex items-center gap-1 text-sm font-bold text-foreground hover:bg-muted/80 transition-colors"
                >
                  <span>{CURRENCY_SYMBOLS[currency]}</span>
                  <span>{currency}</span>
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                </button>
                {showCurrencyPicker && (
                  <div className="absolute top-full mt-1 left-0 z-[70] bg-card border border-border rounded-2xl shadow-xl overflow-hidden w-32">
                    {CURRENCIES.map(c => (
                      <button
                        key={c}
                        onMouseDown={e => { e.preventDefault(); setCurrency(c); setShowCurrencyPicker(false); }}
                        className={cn('w-full px-3 py-2 text-left text-sm font-semibold hover:bg-muted transition-colors', currency === c ? 'text-primary' : 'text-foreground')}
                      >
                        {CURRENCY_SYMBOLS[c]} {c}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="bg-muted border-border flex-1"
              />
            </div>
            {currency !== baseCurrency && numAmount > 0 && (
              <div className="mt-2 px-3 py-2 bg-muted rounded-xl">
                <p className="text-muted-foreground text-xs">
                  ≈ <span className="text-foreground font-bold">{CURRENCY_SYMBOLS[baseCurrency]}{converted.toFixed(2)} {baseCurrency}</span>
                  {' '}at rate 1 {currency} = {rate} {baseCurrency}
                </p>
              </div>
            )}
          </div>

          {/* Manual rate override */}
          {currency !== baseCurrency && (
            <div className="flex items-center justify-between bg-muted rounded-xl px-4 py-3">
              <div>
                <p className="text-foreground text-sm font-semibold">Manual Rate Override</p>
                <p className="text-muted-foreground text-xs">Set your own exchange rate</p>
              </div>
              <button
                onClick={() => setUseManualRate(r => !r)}
                className={cn('w-11 h-6 rounded-full transition-colors relative', useManualRate ? 'bg-primary' : 'bg-border')}
              >
                <span className={cn('absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow', useManualRate ? 'left-[22px]' : 'left-0.5')} />
              </button>
            </div>
          )}
          {useManualRate && currency !== baseCurrency && (
            <div>
              <Label className="text-foreground/70 text-xs uppercase tracking-wider mb-2 block">Rate (1 {currency} = ? {baseCurrency})</Label>
              <Input type="number" value={manualRate} onChange={e => setManualRate(e.target.value)} placeholder={`e.g. ${rate}`} className="bg-muted border-border" />
            </div>
          )}

          {/* Category */}
          <div>
            <Label className="text-foreground/70 text-xs uppercase tracking-wider mb-2 block">Category</Label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={cn('py-2 rounded-xl text-sm font-bold flex flex-col items-center gap-0.5 transition-all', category === cat.value ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground')}
                >
                  <span>{cat.emoji}</span>
                  <span className="text-xs">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── PAID BY ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-foreground/70 text-xs uppercase tracking-wider">Paid By</Label>
              {/* Mode toggle */}
              <div className="flex bg-muted rounded-lg p-0.5">
                {(['single', 'multi'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setPaidMode(m)}
                    className={cn('px-2.5 py-1 rounded-md text-[10px] font-bold transition-all', paidMode === m ? 'bg-card text-foreground shadow' : 'text-muted-foreground')}
                  >
                    {m === 'single' ? 'One Person' : 'Multiple'}
                  </button>
                ))}
              </div>
            </div>

            {paidMode === 'single' ? (
              <div className="flex gap-2 flex-wrap">
                {members.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setPaidById(m.id)}
                    className={cn('flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all', paidById === m.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}
                  >
                    {m.emoji} {m.name}
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-muted-foreground text-xs">Enter how much each person paid (must total {CURRENCY_SYMBOLS[baseCurrency]}{converted.toFixed(2)})</p>
                {members.map(m => (
                  <div key={m.id} className="flex items-center gap-2">
                    <span className="text-lg w-7">{m.emoji}</span>
                    <span className="text-sm text-foreground flex-1">{m.name}</span>
                    <div className="flex items-center gap-1 bg-muted border border-border rounded-xl px-2 py-1 w-24">
                      <span className="text-xs text-muted-foreground">{CURRENCY_SYMBOLS[baseCurrency]}</span>
                      <input
                        type="number"
                        value={paidAmounts[m.id] || ''}
                        onChange={e => setPaidAmounts(prev => ({ ...prev, [m.id]: e.target.value }))}
                        placeholder="0.00"
                        className="bg-transparent text-xs text-foreground w-full focus:outline-none"
                      />
                    </div>
                  </div>
                ))}
                <div className={cn('text-xs font-semibold mt-1', paidBalancedMulti ? 'text-secondary' : 'text-destructive')}>
                  Total: {CURRENCY_SYMBOLS[baseCurrency]}{paidTotalMulti.toFixed(2)} / {CURRENCY_SYMBOLS[baseCurrency]}{converted.toFixed(2)}
                  {paidBalancedMulti ? ' ✓' : ` (${paidTotalMulti > converted ? '+' : ''}${(paidTotalMulti - converted).toFixed(2)})`}
                </div>
              </div>
            )}
          </div>

          {/* ── SPLIT WITH ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-foreground/70 text-xs uppercase tracking-wider">Split With</Label>
              {/* Split mode tabs */}
              <div className="flex bg-muted rounded-lg p-0.5">
                {(['equal', 'custom', 'percentage'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setSplitMode(m)}
                    className={cn('px-2 py-1 rounded-md text-[10px] font-bold capitalize transition-all', splitMode === m ? 'bg-card text-foreground shadow' : 'text-muted-foreground')}
                  >
                    {m === 'equal' ? 'Equal' : m === 'custom' ? 'Custom' : '%'}
                  </button>
                ))}
              </div>
            </div>

            {splitMode === 'equal' && (
              <>
                <div className="flex gap-2 flex-wrap">
                  {members.map(m => {
                    const isChecked = splitWith.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        onClick={() => toggleSplitMember(m.id)}
                        className={cn('flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all', isChecked ? 'bg-secondary/30 text-secondary' : 'bg-muted text-muted-foreground')}
                      >
                        {m.emoji} {m.name}
                      </button>
                    );
                  })}
                </div>
                {splitWith.length > 0 && numAmount > 0 && (
                  <p className="text-muted-foreground text-xs mt-2">Each pays: <span className="text-foreground font-bold">{CURRENCY_SYMBOLS[baseCurrency]}{(converted / splitWith.length).toFixed(2)}</span> {baseCurrency}</p>
                )}
              </>
            )}

            {splitMode === 'custom' && (
              <div className="space-y-2">
                <p className="text-muted-foreground text-xs">Enter custom amounts (must total {CURRENCY_SYMBOLS[baseCurrency]}{converted.toFixed(2)})</p>
                {members.map(m => {
                  const isIn = splitWith.includes(m.id);
                  return (
                    <div key={m.id} className="flex items-center gap-2">
                      <button
                        onClick={() => toggleSplitMember(m.id)}
                        className={cn('text-lg w-7 opacity-100 transition-opacity', !isIn && 'opacity-30')}
                      >
                        {m.emoji}
                      </button>
                      <span className={cn('text-sm flex-1 transition-colors', isIn ? 'text-foreground' : 'text-muted-foreground')}>{m.name}</span>
                      {isIn ? (
                        <div className="flex items-center gap-1 bg-muted border border-border rounded-xl px-2 py-1 w-24">
                          <span className="text-xs text-muted-foreground">{CURRENCY_SYMBOLS[baseCurrency]}</span>
                          <input
                            type="number"
                            value={customAmounts[m.id] || ''}
                            onChange={e => setCustomAmounts(prev => ({ ...prev, [m.id]: e.target.value }))}
                            placeholder="0.00"
                            className="bg-transparent text-xs text-foreground w-full focus:outline-none"
                          />
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground w-24 text-right pr-2">—</span>
                      )}
                    </div>
                  );
                })}
                <div className={cn('text-xs font-semibold', splitBalanced ? 'text-secondary' : 'text-destructive')}>
                  Total: {CURRENCY_SYMBOLS[baseCurrency]}{splitTotal.toFixed(2)} / {CURRENCY_SYMBOLS[baseCurrency]}{converted.toFixed(2)}
                  {splitBalanced ? ' ✓' : ` (${splitTotal > converted ? '+' : ''}${(splitTotal - converted).toFixed(2)})`}
                </div>
                {/* Balance bar */}
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', splitBalanced ? 'bg-secondary' : splitTotal > converted ? 'bg-destructive' : 'bg-primary')}
                    style={{ width: `${Math.min((splitTotal / (converted || 1)) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}

            {splitMode === 'percentage' && (
              <div className="space-y-2">
                <p className="text-muted-foreground text-xs">Set percentage for each person (must total 100%)</p>
                {members.map(m => {
                  const isIn = splitWith.includes(m.id);
                  const pct = parseFloat(percentages[m.id] || '0');
                  const amtFromPct = converted * pct / 100;
                  return (
                    <div key={m.id} className="flex items-center gap-2">
                      <button
                        onClick={() => toggleSplitMember(m.id)}
                        className={cn('text-lg w-7 transition-opacity', !isIn && 'opacity-30')}
                      >
                        {m.emoji}
                      </button>
                      <span className={cn('text-sm flex-1', isIn ? 'text-foreground' : 'text-muted-foreground')}>{m.name}</span>
                      {isIn ? (
                        <>
                          <div className="flex items-center gap-1 bg-muted border border-border rounded-xl px-2 py-1 w-16">
                            <input
                              type="number"
                              value={percentages[m.id] || ''}
                              onChange={e => setPercentages(prev => ({ ...prev, [m.id]: e.target.value }))}
                              placeholder="0"
                              className="bg-transparent text-xs text-foreground w-full focus:outline-none"
                            />
                            <span className="text-xs text-muted-foreground">%</span>
                          </div>
                          <span className="text-xs text-muted-foreground w-16 text-right">{CURRENCY_SYMBOLS[baseCurrency]}{amtFromPct.toFixed(2)}</span>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground w-16 text-right pr-2">—</span>
                      )}
                    </div>
                  );
                })}
                {(() => {
                  const totalPct = splitWith.reduce((s, id) => s + parseFloat(percentages[id] || '0'), 0);
                  const balanced = Math.abs(totalPct - 100) < 0.1;
                  return (
                    <div className={cn('text-xs font-semibold', balanced ? 'text-secondary' : 'text-destructive')}>
                      Total: {totalPct.toFixed(1)}% {balanced ? '✓' : `(need ${(100 - totalPct).toFixed(1)}% more)`}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <Label className="text-foreground/70 text-xs uppercase tracking-wider mb-2 block">Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes..." className="bg-muted border-border resize-none" rows={2} />
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={!isValid}
          className="w-full mt-6 h-12 rounded-2xl font-bold text-base border-0 gradient-hero text-white"
        >
          Save Expense ✅
        </Button>
      </div>
    </div>
  );
}
