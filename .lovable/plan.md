# Travel Companion App — 6 Feature Upgrades

## Overview of Changes

Six interconnected improvements across the trip creation flow and the entire expenses module.

---

## Change 1 — Location Autocomplete for Trip Destination

### What & Where

Replace the plain text `Input` in `NewTripModal.tsx` (destination field, line 100–108) with a custom autocomplete component.

### New Component: `src/components/ui/LocationAutocomplete.tsx`

A self-contained, reusable component that:

- Has an embedded dataset of ~150+ popular cities (city_name + country_name) — no external API needed
- Shows a styled dropdown after 2 characters are typed
- Highlights the matched text in each result
- Supports keyboard navigation: Arrow Up/Down to move, Enter to select, Escape to close
- Closes on outside click via a `useRef` + `useEffect` listener
- Shows "No results found" when nothing matches
- Limits to top 8 results
- On select: populates the destination field with `"City, Country"` format

### Technical Approach

- `useRef` on the wrapper div to detect outside clicks
- `useState` for: `query`, `results`, `isOpen`, `highlightedIndex`
- `useEffect` to filter the city list whenever `query` changes (debounced at 150ms)
- Dropdown rendered inside the component with `position: absolute`, high `z-index` (z-50), solid `bg-card` background, `border`, `rounded-2xl`, `shadow-xl`

---

## Change 2 — Multi-Select Location Chip Input

### What & Where

Add a second field in `NewTripModal.tsx` below Destination: **"Places to Visit"** — a multi-select chip input using the same city dataset.

### New Component: `src/components/ui/LocationChipInput.tsx`

- Shows selected locations as rounded chips with an `×` remove button
- Typing in the search box filters the city list (same dataset as above)
- Prevents duplicate selections
- Supports keyboard: Arrow keys to navigate dropdown, Enter to add, Backspace to remove last chip
- Placeholder: "Search and add places..."
- Chips styled with `bg-primary/20 text-primary` rounded-full

### Data Model Update

Add `places?: string[]` to the `Trip` type in `src/lib/types.ts` to persist the multi-select places.

---

## Change 3 — Improved Expense UI + Smart Default Currency

### Problem

- Default currency is hardcoded to `'USD'` in `storage.ts` line 106
- The expense UI could be much cleaner and more visual

### Fixes

`**src/lib/storage.ts**`: Change `getBaseCurrency` default from `'USD'` to `null`, and on first access prompt the user. Actually — simpler approach: when a trip is created via `NewTripModal`, prompt for the base currency at trip creation time and save it immediately via `setBaseCurrency`.

`**NewTripModal.tsx**`: Add a **"Trip Currency"** selector step after the cover theme picker — a grid of currency buttons ($ USD, € EUR, £ GBP, ₹ INR, ¥ JPY, A$ AUD, C$ CAD) that the user taps to set as the base currency for the trip. This value gets saved with `setBaseCurrency(tripId, selectedCurrency)` during `handleCreate()`.

`**ExpensesTab.tsx**`: Improve the visual design:

- Replace the small plain `<select>` currency picker with a more prominent pill-style currency switcher showing the current currency with a chevron icon
- Make the balance banner more visually impactful — larger emoji, better color contrast
- Add category breakdown mini-chart (horizontal bar) at the bottom of the expenses list showing spend % by category
- Expense cards get richer: show the split avatars (emoji chips) of all members who split the expense

---

## Change 4 — Split Options in Add Expense Modal

### What

Upgrade the "Split With" section in `AddExpenseModal.tsx` from single-mode (equal only) to a **3-mode split system**:

**Mode A: Equal Split** (current behavior)

- All selected members share equally
- Shows "Each pays: $X"

**Mode B: Unequal / Custom Split**

- Each selected member gets an amount input field
- Shows running total vs expense total with a visual indicator (green if balanced, red if over/under)
- Auto-validate: sum of custom amounts must equal total converted amount

