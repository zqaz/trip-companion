import { useState, useEffect } from 'react';
import { X, ChevronDown, CalendarIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
  expenseToEdit?: Expense;
  onClose: () => void;
  onSaved: () => void;
}

export default function AddExpenseModal({ tripId, expenseToEdit, onClose, onSaved }: Props) {
  const isEditing = !!expenseToEdit;
  const members = getMembers(tripId);
  const baseCurrency = getBaseCurrency(tripId);

  // "Me" member is always included in splits but not shown as a toggleable option
  const youMember = members.find(m => m.isYou);
  const otherMembers = members.filter(m => !m.isYou);

  // Derive initial split mode from existing splits
  const derivedSplitMode = (): SplitMode => {
    if (!expenseToEdit || expenseToEdit.splits.length === 0) return 'equal';
    const first = expenseToEdit.splits[0].amount;
    return expenseToEdit.splits.every(s => Math.abs(s.amount - first) < 0.01) ? 'equal' : 'custom';
  };

  const [title, setTitle] = useState(expenseToEdit?.title ?? '');
  const [amount, setAmount] = useState(expenseToEdit?.amount.toString() ?? '');
  const [currency, setCurrency] = useState<Currency>(expenseToEdit?.currency ?? baseCurrency);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [category, setCategory] = useState<ExpenseCategory>(expenseToEdit?.category ?? 'food');
  const [notes, setNotes] = useState(expenseToEdit?.notes ?? '');
  const [useManualRate, setUseManualRate] = useState(expenseToEdit?.useManualRate ?? false);
  const [manualRate, setManualRate] = useState('');
  const [expenseDate, setExpenseDate] = useState<Date>(
    expenseToEdit ? parseISO(expenseToEdit.date) : new Date()
  );
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Paid by — single or multi (default to "Me" if present)
  const hasPaidAmounts = expenseToEdit?.paidAmounts && Object.keys(expenseToEdit.paidAmounts).length > 0;
  const [paidMode, setPaidMode] = useState<PaidMode>(hasPaidAmounts ? 'multi' : 'single');
  const [paidById, setPaidById] = useState(expenseToEdit?.paidById ?? youMember?.id ?? members[0]?.id ?? '');
  const [paidAmounts, setPaidAmounts] = useState<Record<string, string>>(
    expenseToEdit?.paidAmounts
      ? Object.fromEntries(Object.entries(expenseToEdit.paidAmounts).map(([id, v]) => [
          id,
          // Stored paidAmounts are in base currency; convert back to original for editing
          (expenseToEdit.currency !== expenseToEdit.baseCurrency && expenseToEdit.rateUsed
            ? (v / expenseToEdit.rateUsed).toFixed(2)
            : v.toString())
        ]))
      : {}
  );

  // Split: tracks OTHER members (Me is always included implicitly)
  const [splitMode, setSplitMode] = useState<SplitMode>(derivedSplitMode());
  const [splitWith, setSplitWith] = useState<string[]>(
    expenseToEdit
      ? expenseToEdit.splits.map(s => s.memberId).filter(id => id !== youMember?.id)
      : otherMembers.map(m => m.id)
  );
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>(
    expenseToEdit
      ? Object.fromEntries(expenseToEdit.splits.map(s => [
          s.memberId,
          // Stored splits are in base currency; convert back to original for editing
          (expenseToEdit.currency !== expenseToEdit.baseCurrency && expenseToEdit.rateUsed
            ? (s.amount / expenseToEdit.rateUsed).toFixed(2)
            : s.amount.toFixed(2))
        ]))
      : {}
  );
  const [percentages, setPercentages] = useState<Record<string, string>>({});

  // All IDs participating in the split (always includes Me)
  const allSplitIds = youMember ? [youMember.id, ...splitWith] : splitWith;

  const numAmount = parseFloat(amount) || 0;
  const { converted, rate } = convertToBase(numAmount, currency, baseCurrency, useManualRate && manualRate ? parseFloat(manualRate) : undefined);

  // Init equal percentages when allSplitIds changes
  useEffect(() => {
    if (allSplitIds.length === 0) return;
    const eqPct = (100 / allSplitIds.length).toFixed(1);
    const pct: Record<string, string> = {};
    allSplitIds.forEach(id => { pct[id] = eqPct; });
    setPercentages(pct);
  }, [allSplitIds.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  // Computed splits stored in base currency (always includes Me)
  // customAmounts are in original currency; multiply by rate to store in base
  const computedSplits = (() => {
    if (allSplitIds.length === 0) return [];
    if (splitMode === 'equal') {
      const each = converted / allSplitIds.length;
      return allSplitIds.map(id => ({ memberId: id, amount: each }));
    }
    if (splitMode === 'custom') {
      return allSplitIds.map(id => ({
        memberId: id,
        amount: parseFloat(customAmounts[id] || '0') * rate,
      }));
    }
    // percentage — percentages of base total
    return allSplitIds.map(id => {
      const pct = parseFloat(percentages[id] || '0') / 100;
      return { memberId: id, amount: converted * pct };
    });
  })();

  // Validate in original currency for custom; in base for equal/percentage
  const splitTotalOrig = splitMode === 'custom'
    ? allSplitIds.reduce((s, id) => s + parseFloat(customAmounts[id] || '0'), 0)
    : computedSplits.reduce((s, x) => s + x.amount, 0);
  const splitRef = splitMode === 'custom' ? numAmount : converted;
  const splitBalanced = Math.abs(splitTotalOrig - splitRef) < 0.01;

  // Multi-paid: user enters in original currency; validate against numAmount
  const paidTotalMulti = Object.values(paidAmounts).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const paidBalancedMulti = Math.abs(paidTotalMulti - numAmount) < 0.01;

  function handleSave() {
    if (!title.trim() || numAmount <= 0) return;
    if (splitMode !== 'equal' && !splitBalanced) return;
    if (paidMode === 'multi' && !paidBalancedMulti) return;

    // Build paidById: for single use selected; for multi use largest payer
    const effectivePaidById = paidMode === 'single' ? paidById :
      Object.entries(paidAmounts).sort((a, b) => parseFloat(b[1]) - parseFloat(a[1]))[0]?.[0] ?? paidById;

    // paidAmounts entered in original currency → convert to base for storage
    const multiPaidAmounts = paidMode === 'multi'
      ? Object.fromEntries(
          Object.entries(paidAmounts)
            .map(([id, v]) => [id, (parseFloat(v) || 0) * rate] as [string, number])
            .filter(([, v]) => v > 0)
        )
      : undefined;

    const expense: Expense = {
      id: expenseToEdit?.id ?? `exp-${Date.now()}`,
      tripId,
      title: title.trim(),
      amount: numAmount,
      currency,
      baseCurrency,
      convertedAmount: converted,
      rateUsed: rate,
      category,
      paidById: effectivePaidById,
      paidAmounts: multiPaidAmounts,
      splits: computedSplits,
      notes: notes.trim() || undefined,
      date: format(expenseDate, 'yyyy-MM-dd'),
      useManualRate,
    };
    saveExpense(expense);
    onSaved();
  }

  const isValid = title.trim() && numAmount > 0 &&
    (splitMode === 'equal' || splitBalanced) &&
    (paidMode === 'single' || paidBalancedMulti) &&
    allSplitIds.length > 0;

  function toggleSplitMember(id: string) {
    setSplitWith(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-mobile bg-card rounded-t-3xl px-5 pb-10 pt-5 animate-slide-up max-h-[92vh] overflow-y-auto scrollbar-hide">
        <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-5" />
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-foreground font-black text-xl">{isEditing ? 'Edit Expense ✏️' : 'Add Expense 💸'}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <Label className="text-foreground/70 text-xs uppercase tracking-wider mb-2 block">Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Dinner at Bistro" className="bg-muted border-border" />
          </div>

          {/* Date */}
          <div>
            <Label className="text-foreground/70 text-xs uppercase tracking-wider mb-2 block">Date</Label>
            <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start bg-muted border-border text-foreground font-normal">
                  <CalendarIcon className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                  {format(expenseDate, 'MMM d, yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-card border-border z-[70]" align="start">
                <Calendar
                  mode="single"
                  selected={expenseDate}
                  onSelect={d => { if (d) { setExpenseDate(d); setShowDatePicker(false); } }}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
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
                <p className="text-muted-foreground text-xs">
                  How much each person paid in <span className="font-bold text-foreground">{currency}</span> (must total {CURRENCY_SYMBOLS[currency]}{numAmount.toFixed(2)})
                </p>
                {members.map(m => (
                  <div key={m.id} className="flex items-center gap-2">
                    <span className="text-lg w-7">{m.emoji}</span>
                    <span className="text-sm text-foreground flex-1">{m.name}</span>
                    <div className="flex items-center gap-1 bg-muted border border-border rounded-xl px-2 py-1 w-24">
                      <span className="text-xs text-muted-foreground">{CURRENCY_SYMBOLS[currency]}</span>
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
                  Total: {CURRENCY_SYMBOLS[currency]}{paidTotalMulti.toFixed(2)} / {CURRENCY_SYMBOLS[currency]}{numAmount.toFixed(2)}
                  {paidBalancedMulti ? ' ✓' : ` (${paidTotalMulti > numAmount ? '+' : ''}${(paidTotalMulti - numAmount).toFixed(2)})`}
                </div>
                {currency !== baseCurrency && paidTotalMulti > 0 && (
                  <p className="text-muted-foreground/60 text-[10px]">
                    ≈ {CURRENCY_SYMBOLS[baseCurrency]}{(paidTotalMulti * rate).toFixed(2)} {baseCurrency} total
                  </p>
                )}
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
                  {/* Me is always included — shown as non-toggleable */}
                  {youMember && (
                    <span className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold bg-secondary/30 text-secondary opacity-80 cursor-default">
                      {youMember.emoji} {youMember.name} <span className="text-[10px]">(always)</span>
                    </span>
                  )}
                  {otherMembers.map(m => {
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
                {allSplitIds.length > 0 && numAmount > 0 && (
                  <div className="mt-2">
                    <p className="text-muted-foreground text-xs">
                      Each pays: <span className="text-foreground font-bold">{CURRENCY_SYMBOLS[currency]}{(numAmount / allSplitIds.length).toFixed(2)}</span> {currency}
                    </p>
                    {currency !== baseCurrency && (
                      <p className="text-muted-foreground/60 text-[10px] mt-0.5">
                        ≈ {CURRENCY_SYMBOLS[baseCurrency]}{(converted / allSplitIds.length).toFixed(2)} {baseCurrency} each
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            {splitMode === 'custom' && (
              <div className="space-y-2">
                <p className="text-muted-foreground text-xs">
                  Enter amounts in <span className="font-bold text-foreground">{currency}</span> (must total {CURRENCY_SYMBOLS[currency]}{numAmount.toFixed(2)})
                  {currency !== baseCurrency && <span className="text-muted-foreground/70"> · converted at save</span>}
                </p>
                {/* Me is always in the split */}
                {youMember && (
                  <div className="flex items-center gap-2">
                    <span className="text-lg w-7">{youMember.emoji}</span>
                    <span className="text-sm flex-1 text-foreground">{youMember.name} <span className="text-[10px] text-muted-foreground">(you)</span></span>
                    <div className="flex items-center gap-1 bg-muted border border-border rounded-xl px-2 py-1 w-24">
                      <span className="text-xs text-muted-foreground">{CURRENCY_SYMBOLS[currency]}</span>
                      <input
                        type="number"
                        value={customAmounts[youMember.id] || ''}
                        onChange={e => setCustomAmounts(prev => ({ ...prev, [youMember.id]: e.target.value }))}
                        placeholder="0.00"
                        className="bg-transparent text-xs text-foreground w-full focus:outline-none"
                      />
                    </div>
                  </div>
                )}
                {otherMembers.map(m => {
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
                          <span className="text-xs text-muted-foreground">{CURRENCY_SYMBOLS[currency]}</span>
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
                  Total: {CURRENCY_SYMBOLS[currency]}{splitTotalOrig.toFixed(2)} / {CURRENCY_SYMBOLS[currency]}{numAmount.toFixed(2)}
                  {splitBalanced ? ' ✓' : ` (${splitTotalOrig > numAmount ? '+' : ''}${(splitTotalOrig - numAmount).toFixed(2)})`}
                </div>
                {currency !== baseCurrency && splitTotalOrig > 0 && (
                  <p className="text-muted-foreground/60 text-[10px]">
                    ≈ {CURRENCY_SYMBOLS[baseCurrency]}{(splitTotalOrig * rate).toFixed(2)} {baseCurrency} total
                  </p>
                )}
                {/* Balance bar */}
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', splitBalanced ? 'bg-secondary' : splitTotalOrig > numAmount ? 'bg-destructive' : 'bg-primary')}
                    style={{ width: `${Math.min((splitTotalOrig / (numAmount || 1)) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}

            {splitMode === 'percentage' && (
              <div className="space-y-2">
                <p className="text-muted-foreground text-xs">Set percentage for each person (must total 100%)</p>
                {/* Me is always in the split */}
                {youMember && (() => {
                  const pct = parseFloat(percentages[youMember.id] || '0');
                  const origFromPct = numAmount * pct / 100;
                  const baseFromPct = converted * pct / 100;
                  return (
                    <div className="flex items-center gap-2">
                      <span className="text-lg w-7">{youMember.emoji}</span>
                      <span className="text-sm flex-1 text-foreground">{youMember.name} <span className="text-[10px] text-muted-foreground">(you)</span></span>
                      <div className="flex items-center gap-1 bg-muted border border-border rounded-xl px-2 py-1 w-16">
                        <input
                          type="number"
                          value={percentages[youMember.id] || ''}
                          onChange={e => setPercentages(prev => ({ ...prev, [youMember.id]: e.target.value }))}
                          placeholder="0"
                          className="bg-transparent text-xs text-foreground w-full focus:outline-none"
                        />
                        <span className="text-xs text-muted-foreground">%</span>
                      </div>
                      <div className="text-right w-20">
                        <p className="text-xs text-muted-foreground">{CURRENCY_SYMBOLS[currency]}{origFromPct.toFixed(2)}</p>
                        {currency !== baseCurrency && <p className="text-[10px] text-muted-foreground/60">≈{CURRENCY_SYMBOLS[baseCurrency]}{baseFromPct.toFixed(2)}</p>}
                      </div>
                    </div>
                  );
                })()}
                {otherMembers.map(m => {
                  const isIn = splitWith.includes(m.id);
                  const pct = parseFloat(percentages[m.id] || '0');
                  const origFromPct = numAmount * pct / 100;
                  const baseFromPct = converted * pct / 100;
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
                          <div className="text-right w-20">
                            <p className="text-xs text-muted-foreground">{CURRENCY_SYMBOLS[currency]}{origFromPct.toFixed(2)}</p>
                            {currency !== baseCurrency && <p className="text-[10px] text-muted-foreground/60">≈{CURRENCY_SYMBOLS[baseCurrency]}{baseFromPct.toFixed(2)}</p>}
                          </div>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground w-20 text-right pr-2">—</span>
                      )}
                    </div>
                  );
                })}
                {(() => {
                  const totalPct = allSplitIds.reduce((s, id) => s + parseFloat(percentages[id] || '0'), 0);
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
          {isEditing ? 'Save Changes ✅' : 'Save Expense ✅'}
        </Button>
      </div>
    </div>
  );
}
