import { useState } from 'react';
import { Search, Plus, Lock, Unlock, FileText, Plane, Hotel, Shield, CreditCard, FileCheck, File, Eye, Pencil, X, ExternalLink } from 'lucide-react';
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
  startDate?: string;
  endDate?: string;
}

export default function DocumentsTab({ tripId, startDate, endDate }: Props) {
  const [isLocked, setIsLocked] = useState(true);
  const [showPin, setShowPin] = useState(false);
  const [pinMode, setPinMode] = useState<'lock' | 'unlock' | 'set'>('unlock');
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<DocumentCategory | 'all'>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [editDoc, setEditDoc] = useState<TravelDocument | null>(null);
  const [previewDoc, setPreviewDoc] = useState<TravelDocument | null>(null);
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

  function refresh() { setRefresh(r => r + 1); }

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
          <PinModal tripId={tripId} mode={pinMode} onSuccess={handlePinSuccess} onClose={() => setShowPin(false)} />
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

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search documents..."
            className="w-full bg-muted border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {(['all', ...CATEGORIES] as const).map(cat => (
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
            <DocumentCard
              key={doc.id}
              doc={doc}
              onDelete={() => handleDelete(doc)}
              onPreview={() => setPreviewDoc(doc)}
              onEdit={() => setEditDoc(doc)}
            />
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
          tripStartDate={startDate}
          tripEndDate={endDate}
          onClose={() => setShowAdd(false)}
          onSaved={() => { refresh(); setShowAdd(false); }}
        />
      )}

      {editDoc && (
        <AddDocumentModal
          tripId={tripId}
          tripStartDate={startDate}
          tripEndDate={endDate}
          docToEdit={editDoc}
          onClose={() => setEditDoc(null)}
          onSaved={() => { refresh(); setEditDoc(null); }}
        />
      )}

      {previewDoc && (
        <DocumentPreviewModal
          doc={previewDoc}
          onClose={() => setPreviewDoc(null)}
        />
      )}

      {showPin && (
        <PinModal tripId={tripId} mode={pinMode} onSuccess={handlePinSuccess} onClose={() => setShowPin(false)} />
      )}
    </div>
  );
}

function DocumentCard({ doc, onDelete, onPreview, onEdit }: {
  doc: TravelDocument;
  onDelete: () => void;
  onPreview: () => void;
  onEdit: () => void;
}) {
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
          {doc.number && <p className="text-muted-foreground text-xs mt-1">{doc.number}</p>}
          {doc.expiryDate && (
            <p className={cn('text-xs mt-1', isExpired ? 'text-destructive font-bold' : isExpiringSoon ? 'text-gold font-bold' : 'text-muted-foreground')}>
              {isExpired ? '⚠️ Expired' : isExpiringSoon ? '⏰ Expiring soon' : '📅'} {format(parseISO(doc.expiryDate), 'MMM d, yyyy')}
            </p>
          )}
          {doc.photoRef && (
            <p className="text-xs text-primary mt-1">📎 Attachment</p>
          )}
        </div>
      </div>
      <div className="flex items-center justify-end gap-3 mt-3 border-t border-border/50 pt-2">
        <button onClick={onPreview} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-semibold">
          <Eye className="w-3.5 h-3.5" /> Preview
        </button>
        <button onClick={onEdit} className="flex items-center gap-1 text-xs text-foreground/70 hover:text-foreground font-semibold">
          <Pencil className="w-3.5 h-3.5" /> Edit
        </button>
        <button onClick={onDelete} className="text-xs text-destructive/70 hover:text-destructive font-semibold">Delete</button>
      </div>
    </div>
  );
}

function DocumentPreviewModal({ doc, onClose }: { doc: TravelDocument; onClose: () => void }) {
  const isPdf = doc.photoRef?.startsWith('data:application/pdf');
  const isImage = doc.photoRef && !isPdf;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-mobile bg-card rounded-t-3xl px-5 pb-10 pt-5 animate-slide-up max-h-[85vh] overflow-y-auto scrollbar-hide">
        <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-5" />
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-foreground font-black text-xl">Document Details</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        <div className="space-y-4">
          {/* Attachment preview */}
          {isImage && (
            <div className="rounded-xl overflow-hidden border border-border">
              <img src={doc.photoRef} alt="Document attachment" className="w-full object-contain max-h-64" />
            </div>
          )}
          {isPdf && (
            <div className="space-y-2">
              <div className="flex items-center gap-3 bg-muted rounded-xl p-4">
                <FileText className="w-8 h-8 text-primary" />
                <div className="flex-1">
                  <span className="text-sm font-semibold text-foreground">PDF Attached</span>
                  <p className="text-xs text-muted-foreground mt-0.5">Tap below to open in a new tab</p>
                </div>
              </div>
              <button
                onClick={() => {
                  const win = window.open('', '_blank');
                  if (win) {
                    win.document.write(`<html><body style="margin:0;background:#111"><iframe src="${doc.photoRef}" style="width:100%;height:100vh;border:none"></iframe></body></html>`);
                    win.document.close();
                  }
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/20 text-primary text-sm font-semibold"
              >
                <ExternalLink className="w-4 h-4" /> Open PDF
              </button>
            </div>
          )}

          <div className="space-y-3">
            <Row label="Name" value={doc.name} />
            <Row label="Type" value={doc.type.charAt(0).toUpperCase() + doc.type.slice(1)} />
            {doc.number && <Row label="Number / ID" value={doc.number} />}
            {doc.expiryDate && <Row label="Expiry / Travel Date" value={format(parseISO(doc.expiryDate), 'MMMM d, yyyy')} />}
            <Row label="Reminder" value={doc.hasReminder ? 'Enabled' : 'Off'} />
            {doc.notes && <Row label="Notes" value={doc.notes} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 bg-muted rounded-xl px-4 py-3">
      <span className="text-muted-foreground text-xs font-semibold w-32 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-foreground text-sm flex-1">{value}</span>
    </div>
  );
}
