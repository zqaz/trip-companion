import { useState } from 'react';
import { Search, Plus, Lock, Unlock, FileText, Plane, Hotel, Shield, CreditCard, FileCheck, File } from 'lucide-react';
import { getDocuments, deleteDocument } from '@/lib/storage';
import type { TravelDocument, DocumentCategory, DocumentType } from '@/lib/types';
import { format, parseISO, isAfter, addDays } from 'date-fns';
import AddDocumentModal from './AddDocumentModal';
import PinModal from './PinModal';
import { cn } from '@/lib/utils';

const DOC_TYPE_ICONS: Record<DocumentType, React.ReactNode> = {
  passport: <FileCheck className="w-5 h-5" />,
  visa: <CreditCard className="w-5 h-5" />,
  flight: <Plane className="w-5 h-5" />,
  hotel: <Hotel className="w-5 h-5" />,
  insurance: <Shield className="w-5 h-5" />,
  id: <FileText className="w-5 h-5" />,
  other: <File className="w-5 h-5" />,
};

const DOC_TYPE_COLORS: Record<DocumentType, string> = {
  passport: 'text-primary bg-primary/20',
  visa: 'text-teal bg-teal/20',
  flight: 'text-gold bg-gold/20',
  hotel: 'text-purple bg-purple/20',
  insurance: 'text-secondary bg-secondary/20',
  id: 'text-pink bg-pink/20',
  other: 'text-muted-foreground bg-muted',
};

const CAT_LABELS: Record<DocumentCategory, string> = {
  docs: 'Docs',
  tickets: 'Tickets',
  stays: 'Stays',
  other: 'Other',
};

const CATEGORIES: DocumentCategory[] = ['docs', 'tickets', 'stays', 'other'];

interface Props {
  tripId: string;
}

export default function DocumentsTab({ tripId }: Props) {
  const [isLocked, setIsLocked] = useState(true);
  const [showPin, setShowPin] = useState(false);
  const [pinMode, setPinMode] = useState<'lock' | 'unlock' | 'set'>('unlock');
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<DocumentCategory | 'all'>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [, setRefresh] = useState(0);

  const allDocs = getDocuments(tripId);
  const filtered = allDocs.filter(d => {
    const matchCat = activeCategory === 'all' || d.category === activeCategory;
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase()) || d.number.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  function handleLockToggle() {
    setPinMode(isLocked ? 'unlock' : 'lock');
    setShowPin(true);
  }

  function handlePinSuccess() {
    setIsLocked(prev => !prev);
    setShowPin(false);
  }

  function handleDelete(doc: TravelDocument) {
    deleteDocument(tripId, doc.id);
    setRefresh(r => r + 1);
  }

  if (isLocked) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-12">
        <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center mb-4">
          <Lock className="w-9 h-9 text-muted-foreground" />
        </div>
        <h3 className="text-foreground font-black text-xl mb-2">Vault Locked 🔐</h3>
        <p className="text-muted-foreground text-sm text-center mb-6">Your travel documents are secured. Enter your PIN to access them.</p>
        <button
          onClick={handleLockToggle}
          className="px-6 py-3 rounded-2xl gradient-hero text-white font-bold text-sm"
        >
          Unlock Vault
        </button>
        {showPin && (
          <PinModal mode={pinMode} onSuccess={handlePinSuccess} onClose={() => setShowPin(false)} />
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="px-4 pt-2 pb-3 flex-shrink-0 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-foreground font-black text-lg">Documents Vault</h3>
          <button
            onClick={handleLockToggle}
            className="flex items-center gap-1.5 text-xs font-bold text-secondary bg-secondary/20 px-3 py-1.5 rounded-full"
          >
            <Unlock className="w-3.5 h-3.5" />
            Unlocked
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search documents..."
            className="w-full bg-muted border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {['all', ...CATEGORIES].map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat as DocumentCategory | 'all')}
              className={cn(
                'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all',
                activeCategory === cat
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {cat === 'all' ? 'All' : CAT_LABELS[cat as DocumentCategory]}
            </button>
          ))}
        </div>
      </div>

      {/* Document list */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-4 space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">📄</p>
            <p className="text-muted-foreground text-sm">No documents yet</p>
          </div>
        ) : (
          filtered.map(doc => (
            <DocumentCard key={doc.id} doc={doc} onDelete={() => handleDelete(doc)} />
          ))
        )}
      </div>

      {/* Add button */}
      <div className="px-4 pb-4 pt-2 flex-shrink-0">
        <button
          onClick={() => setShowAdd(true)}
          className="w-full py-3.5 rounded-2xl gradient-hero text-white font-bold text-sm flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Document
        </button>
      </div>

      {showAdd && (
        <AddDocumentModal
          tripId={tripId}
          onClose={() => setShowAdd(false)}
          onSaved={() => { setRefresh(r => r + 1); setShowAdd(false); }}
        />
      )}

      {showPin && (
        <PinModal mode={pinMode} onSuccess={handlePinSuccess} onClose={() => setShowPin(false)} />
      )}
    </div>
  );
}

function DocumentCard({ doc, onDelete }: { doc: TravelDocument; onDelete: () => void }) {
  const isExpiringSoon = doc.expiryDate && isAfter(parseISO(doc.expiryDate), new Date()) && !isAfter(parseISO(doc.expiryDate), addDays(new Date(), 30));
  const isExpired = doc.expiryDate && !isAfter(parseISO(doc.expiryDate), new Date());

  return (
    <div className="bg-card border border-border rounded-2xl p-4 card-shadow animate-fade-in">
      <div className="flex items-start gap-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', DOC_TYPE_COLORS[doc.type])}>
          {DOC_TYPE_ICONS[doc.type]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-foreground font-bold text-sm leading-tight">{doc.name}</p>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground flex-shrink-0 capitalize">{doc.category}</span>
          </div>
          <p className="text-muted-foreground text-xs mt-1">{doc.number}</p>
          {doc.expiryDate && (
            <p className={cn('text-xs mt-1', isExpired ? 'text-destructive font-bold' : isExpiringSoon ? 'text-gold font-bold' : 'text-muted-foreground')}>
              {isExpired ? '⚠️ Expired' : isExpiringSoon ? '⏰ Expiring soon'  : '📅'} {format(parseISO(doc.expiryDate), 'MMM d, yyyy')}
            </p>
          )}
          {doc.notes && <p className="text-muted-foreground text-xs mt-1 italic">"{doc.notes}"</p>}
        </div>
      </div>
      <div className="flex justify-end mt-2">
        <button onClick={onDelete} className="text-xs text-destructive/70 hover:text-destructive">Delete</button>
      </div>
    </div>
  );
}