**Mode C: Percentage Split**

- Each selected member gets a % input (default: equal %)
- Auto-calculates the $ amount from the %
- Shows % and computed amount side by side

Mode D: Multiple user paid for stuff in group.

split should be in both up top and below, For Paid by also multiple select option

### UI

A 3-tab toggle above the member list: `Equal | Custom | Percentage`

Add same for paid by as well

### Data

The existing `ExpenseSplit.amount` field already stores the per-member amount, so no type change needed. Just compute correctly per mode before calling `saveExpense`.

---

## Change 5 — Enhanced Balances View

### What

Completely replace the `view === 'balances'` section in `ExpensesTab.tsx` with a **two-sub-tab layout**:

**Sub-tab A: "Trip Spend"** — How much each person has spent total

- Per-member card: emoji, name, total paid amount, total owed amount, net difference
- A mini progress bar showing their share of total trip spend
- Color-coded: green if they've paid more than their share, red if less

**Sub-tab B: "Who Owes"** — Net settlement debts

- Computes the minimal settlement transactions using a greedy algorithm:
  - Find who is owed most (creditor) and who owes most (debtor)
  - Create a transaction between them for the smaller of the two amounts
  - Repeat until all balances are zero
- Shows settlement cards: `"Luca → Sophie: $24.80"` with a "Mark Settled" button
- "Mark Settled" removes that debt from the balance (persists in localStorage as `settlements_[tripId]`)
- Settlement records stored as `{ from: memberId, to: memberId, amount: number, settledAt: string }`

### New Storage Key

Add `getSettlements` / `saveSettlement` to `storage.ts` for `settlements_[tripId]`.
Add `Settlement` interface to `types.ts`.

---

## Change 6 — Spend Analysis Tab

### What

Add a 4th tab to `ExpensesTab.tsx` alongside Expenses | Balances | Members: **"Analysis"**

### Content

1. **Total Spend Card** — big number, trip currency, period
2. **By Category** — horizontal bar chart (pure CSS, no library needed):
  - Each category row: emoji icon, category name, colored progress bar, amount + percentage
  - Sorted by spend descending
3. **By Member** — donut-style visual (CSS only):
  - Each member: emoji, name, amount paid, % of total
4. **Daily Spend** — simple pie chart (CSS):
  - One bar per trip day, height proportional to spend that day
  - Color-coded by the dominant category of that day

### Technical Approach

All charts are pure CSS/Tailwind (no recharts import needed for this simple data). The existing `recharts` library is available if needed for the daily bar chart.

---

## Files to Create / Modify

```text
NEW FILES:
  src/components/ui/LocationAutocomplete.tsx
  src/components/ui/LocationChipInput.tsx
  src/data/cities.ts  (embedded city dataset ~150 cities)

MODIFIED FILES:
  src/lib/types.ts              — add places?, Settlement interface
  src/lib/storage.ts            — add getSettlements/saveSettlement, fix currency default
  src/components/trips/NewTripModal.tsx    — add LocationAutocomplete, LocationChipInput, currency picker
  src/components/expenses/AddExpenseModal.tsx  — split mode selector (Equal/Custom/Percentage)
  src/components/expenses/ExpensesTab.tsx  — balances sub-tabs, Analysis tab, UI polish
```

---

## Sequence of Implementation

1. `src/data/cities.ts` — city dataset (no dependencies)
2. `src/lib/types.ts` — add `places`, `Settlement`
3. `src/lib/storage.ts` — add settlement helpers
4. `src/components/ui/LocationAutocomplete.tsx` — autocomplete component
5. `src/components/ui/LocationChipInput.tsx` — chip input component
6. `NewTripModal.tsx` — wire in both new components + currency selector
7. `AddExpenseModal.tsx` — split mode system
8. `ExpensesTab.tsx` — full rewrite of balances + new Analysis tab + UI polish