
## Travel Companion App — MVP Plan

A mobile-first travel companion app with **local storage persistence** and a **Bold & Vibrant** design style (rich colors, strong contrast, energetic explorer aesthetic). All data saves in the browser — no backend required.

---

### Design System
- **Color palette**: Deep navy + vibrant coral/orange accent + teal highlights
- **Typography**: Bold headers, clean body text
- **Components**: Rounded cards with strong shadows, vivid tab bars, floating action buttons
- **Layout**: Mobile-first (max ~430px centered), bottom tab navigation

---

### Screen 1: Home Dashboard (`/`)
- App header with logo and "My Trips" title
- **Active trip card** (hero) — destination, dates, countdown
- **Quick summary row**: Docs count, Total expenses, Today's itinerary item, Packing % complete
- **My Trips** list — tappable cards showing trip name, destination, dates, status badge
- **+ New Trip** floating action button → opens trip creation modal
  - Fields: Trip name, destination, start/end dates
  - Auto-generates 4 tabs for the trip

---

### Screen 2: Trip Detail — 4-Tab Layout (`/trip/:id`)
Each trip has bottom tabs: **Docs | Expenses | Itinerary | Packing**

---

### Tab 1: Documents Vault
- Category filter chips: All / Docs / Tickets / Stays / Other
- Document cards showing: icon (passport, ticket, hotel, etc.), name, type, expiry/PNR, category badge
- **Lock/Unlock** button at the top (mocked PIN entry modal — shows a 4-digit keypad UI, stores PIN in local storage)
- **Search bar** for filtering documents
- **+ Add Document** button → modal/sheet with:
  - Document type selector (Passport, Visa, Flight Ticket, Hotel Booking, Travel Insurance, ID Card, Other)
  - Name, document number / PNR / Booking ID
  - Expiry date (with reminder toggle)
  - Notes field
  - Photo placeholder (upload UI, stored as local reference)
- Sample documents pre-loaded for demo

---

### Tab 2: Expense Split
- **Trip currency selector** (base currency: USD, EUR, INR, GBP, etc.)
- **Balance summary banner**: "You are owed $X" or "You owe $X"
- **Expense list** — cards with: amount (original + converted), category icon, who paid, split info
- **Balances tab** (toggle): "Who owes whom" settlement summary table
- **+ Add Expense** button → modal with:
  - Amount + currency selector (with mocked live rate conversion shown inline)
  - Category (food, transport, stay, shopping, activities, misc)
  - Paid by (trip member selector)
  - Split with (checkboxes: equal or custom amount per person)
  - Notes
  - Shows: "≈ $X USD at rate 1 EUR = 1.08 USD" (mocked exchange rates hardcoded)
  - Manual rate override toggle
- **Members** section — add/remove trip members (name, emoji/avatar)

---

### Tab 3: Itinerary Planner
- **Day tabs** across the top (Day 1, Day 2, Day 3… based on trip dates)
- **Timeline view** — vertical card stack per day with time, place, activity, category icon, notes
- Category color coding: 🚗 Travel (blue), 🏨 Hotel (purple), 🗺️ Sightseeing (teal), 🍽️ Food (orange), 🛍️ Shopping (pink)
- **Drag to reorder** items within a day
- **+ Add Item** button → modal with: time picker, place name, activity description, category, notes
- **Map pins section** at the bottom — simple text list of saved place names for the day (no real map, just a styled placeholder card)
- Sample itinerary pre-loaded for demo

---

### Tab 4: Packing + OOTD
**Two sub-tabs: Packing | OOTD**

**Packing Checklist:**
- Category sections: Clothes, Toiletries, Electronics, Documents, Medicines, Accessories
- Checkbox list — tap to mark packed (strikethrough + green check)
- Progress bar at top: "12 of 24 items packed"
- **+ Add Custom Item** per category
- Pre-loaded smart packing list based on trip duration

**OOTD (Outfit of the Day):**
- Day cards linked to itinerary days (Day 1, Day 2…)
- Each day card: Outfit name, color/style notes, optional photo placeholder
- **+ Add OOTD** per day → mini form: outfit name, description/notes, photo placeholder button
- Swipeable OOTD cards per day

---

### Data Architecture (Local Storage)
All data stored in browser localStorage:
- `trips` — array of trip objects
- `documents_[tripId]` — documents per trip
- `expenses_[tripId]` — expenses per trip
- `members_[tripId]` — trip members
- `itinerary_[tripId]` — day-wise itinerary items
- `packing_[tripId]` — packing list with checked state
- `ootd_[tripId]` — OOTD entries per day
- `vault_pin` — mocked passcode for documents vault

---

### Sample Data
App ships with **1 pre-filled demo trip** ("Paris Adventure 🗼") complete with:
- 4 sample documents
- 5 expenses across 3 currencies (EUR, USD, INR) with mocked exchange rates
- 3-day itinerary with 4 activities per day
- Pre-filled packing list (partially checked)
- OOTD for each day

This gives a fully explorable prototype on first load.

---

### Pages / Routes
- `/` — Home Dashboard (trip list)
- `/trip/:id` — Trip detail with 4 tabs
- `/trip/:id/docs` — Documents tab
- `/trip/:id/expenses` — Expenses tab
- `/trip/:id/itinerary` — Itinerary tab
- `/trip/:id/packing` — Packing + OOTD tab
