import {
  saveTrip,
  saveDocument,
  saveMember,
  saveExpense,
  saveItineraryItem,
  setPackingList,
  saveOOTDEntry,
  setBaseCurrency,
  isSeeded,
  markSeeded,
} from './storage';
import type {
  Trip,
  TravelDocument,
  TripMember,
  Expense,
  ItineraryItem,
  PackingItem,
  OOTDEntry,
} from './types';

export function seedDemoData() {
  if (isSeeded()) return;

  const tripId = 'paris-demo-001';

  const trip: Trip = {
    id: tripId,
    name: 'Paris Adventure 🗼',
    destination: 'Paris, France',
    startDate: '2026-03-10',
    endDate: '2026-03-12',
    emoji: '🗼',
    coverColor: 'coral',
    createdAt: new Date().toISOString(),
  };
  saveTrip(trip);

  // Members
  const members: TripMember[] = [
    { id: 'm1', tripId, name: 'You', emoji: '🧑', isYou: true },
    { id: 'm2', tripId, name: 'Sophie', emoji: '👩', isYou: false },
    { id: 'm3', tripId, name: 'Luca', emoji: '👨', isYou: false },
  ];
  members.forEach(saveMember);

  // Documents
  const docs: TravelDocument[] = [
    {
      id: 'd1', tripId, type: 'passport', category: 'docs',
      name: 'My Passport', number: 'P12345678',
      expiryDate: '2030-06-15', notes: 'Keep safe!', hasReminder: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'd2', tripId, type: 'flight', category: 'tickets',
      name: 'CDG → LHR Return', number: 'PNR: AF2847',
      expiryDate: '2026-03-12', notes: 'Window seat', hasReminder: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'd3', tripId, type: 'hotel', category: 'stays',
      name: 'Hôtel Le Marais', number: 'Booking: HLM-9921',
      expiryDate: '2026-03-12', notes: 'Check-in after 3 PM', hasReminder: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'd4', tripId, type: 'insurance', category: 'docs',
      name: 'Travel Insurance', number: 'POL-2026-TRV',
      expiryDate: '2026-03-12', notes: 'Covers medical + trip cancellation', hasReminder: true,
      createdAt: new Date().toISOString(),
    },
  ];
  docs.forEach(saveDocument);

  // Base currency
  setBaseCurrency(tripId, 'USD');

  // Expenses
  const expenses: Expense[] = [
    {
      id: 'e1', tripId, title: 'Dinner at Bistro',
      amount: 85, currency: 'EUR', baseCurrency: 'USD',
      convertedAmount: 91.80, rateUsed: 1.08,
      category: 'food', paidById: 'm1',
      splits: [{ memberId: 'm1', amount: 30.60 }, { memberId: 'm2', amount: 30.60 }, { memberId: 'm3', amount: 30.60 }],
      notes: 'Amazing French cuisine!', date: '2026-03-10', useManualRate: false,
    },
    {
      id: 'e2', tripId, title: 'Metro Day Pass',
      amount: 12, currency: 'EUR', baseCurrency: 'USD',
      convertedAmount: 12.96, rateUsed: 1.08,
      category: 'transport', paidById: 'm2',
      splits: [{ memberId: 'm1', amount: 4.32 }, { memberId: 'm2', amount: 4.32 }, { memberId: 'm3', amount: 4.32 }],
      date: '2026-03-10', useManualRate: false,
    },
    {
      id: 'e3', tripId, title: 'Louvre Museum Tickets',
      amount: 45, currency: 'EUR', baseCurrency: 'USD',
      convertedAmount: 48.60, rateUsed: 1.08,
      category: 'activities', paidById: 'm3',
      splits: [{ memberId: 'm1', amount: 16.20 }, { memberId: 'm2', amount: 16.20 }, { memberId: 'm3', amount: 16.20 }],
      notes: 'Book online for skip-the-line!', date: '2026-03-11', useManualRate: false,
    },
    {
      id: 'e4', tripId, title: 'Souvenir Shopping',
      amount: 3200, currency: 'INR', baseCurrency: 'USD',
      convertedAmount: 38.40, rateUsed: 0.012,
      category: 'shopping', paidById: 'm1',
      splits: [{ memberId: 'm1', amount: 38.40 }],
      date: '2026-03-11', useManualRate: false,
    },
    {
      id: 'e5', tripId, title: 'Airbnb Stay (3 nights)',
      amount: 320, currency: 'USD', baseCurrency: 'USD',
      convertedAmount: 320, rateUsed: 1,
      category: 'stay', paidById: 'm1',
      splits: [{ memberId: 'm1', amount: 106.67 }, { memberId: 'm2', amount: 106.67 }, { memberId: 'm3', amount: 106.67 }],
      date: '2026-03-10', useManualRate: false,
    },
  ];
  expenses.forEach(saveExpense);

  // Itinerary
  const itinerary: ItineraryItem[] = [
    { id: 'i1', tripId, day: 1, time: '10:00', place: 'CDG Airport', activity: 'Arrive & clear customs', category: 'travel', order: 0 },
    { id: 'i2', tripId, day: 1, time: '13:00', place: 'Hôtel Le Marais', activity: 'Check-in & freshen up', category: 'hotel', order: 1 },
    { id: 'i3', tripId, day: 1, time: '15:00', place: 'Le Marais Quarter', activity: 'Explore street art & cafes', category: 'sightseeing', notes: 'Pick up pastries!', order: 2 },
    { id: 'i4', tripId, day: 1, time: '20:00', place: 'Bistro Saint-Louis', activity: 'Welcome dinner', category: 'food', order: 3 },
    { id: 'i5', tripId, day: 2, time: '09:00', place: 'Louvre Museum', activity: 'Morning visit — Mona Lisa!', category: 'sightseeing', notes: 'Book tickets in advance', order: 0 },
    { id: 'i6', tripId, day: 2, time: '13:00', place: 'Café de Flore', activity: 'Classic Parisian lunch', category: 'food', order: 1 },
    { id: 'i7', tripId, day: 2, time: '15:30', place: 'Eiffel Tower', activity: 'Eiffel Tower + Trocadero views', category: 'sightseeing', order: 2 },
    { id: 'i8', tripId, day: 2, time: '19:00', place: 'Champs-Élysées', activity: 'Shopping & evening stroll', category: 'shopping', order: 3 },
    { id: 'i9', tripId, day: 3, time: '08:00', place: 'Hôtel Le Marais', activity: 'Checkout', category: 'hotel', order: 0 },
    { id: 'i10', tripId, day: 3, time: '10:00', place: 'Montmartre', activity: 'Sacré-Cœur & artists village', category: 'sightseeing', order: 1 },
    { id: 'i11', tripId, day: 3, time: '13:00', place: 'Rue Lepic Market', activity: 'Picnic lunch from the market', category: 'food', order: 2 },
    { id: 'i12', tripId, day: 3, time: '17:00', place: 'CDG Airport', activity: 'Head to airport for departure', category: 'travel', order: 3 },
  ];
  itinerary.forEach(saveItineraryItem);

  // Packing
  const packingItems: PackingItem[] = [
    // Clothes
    { id: 'p1', tripId, category: 'clothes', name: 'Jeans (x2)', isPacked: true, isCustom: false },
    { id: 'p2', tripId, category: 'clothes', name: 'T-shirts (x3)', isPacked: true, isCustom: false },
    { id: 'p3', tripId, category: 'clothes', name: 'Light jacket', isPacked: true, isCustom: false },
    { id: 'p4', tripId, category: 'clothes', name: 'Comfortable shoes', isPacked: false, isCustom: false },
    { id: 'p5', tripId, category: 'clothes', name: 'Socks & underwear', isPacked: false, isCustom: false },
    // Toiletries
    { id: 'p6', tripId, category: 'toiletries', name: 'Toothbrush & toothpaste', isPacked: true, isCustom: false },
    { id: 'p7', tripId, category: 'toiletries', name: 'Shampoo (travel size)', isPacked: true, isCustom: false },
    { id: 'p8', tripId, category: 'toiletries', name: 'Sunscreen SPF 50', isPacked: false, isCustom: false },
    { id: 'p9', tripId, category: 'toiletries', name: 'Deodorant', isPacked: true, isCustom: false },
    // Electronics
    { id: 'p10', tripId, category: 'electronics', name: 'Phone charger', isPacked: true, isCustom: false },
    { id: 'p11', tripId, category: 'electronics', name: 'Universal adapter', isPacked: false, isCustom: false },
    { id: 'p12', tripId, category: 'electronics', name: 'Earphones', isPacked: true, isCustom: false },
    { id: 'p13', tripId, category: 'electronics', name: 'Power bank', isPacked: false, isCustom: false },
    // Documents
    { id: 'p14', tripId, category: 'documents', name: 'Passport', isPacked: true, isCustom: false },
    { id: 'p15', tripId, category: 'documents', name: 'Travel insurance', isPacked: true, isCustom: false },
    { id: 'p16', tripId, category: 'documents', name: 'Printed hotel booking', isPacked: false, isCustom: false },
    // Medicines
    { id: 'p17', tripId, category: 'medicines', name: 'Paracetamol', isPacked: true, isCustom: false },
    { id: 'p18', tripId, category: 'medicines', name: 'Allergy meds', isPacked: false, isCustom: false },
    // Accessories
    { id: 'p19', tripId, category: 'accessories', name: 'Sunglasses', isPacked: true, isCustom: false },
    { id: 'p20', tripId, category: 'accessories', name: 'Travel pillow', isPacked: false, isCustom: false },
    { id: 'p21', tripId, category: 'accessories', name: 'Reusable water bottle', isPacked: false, isCustom: false },
  ];
  setPackingList(tripId, packingItems);

  // OOTD
  const ootd: OOTDEntry[] = [
    { id: 'o1', tripId, day: 1, outfitName: 'Arrival Chic', description: 'Dark jeans, white tee, beige trench coat — classic arrival look', createdAt: new Date().toISOString() },
    { id: 'o2', tripId, day: 2, outfitName: 'Museum Day', description: 'Black skinny jeans, striped Breton top, white sneakers', createdAt: new Date().toISOString() },
    { id: 'o3', tripId, day: 3, outfitName: 'Montmartre Vibes', description: 'Floral dress over turtleneck, ankle boots — très Parisien!', createdAt: new Date().toISOString() },
  ];
  ootd.forEach(saveOOTDEntry);

  markSeeded();
}
