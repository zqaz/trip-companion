import { useRef, useState } from 'react';
import { Camera, Upload, X, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  value?: string; // base64 data URL
  onChange: (value: string | undefined) => void;
  className?: string;
}

const MAX_IMAGE_DIMENSION = 1200;
const IMAGE_QUALITY = 0.75;
const MAX_PDF_SIZE_MB = 5;

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
        if (width > height) {
          height = Math.round((height * MAX_IMAGE_DIMENSION) / width);
          width = MAX_IMAGE_DIMENSION;
        } else {
          width = Math.round((width * MAX_IMAGE_DIMENSION) / height);
          height = MAX_IMAGE_DIMENSION;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas not supported')); return; }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', IMAGE_QUALITY));
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Image load failed')); };
    img.src = objectUrl;
  });
}

export default function ImageUpload({ value, onChange, className }: Props) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isPdf = value?.startsWith('data:application/pdf');
  const isImage = value && !isPdf;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setLoading(true);

    try {
      if (file.type === 'application/pdf') {
        if (file.size > MAX_PDF_SIZE_MB * 1024 * 1024) {
          setError(`PDF must be under ${MAX_PDF_SIZE_MB}MB`);
          setLoading(false);
          return;
        }
        const reader = new FileReader();
        reader.onload = () => { onChange(reader.result as string); setLoading(false); };
        reader.onerror = () => { setError('Failed to read file'); setLoading(false); };
        reader.readAsDataURL(file);
      } else if (file.type.startsWith('image/')) {
        const compressed = await compressImage(file);
        onChange(compressed);
        setLoading(false);
      } else {
        setError('Only images and PDFs are supported');
        setLoading(false);
      }
    } catch {
      setError('Failed to process file');
      setLoading(false);
    }

    // Reset input so same file can be selected again
    e.target.value = '';
  }

  return (
    <div className={cn('space-y-2', className)}>
      {value ? (
        <div className="relative rounded-xl overflow-hidden border border-border bg-muted">
          {isImage ? (
            <img src={value} alt="Attached" className="w-full max-h-48 object-cover" />
          ) : (
            <div className="flex items-center gap-3 px-4 py-3">
              <FileText className="w-8 h-8 text-primary flex-shrink-0" />
              <span className="text-sm text-foreground font-semibold">PDF attached</span>
            </div>
          )}
          <button
            onClick={() => onChange(undefined)}
            className="absolute top-2 right-2 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-colors"
            type="button"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="border-2 border-dashed border-border rounded-xl p-4">
          {loading ? (
            <div className="flex items-center justify-center py-2">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="ml-2 text-sm text-muted-foreground">Processing…</span>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex-1 flex flex-col items-center gap-2 py-3 rounded-xl bg-muted hover:bg-muted/70 transition-colors"
              >
                <Camera className="w-5 h-5 text-primary" />
                <span className="text-xs font-semibold text-foreground">Take Photo</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex flex-col items-center gap-2 py-3 rounded-xl bg-muted hover:bg-muted/70 transition-colors"
              >
                <Upload className="w-5 h-5 text-primary" />
                <span className="text-xs font-semibold text-foreground">Upload File</span>
              </button>
            </div>
          )}
          <p className="text-center text-[10px] text-muted-foreground mt-2">Photo or PDF · max {MAX_PDF_SIZE_MB}MB</p>
        </div>
      )}

      {error && (
        <p className="text-destructive text-xs px-1">{error}</p>
      )}

      {/* Hidden inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
