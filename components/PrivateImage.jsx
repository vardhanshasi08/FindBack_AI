const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useEffect, useState } from 'react';
import { ImageOff, Loader2 } from 'lucide-react';

import { Image } from '@/components/ui/image';

// Signed URLs are short-lived, so cache them for a little under an hour.
const cache = new Map();
const MAX_AGE_MS = 50 * 60 * 1000;

export default function PrivateImage({ fileUri, alt = '', className = '', fittingType = 'fill' }) {
  const [url, setUrl] = useState('');
  const [state, setState] = useState(fileUri ? 'loading' : 'empty');

  useEffect(() => {
    if (!fileUri) {
      setUrl('');
      setState('empty');
      return undefined;
    }
    const cached = cache.get(fileUri);
    if (cached && Date.now() - cached.at < MAX_AGE_MS) {
      setUrl(cached.url);
      setState('ready');
      return undefined;
    }
    let cancelled = false;
    setState('loading');
    (async () => {
      try {
        const res = await db.integrations.Core.CreateFileSignedUrl({ file_uri: fileUri, expires_in: 3600 });
        const signed = res?.signed_url || res?.signedUrl;
        if (!signed) throw new Error('no signed url');
        cache.set(fileUri, { url: signed, at: Date.now() });
        if (!cancelled) {
          setUrl(signed);
          setState('ready');
        }
      } catch (error) {
        if (!cancelled) setState('failed');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fileUri]);

  return (
    <div className={`relative overflow-hidden rounded-xl border border-border bg-secondary ${className}`}>
      {state === 'ready' && <Image src={url} alt={alt} fittingType={fittingType} className="h-full w-full object-cover" />}
      {state === 'loading' && (
        <div className="flex h-full w-full items-center justify-center fb-shimmer">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
      {state === 'empty' && (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground">
          <ImageOff className="h-4 w-4" />
          <span className="text-[10px] uppercase tracking-wider">No photo</span>
        </div>
      )}
      {state === 'failed' && (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 px-2 text-center text-muted-foreground">
          <ImageOff className="h-4 w-4" />
          <span className="text-[10px] uppercase tracking-wider">Photo unavailable</span>
        </div>
      )}
    </div>
  );
}