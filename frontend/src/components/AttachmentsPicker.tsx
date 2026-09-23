import { useEffect, useRef, useState } from 'react';
import { getUploadUrls, getViewUrls, uploadToSignedUrl } from '../api/storage';
import { ImagePlus, X, Loader2 } from 'lucide-react';

// Downscale + re-encode to JPEG before upload, so receipts stay ~1600px and a
// couple hundred KB instead of multi-MB phone photos. Everything becomes JPEG,
// which keeps the upload content-type simple and within the bucket's limits.
async function compress(file: File, maxDim = 1600, quality = 0.7): Promise<Blob> {
  const bitmap = await createBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h);
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Could not process image'))), 'image/jpeg', quality));
}

// Prefer createImageBitmap (fast, handles HEIC on Safari); fall back to <img>.
async function createBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  try {
    return await createImageBitmap(file);
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

export default function AttachmentsPicker({ value, onChange, max = 10 }: {
  value: string[];
  onChange: (paths: string[]) => void;
  max?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [viewUrls, setViewUrls] = useState<Record<string, string>>({});   // server-signed, for existing paths
  const [localUrls, setLocalUrls] = useState<Record<string, string>>({}); // object URLs for just-added images
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Fetch signed preview URLs for any path we can't already show locally.
  useEffect(() => {
    const missing = value.filter(p => !viewUrls[p] && !localUrls[p]);
    if (missing.length === 0) return;
    getViewUrls(missing).then(map => setViewUrls(prev => ({ ...prev, ...map }))).catch(() => {});
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  // Revoke object URLs on unmount.
  useEffect(() => () => { Object.values(localUrls).forEach(u => URL.revokeObjectURL(u)); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = () => inputRef.current?.click();

  const onFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';  // allow re-selecting the same file later
    if (files.length === 0) return;
    const room = max - value.length;
    if (room <= 0) { setError(`Up to ${max} images`); return; }
    const take = files.slice(0, room);
    setBusy(true); setError('');
    try {
      const blobs = await Promise.all(take.map(f => compress(f)));
      const targets = await getUploadUrls(blobs.map(() => 'image/jpeg'));
      await Promise.all(targets.map((t, i) => uploadToSignedUrl(t.uploadUrl, blobs[i], 'image/jpeg')));
      const newLocal: Record<string, string> = {};
      targets.forEach((t, i) => { newLocal[t.path] = URL.createObjectURL(blobs[i]); });
      setLocalUrls(prev => ({ ...prev, ...newLocal }));
      onChange([...value, ...targets.map(t => t.path)]);
    } catch (err: any) {
      setError(err?.message || 'Upload failed. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const remove = (path: string) => {
    const u = localUrls[path];
    if (u) { URL.revokeObjectURL(u); setLocalUrls(prev => { const n = { ...prev }; delete n[path]; return n; }); }
    onChange(value.filter(p => p !== path));
  };

  return (
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Bills / Receipts</p>
      <div className="flex flex-wrap gap-2">
        {value.map(path => {
          const url = localUrls[path] ?? viewUrls[path];
          return (
            <div key={path} className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
              {url
                ? <img src={url} alt="receipt" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center"><Loader2 size={16} className="text-slate-300 animate-spin" /></div>}
              <button type="button" onClick={() => remove(path)}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-slate-900/70 text-white flex items-center justify-center active:bg-slate-900">
                <X size={12} strokeWidth={3} />
              </button>
            </div>
          );
        })}

        {value.length < max && (
          <button type="button" onClick={pick} disabled={busy}
            className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-1 text-slate-400 active:bg-slate-50 disabled:opacity-50 shrink-0">
            {busy ? <Loader2 size={20} className="animate-spin" /> : <ImagePlus size={20} />}
            <span className="text-[10px] font-semibold">{busy ? 'Uploading' : 'Add'}</span>
          </button>
        )}
      </div>

      <input ref={inputRef} type="file" accept="image/*" capture="environment" multiple hidden onChange={onFiles} />
      {error && <p className="text-xs text-rose-500 font-medium mt-1.5">{error}</p>}
    </div>
  );
}
