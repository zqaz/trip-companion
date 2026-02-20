import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
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
  const [category, setCategory] = useState<ExpenseCategory>('food');
  const [paidById, setPaidById] = useState(members[0]?.id ?? '');
  const [splitWith, setSplitWith] = useState<string[]>(members.map(m => m.id));
  const [notes, setNotes] = useState('');
  const [useManualRate, setUseManualRate] = useState(false);
  const [manualRate, setManualRate] = useState('');

  const numAmount = parseFloat(amount) || 0;
  const { converted, rate } = convertToBase(numAmount, currency, baseCurrency, useManualRate && manualRate ? parseFloat(manualRate) : undefined);
  const splitAmount = splitWith.length > 0 ? converted / splitWith.length : 0;

  function handleSave() {
    if (!title.trim() || !amount || numAmount <= 0) return;
    const splits = splitWith.map(id => ({ memberId: id, amount: splitAmount }));
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
      paidById,
      splits,
      notes: notes.trim() || undefined,
      date: new Date().toISOString().split('T')[0],
      useManualRate,
    };
    saveExpense(expense);
    onSaved();
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
          <div>
            <Label className="text-foreground/70 text-xs uppercase tracking-wider mb-2 block">Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Dinner at Bistro" className="bg-muted border-border" />
          </div>

          {/* Amount + Currency */}
          <div>
            <Label className="text-foreground/70 text-xs uppercase tracking-wider mb-2 block">Amount</Label>
            <div className="flex gap-2">
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value as Currency)}
                className="bg-muted border border-border rounded-xl px-2 py-2 text-sm font-bold text-foreground focus:outline-none w-24"
              >
                {CURRENCIES.map(c => <option key={c} value={c}>{CURRENCY_SYMBOLS[c]} {c}</option>)}
              </select>
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
              <Input
                type="number"
                value={manualRate}
                onChange={e => setManualRate(e.target.value)}
                placeholder={`e.g. ${rate}`}
                className="bg-muted border-border"
              />
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

          {/* Paid by */}
          <div>
            <Label className="text-foreground/70 text-xs uppercase tracking-wider mb-2 block">Paid By</Label>
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
          </div>

          {/* Split with */}
          <div>
            <Label className="text-foreground/70 text-xs uppercase tracking-wider mb-2 block">Split With (Equal)</Label>
            <div className="flex gap-2 flex-wrap">
              {members.map(m => {
                const isChecked = splitWith.includes(m.id);
                return (
                  <button
                    key={m.id}
                    onClick={() => setSplitWith(prev => isChecked ? prev.filter(id => id !== m.id) : [...prev, m.id])}
                    className={cn('flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all', isChecked ? 'bg-secondary/30 text-secondary' : 'bg-muted text-muted-foreground')}
                  >
                    {m.emoji} {m.name}
                  </button>
                );
              })}
            </div>
            {splitWith.length > 0 && numAmount > 0 && (
              <p className="text-muted-foreground text-xs mt-2">Each pays: {CURRENCY_SYMBOLS[baseCurrency]}{splitAmount.toFixed(2)} {baseCurrency}</p>
            )}
          </div>

          <div>
            <Label className="text-foreground/70 text-xs uppercase tracking-wider mb-2 block">Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes..." className="bg-muted border-border resize-none" rows={2} />
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={!title.trim() || numAmount <= 0}
          className="w-full mt-6 h-12 rounded-2xl font-bold text-base border-0 gradient-hero text-white"
        >
          Save Expense ✅
        </Button>
      </div>
    </div>
  );
}
