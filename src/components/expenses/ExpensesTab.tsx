import { useState } from 'react';
import { Plus, ChevronDown, Trash2, TrendingUp, Users, BarChart3, ArrowRight, CheckCircle } from 'lucide-react';
import {
  getExpenses, getMembers, getBaseCurrency, setBaseCurrency,
  deleteExpense, saveMember, deleteMember,
  getSettlements, saveSettlement, deleteSettlement
} from '@/lib/storage';
import { formatCurrency, CURRENCIES, CURRENCY_SYMBOLS } from '@/lib/currencies';
import type { Currency, Expense, TripMember, Settlement } from '@/lib/types';
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
const CAT_BAR_COLORS: Record<string, string> = {
  food: 'bg-gold',
  transport: 'bg-secondary',
  stay: 'bg-purple',
  shopping: 'bg-pink',
  activities: 'bg-teal',
  misc: 'bg-muted-foreground',
};

type MainView = 'expenses' | 'balances' | 'members' | 'analysis';
type BalanceSubTab = 'spend' | 'owes';

interface Props { tripId: string }

export default function ExpensesTab({ tripId }: Props) {
  const [view, setView] = useState<MainView>('expenses');
  const [balanceSubTab, setBalanceSubTab] = useState<BalanceSubTab>('spend');
  const [showAdd, setShowAdd] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [, setRefresh] = useState(0);

  const expenses = getExpenses(tripId);
  const members = getMembers(tripId);
  const baseCurrency = getBaseCurrency(tripId);
  const settlements = getSettlements(tripId);

  function refresh() { setRefresh(r => r + 1); }

  // ── Balance calculations ──
  const netBalances: Record<string, number> = {};
  const totalPaidByMember: Record<string, number> = {};
  const totalOwedByMember: Record<string, number> = {};
  members.forEach(m => {
    netBalances[m.id] = 0;
    totalPaidByMember[m.id] = 0;
    totalOwedByMember[m.id] = 0;
  });
  expenses.forEach(exp => {
    // Multi-payer: distribute credit to each payer proportionally
    if (exp.paidAmounts && Object.keys(exp.paidAmounts).length > 0) {
      Object.entries(exp.paidAmounts).forEach(([memberId, amount]) => {
        netBalances[memberId] = (netBalances[memberId] || 0) + amount;
        totalPaidByMember[memberId] = (totalPaidByMember[memberId] || 0) + amount;
      });
    } else {
      // Single payer
      netBalances[exp.paidById] = (netBalances[exp.paidById] || 0) + exp.convertedAmount;
      totalPaidByMember[exp.paidById] = (totalPaidByMember[exp.paidById] || 0) + exp.convertedAmount;
    }
    exp.splits.forEach(s => {
      netBalances[s.memberId] = (netBalances[s.memberId] || 0) - s.amount;
      totalOwedByMember[s.memberId] = (totalOwedByMember[s.memberId] || 0) + s.amount;
    });
  });

  const youMember = members.find(m => m.isYou);
  const youBalance = youMember ? (netBalances[youMember.id] || 0) : 0;
  const totalSpent = expenses.reduce((s, e) => s + e.convertedAmount, 0);

  // ── Greedy settlement algorithm ──
  function computeSettlements(balances: Record<string, number>): { from: string; to: string; amount: number }[] {
    const pos: { id: string; amt: number }[] = [];
    const neg: { id: string; amt: number }[] = [];
    Object.entries(balances).forEach(([id, amt]) => {
      if (amt > 0.01) pos.push({ id, amt });
      else if (amt < -0.01) neg.push({ id, amt: Math.abs(amt) });
    });
    pos.sort((a, b) => b.amt - a.amt);
    neg.sort((a, b) => b.amt - a.amt);
    const txns: { from: string; to: string; amount: number }[] = [];
    let pi = 0, ni = 0;
    while (pi < pos.length && ni < neg.length) {
      const settle = Math.min(pos[pi].amt, neg[ni].amt);
      txns.push({ from: neg[ni].id, to: pos[pi].id, amount: settle });
      pos[pi].amt -= settle;
      neg[ni].amt -= settle;
      if (pos[pi].amt < 0.01) pi++;
      if (neg[ni].amt < 0.01) ni++;
    }
    return txns;
  }

  const pendingSettlementTxns = computeSettlements(netBalances).filter(txn => {
    return !settlements.some(s => s.from === txn.from && s.to === txn.to && Math.abs(s.amount - txn.amount) < 0.01);
  });

  function markSettled(txn: { from: string; to: string; amount: number }) {
    const s: Settlement = {
      id: `settle-${Date.now()}`,
      tripId,
      from: txn.from,
      to: txn.to,
      amount: txn.amount,
      settledAt: new Date().toISOString(),
    };
    saveSettlement(s);
    refresh();
  }

  // ── Category breakdown ──
  const catTotals: Record<string, number> = {};
  expenses.forEach(e => {
    catTotals[e.category] = (catTotals[e.category] || 0) + e.convertedAmount;
  });
  const catSorted = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);

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

  const tabs: { id: MainView; label: string; icon: React.ReactNode }[] = [
    { id: 'expenses', label: 'Expenses', icon: <span className="text-sm">💸</span> },
    { id: 'balances', label: 'Balances', icon: <Users className="w-3.5 h-3.5" /> },
    { id: 'members', label: 'Members', icon: <span className="text-sm">👥</span> },
    { id: 'analysis', label: 'Analysis', icon: <BarChart3 className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-2 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-foreground font-black text-lg">Expenses</h3>
          {/* Currency pill */}
          <div className="relative">
            <button
              onClick={() => setShowCurrencyPicker(p => !p)}
              className="flex items-center gap-1.5 bg-primary/15 text-primary border border-primary/30 rounded-full px-3 py-1.5 text-xs font-bold hover:bg-primary/25 transition-colors"
            >
              <span>{CURRENCY_SYMBOLS[baseCurrency]}</span>
              <span>{baseCurrency}</span>
              <ChevronDown className="w-3 h-3" />
            </button>
            {showCurrencyPicker && (
              <div className="absolute right-0 top-full mt-1 z-[60] bg-card border border-border rounded-2xl shadow-xl overflow-hidden w-28">
                {CURRENCIES.map(c => (
                  <button
                    key={c}
                    onMouseDown={e => { e.preventDefault(); setBaseCurrency(tripId, c as Currency); setShowCurrencyPicker(false); refresh(); }}
                    className={cn('w-full px-3 py-2 text-left text-sm font-semibold hover:bg-muted transition-colors', baseCurrency === c ? 'text-primary' : 'text-foreground')}
                  >
                    {CURRENCY_SYMBOLS[c as Currency]} {c}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Balance banner */}
        <div className={cn('rounded-2xl p-4 mb-3 flex items-center gap-4', youBalance >= 0 ? 'bg-secondary/15 border border-secondary/30' : 'bg-destructive/15 border border-destructive/30')}>
          <div className="text-3xl">{youBalance >= 0 ? '🤑' : '😅'}</div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-muted-foreground">{youBalance >= 0 ? 'You are owed' : 'You owe'}</p>
            <p className={cn('text-2xl font-black', youBalance >= 0 ? 'text-secondary' : 'text-destructive')}>
              {formatCurrency(Math.abs(youBalance), baseCurrency)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Trip total</p>
            <p className="text-foreground font-bold text-sm">{formatCurrency(totalSpent, baseCurrency)}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted p-1 rounded-xl">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setView(t.id)}
              className={cn('flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all flex flex-col items-center gap-0.5', view === t.id ? 'bg-card text-foreground shadow' : 'text-muted-foreground')}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-4">

        {/* ── EXPENSES VIEW ── */}
        {view === 'expenses' && (
          <div className="space-y-3">
            {expenses.length === 0 ? (
              <div className="text-center py-12"><p className="text-4xl mb-3">💸</p><p className="text-muted-foreground text-sm">No expenses yet</p></div>
            ) : (
              <>
                {              expenses.map(exp => (
                  <ExpenseCard key={exp.id} expense={exp} members={members} baseCurrency={baseCurrency} onDelete={() => { deleteExpense(tripId, exp.id); refresh(); }} onEdit={() => setEditExpense(exp)} />
                ))}
                {/* Category mini-chart */}
                {catSorted.length > 0 && (
                  <div className="bg-card border border-border rounded-2xl p-4 mt-2">
                    <p className="text-foreground font-bold text-sm mb-3">By Category</p>
                    <div className="space-y-2">
                      {catSorted.map(([cat, amt]) => (
                        <div key={cat} className="flex items-center gap-2">
                          <span className="text-base w-6">{CAT_ICONS[cat]}</span>
                          <div className="flex-1">
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={cn('h-full rounded-full', CAT_BAR_COLORS[cat])}
                                style={{ width: `${(amt / totalSpent) * 100}%` }}
                              />
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground w-12 text-right">{((amt / totalSpent) * 100).toFixed(0)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── BALANCES VIEW ── */}
        {view === 'balances' && (
          <div>
            {/* Sub-tabs */}
            <div className="flex gap-1 bg-muted p-1 rounded-xl mb-4">
              {([
                { id: 'spend', label: '💰 Trip Spend' },
                { id: 'owes', label: '🔄 Who Owes' },
              ] as const).map(t => (
                <button
                  key={t.id}
                  onClick={() => setBalanceSubTab(t.id)}
                  className={cn('flex-1 py-2 rounded-lg text-xs font-bold transition-all', balanceSubTab === t.id ? 'bg-card text-foreground shadow' : 'text-muted-foreground')}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {balanceSubTab === 'spend' && (
              <div className="space-y-3">
                {members.map(m => {
                  const paid = totalPaidByMember[m.id] || 0;
                  const owed = totalOwedByMember[m.id] || 0;
                  const net = netBalances[m.id] || 0;
                  const share = totalSpent > 0 ? (paid / totalSpent) * 100 : 0;
                  const fairShare = totalSpent / Math.max(members.length, 1);
                  const isPositive = net >= 0;
                  return (
                    <div key={m.id} className="bg-card border border-border rounded-2xl p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-2xl">{m.emoji}</span>
                        <div className="flex-1">
                          <p className="text-foreground font-bold text-sm">{m.name}{m.isYou ? ' (You)' : ''}</p>
                          <p className="text-muted-foreground text-xs">Paid {formatCurrency(paid, baseCurrency)} · Owed {formatCurrency(owed, baseCurrency)}</p>
                        </div>
                        <div className={cn('px-2.5 py-1 rounded-full text-xs font-bold', isPositive ? 'bg-secondary/20 text-secondary' : 'bg-destructive/20 text-destructive')}>
                          {isPositive ? '+' : ''}{formatCurrency(net, baseCurrency)}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Share of trip: {share.toFixed(0)}%</span>
                          <span>Fair share: {formatCurrency(fairShare, baseCurrency)}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn('h-full rounded-full transition-all', isPositive ? 'bg-secondary' : 'bg-destructive')}
                            style={{ width: `${Math.min(share, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {balanceSubTab === 'owes' && (
              <div className="space-y-3">
                {pendingSettlementTxns.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-4xl mb-3">✅</p>
                    <p className="text-foreground font-bold">All settled up!</p>
                    <p className="text-muted-foreground text-sm mt-1">No pending debts</p>
                  </div>
                ) : (
                  pendingSettlementTxns.map((txn, i) => {
                    const fromMember = members.find(m => m.id === txn.from);
                    const toMember = members.find(m => m.id === txn.to);
                    return (
                      <div key={i} className="bg-card border border-border rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xl">{fromMember?.emoji}</span>
                          <div className="flex-1">
                            <p className="text-foreground font-bold text-sm">
                              {fromMember?.name} → {toMember?.name}
                            </p>
                            <p className="text-muted-foreground text-xs">Settlement</p>
                          </div>
                          <p className="text-destructive font-black text-base">{formatCurrency(txn.amount, baseCurrency)}</p>
                        </div>
                        <button
                          onClick={() => markSettled(txn)}
                          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-secondary/20 text-secondary text-sm font-bold hover:bg-secondary/30 transition-colors"
                        >
                          <CheckCircle className="w-4 h-4" /> Mark Settled
                        </button>
                      </div>
                    );
                  })
                )}
                {/* Show settled */}
                {settlements.length > 0 && (
                  <div className="mt-4">
                    <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-2">Settled</p>
                    {settlements.map(s => {
                      const from = members.find(m => m.id === s.from);
                      const to = members.find(m => m.id === s.to);
                      return (
                        <div key={s.id} className="flex items-center gap-2 py-2 px-3 bg-muted/50 rounded-xl mb-1.5">
                          <CheckCircle className="w-4 h-4 text-secondary flex-shrink-0" />
                          <p className="text-muted-foreground text-xs flex-1">{from?.name} → {to?.name}: {formatCurrency(s.amount, baseCurrency)}</p>
                          <button onClick={() => { deleteSettlement(tripId, s.id); refresh(); }} className="text-muted-foreground/50 hover:text-destructive text-xs">Undo</button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── MEMBERS VIEW ── */}
        {view === 'members' && (
          <div className="space-y-3">
            {members.map(m => (
              <div key={m.id} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
                <span className="text-2xl">{m.emoji}</span>
                <div className="flex-1">
                  <p className="text-foreground font-bold text-sm">{m.name}{m.isYou ? ' (You)' : ''}</p>
                  <p className="text-muted-foreground text-xs">{expenses.filter(e => e.paidById === m.id).length} payments · {formatCurrency(totalPaidByMember[m.id] || 0, baseCurrency)} paid</p>
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

        {/* ── ANALYSIS VIEW ── */}
        {view === 'analysis' && (
          <div className="space-y-4">
            {expenses.length === 0 ? (
              <div className="text-center py-12"><p className="text-4xl mb-3">📊</p><p className="text-muted-foreground text-sm">No data yet — add expenses first</p></div>
            ) : (
              <>
                {/* Total spend card */}
                <div className="bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/20 rounded-2xl p-5">
                  <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1">Total Trip Spend</p>
                  <p className="text-foreground font-black text-4xl">{formatCurrency(totalSpent, baseCurrency)}</p>
                  <p className="text-muted-foreground text-xs mt-1">{expenses.length} expenses · {members.length} members</p>
                </div>

                {/* By Category */}
                <div className="bg-card border border-border rounded-2xl p-4">
                  <p className="text-foreground font-bold text-sm mb-3 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" /> By Category
                  </p>
                  <div className="space-y-3">
                    {catSorted.map(([cat, amt]) => (
                      <div key={cat}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm flex items-center gap-1.5">
                            <span>{CAT_ICONS[cat]}</span>
                            <span className="text-foreground capitalize font-semibold">{cat}</span>
                          </span>
                          <span className="text-xs text-muted-foreground">{formatCurrency(amt, baseCurrency)} · {((amt / totalSpent) * 100).toFixed(0)}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn('h-full rounded-full transition-all', CAT_BAR_COLORS[cat])}
                            style={{ width: `${(amt / totalSpent) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* By Member */}
                <div className="bg-card border border-border rounded-2xl p-4">
                  <p className="text-foreground font-bold text-sm mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4 text-secondary" /> By Member
                  </p>
                  <div className="space-y-3">
                    {members.map(m => {
                      const paid = totalPaidByMember[m.id] || 0;
                      const pct = totalSpent > 0 ? (paid / totalSpent) * 100 : 0;
                      return (
                        <div key={m.id}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm flex items-center gap-1.5">
                              <span>{m.emoji}</span>
                              <span className="text-foreground font-semibold">{m.name}{m.isYou ? ' (You)' : ''}</span>
                            </span>
                            <span className="text-xs text-muted-foreground">{formatCurrency(paid, baseCurrency)} · {pct.toFixed(0)}%</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Daily Spend */}
                {(() => {
                  const dailyMap: Record<string, number> = {};
                  const dailyCat: Record<string, string> = {};
                  expenses.forEach(e => {
                    dailyMap[e.date] = (dailyMap[e.date] || 0) + e.convertedAmount;
                    // dominant category
                    if (!dailyCat[e.date] || e.convertedAmount > (dailyMap[e.date] || 0) / 2) {
                      dailyCat[e.date] = e.category;
                    }
                  });
                  const days = Object.entries(dailyMap).sort(([a], [b]) => a.localeCompare(b));
                  const maxDay = Math.max(...days.map(([, v]) => v));
                  if (days.length === 0) return null;
                  return (
                    <div className="bg-card border border-border rounded-2xl p-4">
                      <p className="text-foreground font-bold text-sm mb-4 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-gold" /> Daily Spend
                      </p>
                      <div className="flex items-end gap-1.5 h-24">
                        {days.map(([date, amt]) => {
                          const height = (amt / maxDay) * 100;
                          const cat = dailyCat[date] || 'misc';
                          const dayLabel = new Date(date + 'T00:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' });
                          return (
                            <div key={date} className="flex-1 flex flex-col items-center gap-1">
                              <span className="text-[9px] text-muted-foreground">{formatCurrency(amt, baseCurrency).replace(/\.00$/, '')}</span>
                              <div className="w-full flex items-end" style={{ height: '60px' }}>
                                <div
                                  className={cn('w-full rounded-t-lg transition-all', CAT_BAR_COLORS[cat])}
                                  style={{ height: `${height}%` }}
                                />
                              </div>
                              <span className="text-[9px] text-muted-foreground text-center leading-tight">{dayLabel}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </>
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
      {editExpense && (
        <AddExpenseModal tripId={tripId} expenseToEdit={editExpense} onClose={() => setEditExpense(null)} onSaved={() => { refresh(); setEditExpense(null); }} />
      )}
    </div>
  );
}

function ExpenseCard({ expense, members, baseCurrency, onDelete, onEdit }: { expense: Expense; members: TripMember[]; baseCurrency: Currency; onDelete: () => void; onEdit: () => void }) {
  const isMultiPayer = expense.paidAmounts && Object.keys(expense.paidAmounts).length > 0;

  // Payers: either all from paidAmounts, or single paidById
  const payers = isMultiPayer
    ? Object.entries(expense.paidAmounts!).map(([id, amt]) => {
        const m = members.find(mem => mem.id === id);
        return m ? { member: m, amount: amt } : null;
      }).filter(Boolean) as { member: TripMember; amount: number }[]
    : (() => {
        const m = members.find(mem => mem.id === expense.paidById);
        return m ? [{ member: m, amount: expense.convertedAmount }] : [];
      })();

  const splitMembers = expense.splits.map(s => members.find(m => m.id === s.memberId)).filter(Boolean);

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
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            <span className="text-muted-foreground text-xs">Paid by</span>
            {payers.map(({ member, amount }) => (
              <span key={member.id} className="text-xs text-foreground font-semibold">
                {member.emoji} {member.name}{isMultiPayer ? ` (${formatCurrency(amount, baseCurrency)})` : ''}
              </span>
            ))}
          </div>
          {/* Split avatars */}
          {splitMembers.length > 0 && (
            <div className="flex items-center gap-0.5 mt-0.5">
              <span className="text-muted-foreground text-xs mr-1">Split:</span>
              {splitMembers.slice(0, 5).map((m, i) => (
                <span key={i} className="text-base leading-none" title={m?.name}>{m?.emoji}</span>
              ))}
              {splitMembers.length > 5 && <span className="text-xs text-muted-foreground">+{splitMembers.length - 5}</span>}
            </div>
          )}
          {expense.currency !== baseCurrency && (
            <p className="text-muted-foreground/60 text-[10px] mt-0.5">Rate: 1 {expense.currency} = {expense.rateUsed} {baseCurrency}</p>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between mt-2 border-t border-border/50 pt-2">
        <span className="text-muted-foreground text-[10px]">{expense.date}</span>
        <div className="flex gap-3">
          <button onClick={onEdit} className="text-xs text-primary/80 hover:text-primary font-semibold">Edit</button>
          <button onClick={onDelete} className="text-xs text-destructive/70 hover:text-destructive font-semibold">Delete</button>
        </div>
      </div>
    </div>
  );
}
