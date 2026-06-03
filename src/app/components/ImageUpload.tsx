import { useState, useRef } from 'react';
import { storageApi, validateImageUpload } from '../lib/supabase';
import { showToast } from '../lib/toast';

interface ImageUploadProps {
  bucket: 'product-images' | 'blog-images' | 'site-assets';
  current?: string;
  onUploaded: (url: string) => void;
  label?: string;
}

export function ImageUpload({ bucket, current, onUploaded, label = 'Image' }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview,   setPreview]   = useState(current ?? '');
  const [error,     setError]     = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validationError = validateImageUpload(file);
    if (validationError) {
      setError(validationError);
      showToast(validationError, 'error');
      e.target.value = '';
      return;
    }
    setError(''); setUploading(true);
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    const url = await storageApi.upload(bucket, file);
    // Always revoke the blob URL to prevent memory leaks
    URL.revokeObjectURL(localUrl);
    setUploading(false);
    if (url) { onUploaded(url); setPreview(url); }
    else { setError('Upload failed. Check Supabase storage config.'); setPreview(current ?? ''); }
    e.target.value = '';
  };

  return (
    <div>
      <label className="field-label">{label}</label>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Preview */}
        <div onClick={() => inputRef.current?.click()} style={{
          width: 100, height: 80, borderRadius: 'var(--radius-md)',
          background: 'var(--bg-card2)', border: '1px dashed var(--border-light)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', cursor: 'pointer', flexShrink: 0,
          transition: 'border-color 0.2s',
        }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--gold)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-light)')}>
          {preview ? (
            <img src={preview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: 24, opacity: 0.4 }}>{uploading ? '⏳' : '📷'}</span>
          )}
        </div>
        {/* URL or upload */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input type="text" className="field" placeholder="/images/product.webp or https://..."
            value={preview}
            onChange={e => {
              const val = e.target.value.trim();
              // BUG-013 FIX: Reject javascript: protocol and non-https external URLs
              if (val.toLowerCase().startsWith('javascript:')) {
                setError('Invalid URL: javascript: protocol is not allowed.');
                return;
              }
              if (val && !val.startsWith('/') && !val.startsWith('https://') && !val.startsWith('http://localhost')) {
                setError('Only relative paths (/) or https:// URLs are allowed.');
                return;
              }
              setError('');
              setPreview(val);
              onUploaded(val);
            }} />
          <button type="button" className="btn btn-dark btn-sm" onClick={() => inputRef.current?.click()}
            disabled={uploading} style={{ alignSelf: 'flex-start' }}>
            {uploading ? 'Uploading…' : '↑ Upload File'}
          </button>
          {error && <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: '#F87171' }}>{error}</p>}
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handle} style={{ display: 'none' }} />
    </div>
  );
}
