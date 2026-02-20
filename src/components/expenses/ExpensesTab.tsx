import { useState } from 'react';
import { Plus, DollarSign, Users, ChevronRight, Trash2 } from 'lucide-react';
import { getExpenses, getMembers, getBaseCurrency, setBaseCurrency, deleteExpense, saveMember, deleteMember } from '@/lib/storage';
import { formatCurrency, CURRENCIES, CURRENCY_SYMBOLS } from '@/lib/currencies';
import type { Currency, Expense, TripMember } from '@/lib/types';
import AddExpenseModal from './AddExpenseModal';
import { cn } from '@/lib/utils';

const CAT_ICONS: Record<string, string> = {
  food: '🍽️', transport: '🚗', stay: '🏨', shopping: '🛍️', activities: '🗺️', misc: '📦',
};

const CAT_COLORS: Record<string, string> = {
  food: 'text-gold bg-gold/20',
  transport: 'text-secondary bg-secondary/20',
  stay: 'text-purple bg-purple/20',
  shopping: 'text-pink bg-pink/20',
  activities: 'text-teal bg-teal/20',
  misc: 'text-muted-foreground bg-muted',
};

interface Props { tripId: string }

export default function ExpensesTab({ tripId }: Props) {
  const [view, setView] = useState<'expenses' | 'balances' | 'members'>('expenses');
  const [showAdd, setShowAdd] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [, setRefresh] = useState(0);

  const expenses = getExpenses(tripId);
  const members = getMembers(tripId);
  const baseCurrency = getBaseCurrency(tripId);

  function refresh() { setRefresh(r => r + 1); }

  // Balance calculations
  const balances: Record<string, number> = {};
  members.forEach(m => { balances[m.id] = 0; });
  expenses.forEach(exp => {
    balances[exp.paidById] = (balances[exp.paidById] || 0) + exp.convertedAmount;
    exp.splits.forEach(s => {
      balances[s.memberId] = (balances[s.memberId] || 0) - s.amount;
    });
  });

  const youMember = members.find(m => m.isYou);
  const youBalance = youMember ? (balances[youMember.id] || 0) : 0;
  const totalSpent = expenses.reduce((s, e) => s + e.convertedAmount, 0);

  function handleAddMember() {
    if (!newMemberName.trim()) return;
    const emojis = ['👩', '👨', '🧑', '👧', '👦', '🙋'];
    const member: TripMember = {
      id: `m-${Date.now()}`,
      tripId,
      name: newMemberName.trim(),
      emoji: emojis[members.length % emojis.length],
      isYou: false,
    };
    saveMember(member);
    setNewMemberName('');
    setShowAddMember(false);
    refresh();
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-2 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-foreground font-black text-lg">Expenses</h3>
          {/* Base currency selector */}
          <select
            value={baseCurrency}
            onChange={e => { setBaseCurrency(tripId, e.target.value as Currency); refresh(); }}
            className="bg-muted border border-border rounded-xl px-2 py-1 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {CURRENCIES.map(c => (
              <option key={c} value={c}>{CURRENCY_SYMBOLS[c]} {c}</option>
            ))}
          </select>
        </div>

        {/* Balance banner */}
        <div className={cn('rounded-2xl p-4 mb-3', youBalance >= 0 ? 'bg-secondary/20' : 'bg-destructive/20')}>
          <p className="text-xs font-semibold text-muted-foreground mb-1">
            {youBalance >= 0 ? 'You are owed' : 'You owe'}
          </p>
          <p className={cn('text-2xl font-black', youBalance >= 0 ? 'text-secondary' : 'text-destructive')}>
            {formatCurrency(Math.abs(youBalance), baseCurrency)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Total trip spent: {formatCurrency(totalSpent, baseCurrency)}</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted p-1 rounded-xl">
          {(['expenses', 'balances', 'members'] as const).map(t => (
            <button
              key={t}
              onClick={() => setView(t)}
              className={cn('flex-1 py-1.5 rounded-lg text-xs font-bold capitalize transition-all', view === t ? 'bg-card text-foreground shadow' : 'text-muted-foreground')}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-4">
        {view === 'expenses' && (
          <div className="space-y-3">
            {expenses.length === 0 ? (
              <div className="text-center py-12"><p className="text-4xl mb-3">💸</p><p className="text-muted-foreground text-sm">No expenses yet</p></div>
            ) : expenses.map(exp => (
              <ExpenseCard key={exp.id} expense={exp} members={members} baseCurrency={baseCurrency} onDelete={() => { deleteExpense(tripId, exp.id); refresh(); }} />
            ))}
          </div>
        )}

        {view === 'balances' && (
          <div className="space-y-3">
            <h4 className="text-foreground font-bold text-sm mb-2">Who Owes Whom</h4>
            {members.map(m => {
              const bal = balances[m.id] || 0;
              return (
                <div key={m.id} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
                  <span className="text-2xl">{m.emoji}</span>
                  <div className="flex-1">
                    <p className="text-foreground font-bold text-sm">{m.name}{m.isYou ? ' (You)' : ''}</p>
                    <p className={cn('text-xs font-semibold mt-0.5', bal >= 0 ? 'text-secondary' : 'text-destructive')}>
                      {bal >= 0 ? `Gets back ${formatCurrency(bal, baseCurrency)}` : `Owes ${formatCurrency(Math.abs(bal), baseCurrency)}`}
                    </p>
                  </div>
                  <div className={cn('px-3 py-1 rounded-full text-xs font-bold', bal >= 0 ? 'bg-secondary/20 text-secondary' : 'bg-destructive/20 text-destructive')}>
                    {bal >= 0 ? '+' : ''}{formatCurrency(bal, baseCurrency)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {view === 'members' && (
          <div className="space-y-3">
            {members.map(m => (
              <div key={m.id} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
                <span className="text-2xl">{m.emoji}</span>
                <div className="flex-1">
                  <p className="text-foreground font-bold text-sm">{m.name}{m.isYou ? ' (You)' : ''}</p>
                  <p className="text-muted-foreground text-xs">{expenses.filter(e => e.paidById === m.id).length} payments</p>
                </div>
                {!m.isYou && (
                  <button onClick={() => { deleteMember(tripId, m.id); refresh(); }} className="text-destructive/60 hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            {showAddMember ? (
              <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
                <input
                  value={newMemberName}
                  onChange={e => setNewMemberName(e.target.value)}
                  placeholder="Member name"
                  className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  onKeyDown={e => e.key === 'Enter' && handleAddMember()}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button onClick={() => setShowAddMember(false)} className="flex-1 py-2 rounded-xl bg-muted text-muted-foreground text-sm font-bold">Cancel</button>
                  <button onClick={handleAddMember} className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold">Add</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowAddMember(true)} className="w-full py-3 rounded-2xl border border-dashed border-border text-muted-foreground text-sm font-bold flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Add Member
              </button>
            )}
          </div>
        )}
      </div>

      {/* Add expense button */}
      {view === 'expenses' && (
        <div className="px-4 pb-4 pt-2 flex-shrink-0">
          <button
            onClick={() => setShowAdd(true)}
            className="w-full py-3.5 rounded-2xl gradient-hero text-white font-bold text-sm flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Expense
          </button>
        </div>
      )}

      {showAdd && (
        <AddExpenseModal tripId={tripId} onClose={() => setShowAdd(false)} onSaved={() => { refresh(); setShowAdd(false); }} />
      )}
    </div>
  );
}

function ExpenseCard({ expense, members, baseCurrency, onDelete }: { expense: Expense; members: TripMember[]; baseCurrency: Currency; onDelete: () => void }) {
  const paidBy = members.find(m => m.id === expense.paidById);
  return (
    <div className="bg-card border border-border rounded-2xl p-4 animate-fade-in card-shadow">
      <div className="flex items-start gap-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0', CAT_COLORS[expense.category])}>
          {CAT_ICONS[expense.category]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-foreground font-bold text-sm">{expense.title}</p>
            <div className="text-right flex-shrink-0">
              <p className="text-foreground font-black text-sm">
                {CURRENCY_SYMBOLS[expense.currency]}{expense.amount.toFixed(2)}
              </p>
              {expense.currency !== baseCurrency && (
                <p className="text-muted-foreground text-xs">≈ {formatCurrency(expense.convertedAmount, baseCurrency)}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-muted-foreground text-xs">Paid by {paidBy?.name ?? 'Unknown'}</p>
            <span className="text-muted-foreground text-xs">·</span>
            <p className="text-muted-foreground text-xs">{expense.splits.length} split</p>
          </div>
          {expense.currency !== baseCurrency && (
            <p className="text-muted-foreground/60 text-[10px] mt-0.5">Rate: 1 {expense.currency} = {expense.rateUsed} {baseCurrency}</p>
          )}
        </div>
      </div>
      <div className="flex justify-end mt-2">
        <button onClick={onDelete} className="text-xs text-destructive/70 hover:text-destructive">Delete</button>
      </div>
    </div>
  );
}
