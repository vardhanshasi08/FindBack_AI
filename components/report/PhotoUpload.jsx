const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useId, useRef, useState } from 'react';
import { Loader2, Upload, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import PrivateImage from '@/components/PrivateImage';
import { extractError } from '@/lib/errors';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic'];

/** Uploads a report photo to private storage (stored privately). */
export default function PhotoUpload({ value, onChange, label = 'Photograph (optional)' }) {
  const inputId = useId();
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    if (!ALLOWED.includes(file.type)) {
      setError('Please choose an image file (JPG, PNG, WEBP or GIF).');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('Photos must be 5 MB or smaller.');
      return;
    }
    setUploading(true);
    try {
      const res = await db.integrations.Core.UploadPrivateFile({ file });
      const uri = res?.file_uri;
      if (!uri) throw new Error('The upload did not return a file reference.');
      onChange(uri);
    } catch (err) {
      setError(extractError(err, 'The photo could not be uploaded. Please try again.'));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-foreground">{label}</p>
      <div className="flex items-start gap-4">
        <PrivateImage fileUri={value} alt="Report photo" className="h-24 w-24 shrink-0" />
        <div className="flex-1">
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleFile}
            disabled={uploading}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              {uploading ? 'Uploading…' : value ? 'Replace photo' : 'Add photo'}
            </Button>
            {value && (
              <Button type="button" variant="ghost" size="sm" onClick={() => onChange('')} disabled={uploading}>
                <X className="mr-2 h-4 w-4" /> Remove
              </Button>
            )}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Stored privately — only you, the matched counterpart and the Global Admin can open it. Up to 5 MB.
          </p>
          {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
        </div>
      </div>
    </div>
  );
}