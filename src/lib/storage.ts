import type {
  Trip,
  TravelDocument,
  Expense,
  TripMember,
  ItineraryItem,
  PackingItem,
  OOTDEntry,
  Currency,
} from './types';

// --- Generic helpers ---
function getItem<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function setItem<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// --- Trips ---
export const getTrips = (): Trip[] => getItem<Trip[]>('trips', []);
export const setTrips = (trips: Trip[]) => setItem('trips', trips);
export const getTrip = (id: string): Trip | undefined => getTrips().find(t => t.id === id);

export function saveTrip(trip: Trip): void {
  const trips = getTrips();
  const idx = trips.findIndex(t => t.id === trip.id);
  if (idx >= 0) trips[idx] = trip;
  else trips.unshift(trip);
  setTrips(trips);
}

export function deleteTrip(id: string): void {
  setTrips(getTrips().filter(t => t.id !== id));
  localStorage.removeItem(`documents_${id}`);
  localStorage.removeItem(`expenses_${id}`);
  localStorage.removeItem(`members_${id}`);
  localStorage.removeItem(`itinerary_${id}`);
  localStorage.removeItem(`packing_${id}`);
  localStorage.removeItem(`ootd_${id}`);
  localStorage.removeItem(`base_currency_${id}`);
}

// --- Documents ---
export const getDocuments = (tripId: string): TravelDocument[] =>
  getItem<TravelDocument[]>(`documents_${tripId}`, []);
export const setDocuments = (tripId: string, docs: TravelDocument[]) =>
  setItem(`documents_${tripId}`, docs);

export function saveDocument(doc: TravelDocument): void {
  const docs = getDocuments(doc.tripId);
  const idx = docs.findIndex(d => d.id === doc.id);
  if (idx >= 0) docs[idx] = doc;
  else docs.unshift(doc);
  setDocuments(doc.tripId, docs);
}

export function deleteDocument(tripId: string, docId: string): void {
  setDocuments(tripId, getDocuments(tripId).filter(d => d.id !== docId));
}

// --- Members ---
export const getMembers = (tripId: string): TripMember[] =>
  getItem<TripMember[]>(`members_${tripId}`, []);
export const setMembers = (tripId: string, members: TripMember[]) =>
  setItem(`members_${tripId}`, members);

export function saveMember(member: TripMember): void {
  const members = getMembers(member.tripId);
  const idx = members.findIndex(m => m.id === member.id);
  if (idx >= 0) members[idx] = member;
  else members.push(member);
  setMembers(member.tripId, members);
}

export function deleteMember(tripId: string, memberId: string): void {
  setMembers(tripId, getMembers(tripId).filter(m => m.id !== memberId));
}

// --- Expenses ---
export const getExpenses = (tripId: string): Expense[] =>
  getItem<Expense[]>(`expenses_${tripId}`, []);
export const setExpenses = (tripId: string, expenses: Expense[]) =>
  setItem(`expenses_${tripId}`, expenses);

export function saveExpense(expense: Expense): void {
  const expenses = getExpenses(expense.tripId);
  const idx = expenses.findIndex(e => e.id === expense.id);
  if (idx >= 0) expenses[idx] = expense;
  else expenses.unshift(expense);
  setExpenses(expense.tripId, expenses);
}

export function deleteExpense(tripId: string, expenseId: string): void {
  setExpenses(tripId, getExpenses(tripId).filter(e => e.id !== expenseId));
}

export const getBaseCurrency = (tripId: string): Currency =>
  getItem<Currency>(`base_currency_${tripId}`, 'USD');
export const setBaseCurrency = (tripId: string, currency: Currency) =>
  setItem(`base_currency_${tripId}`, currency);

// --- Itinerary ---
export const getItinerary = (tripId: string): ItineraryItem[] =>
  getItem<ItineraryItem[]>(`itinerary_${tripId}`, []);
export const setItinerary = (tripId: string, items: ItineraryItem[]) =>
  setItem(`itinerary_${tripId}`, items);

export function saveItineraryItem(item: ItineraryItem): void {
  const items = getItinerary(item.tripId);
  const idx = items.findIndex(i => i.id === item.id);
  if (idx >= 0) items[idx] = item;
  else items.push(item);
  setItinerary(item.tripId, items);
}

export function deleteItineraryItem(tripId: string, itemId: string): void {
  setItinerary(tripId, getItinerary(tripId).filter(i => i.id !== itemId));
}

// --- Packing ---
export const getPackingList = (tripId: string): PackingItem[] =>
  getItem<PackingItem[]>(`packing_${tripId}`, []);
export const setPackingList = (tripId: string, items: PackingItem[]) =>
  setItem(`packing_${tripId}`, items);

export function savePackingItem(item: PackingItem): void {
  const items = getPackingList(item.tripId);
  const idx = items.findIndex(i => i.id === item.id);
  if (idx >= 0) items[idx] = item;
  else items.push(item);
  setPackingList(item.tripId, items);
}

export function deletePackingItem(tripId: string, itemId: string): void {
  setPackingList(tripId, getPackingList(tripId).filter(i => i.id !== itemId));
}

// --- OOTD ---
export const getOOTD = (tripId: string): OOTDEntry[] =>
  getItem<OOTDEntry[]>(`ootd_${tripId}`, []);
export const setOOTD = (tripId: string, entries: OOTDEntry[]) =>
  setItem(`ootd_${tripId}`, entries);

export function saveOOTDEntry(entry: OOTDEntry): void {
  const entries = getOOTD(entry.tripId);
  const idx = entries.findIndex(e => e.id === entry.id);
  if (idx >= 0) entries[idx] = entry;
  else entries.push(entry);
  setOOTD(entry.tripId, entries);
}

export function deleteOOTDEntry(tripId: string, entryId: string): void {
  setOOTD(tripId, getOOTD(tripId).filter(e => e.id !== entryId));
}

// --- Vault PIN ---
export const getVaultPin = (): string | null => localStorage.getItem('vault_pin');
export const setVaultPin = (pin: string) => localStorage.setItem('vault_pin', pin);

// --- Seed check ---
export const isSeeded = (): boolean => localStorage.getItem('app_seeded') === 'true';
export const markSeeded = () => localStorage.setItem('app_seeded', 'true');
