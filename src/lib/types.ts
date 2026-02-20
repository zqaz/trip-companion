export interface Trip {
  id: string;
  name: string;
  destination: string;
  places?: string[];
  startDate: string;
  endDate: string;
  emoji: string;
  coverColor: string;
  createdAt: string;
}

export interface Settlement {
  id: string;
  tripId: string;
  from: string; // memberId
  to: string;   // memberId
  amount: number;
  settledAt: string;
}

export type DocumentCategory = 'docs' | 'tickets' | 'stays' | 'other';
export type DocumentType =
  | 'passport'
  | 'visa'
  | 'flight'
  | 'hotel'
  | 'insurance'
  | 'id'
  | 'other';

export interface TravelDocument {
  id: string;
  tripId: string;
  type: DocumentType;
  category: DocumentCategory;
  name: string;
  number: string;
  expiryDate?: string;
  notes?: string;
  hasReminder: boolean;
  photoRef?: string;
  createdAt: string;
}

export type ExpenseCategory = 'food' | 'transport' | 'stay' | 'shopping' | 'activities' | 'misc';
export type Currency = 'USD' | 'EUR' | 'INR' | 'GBP' | 'JPY' | 'AUD' | 'CAD';

export interface TripMember {
  id: string;
  tripId: string;
  name: string;
  emoji: string;
  isYou: boolean;
}

export interface ExpenseSplit {
  memberId: string;
  amount: number;
}

export interface Expense {
  id: string;
  tripId: string;
  title: string;
  amount: number;
  currency: Currency;
  baseCurrency: Currency;
  convertedAmount: number;
  rateUsed: number;
  category: ExpenseCategory;
  paidById: string;
  splits: ExpenseSplit[];
  notes?: string;
  date: string;
  useManualRate: boolean;
}

export type ItineraryCategory = 'travel' | 'hotel' | 'sightseeing' | 'food' | 'shopping';

export interface ItineraryItem {
  id: string;
  tripId: string;
  day: number;
  time: string;
  place: string;
  activity: string;
  category: ItineraryCategory;
  notes?: string;
  order: number;
}

export type PackingCategory = 'clothes' | 'toiletries' | 'electronics' | 'documents' | 'medicines' | 'accessories';

export interface PackingItem {
  id: string;
  tripId: string;
  category: PackingCategory;
  name: string;
  isPacked: boolean;
  isCustom: boolean;
}

export interface OOTDEntry {
  id: string;
  tripId: string;
  day: number;
  outfitName: string;
  description?: string;
  photoRef?: string;
  createdAt: string;
}
