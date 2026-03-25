'use client';
import { useEffect } from 'react';

export default function VanillaInteractions({ id, html }: { id: string, html: string }) {
  useEffect(() => {
     let script = document.getElementById(id) as HTMLScriptElement;
     if (!script) {
       script = document.createElement('script');
       script.id = id;
       script.innerHTML = html;
       document.body.appendChild(script);
     }
     return () => {
        // We do not unmount to keep vanilla listeners active when navigating back,
        // or we CAN remove it to prevent duplicates if strictly navigating
        const existing = document.getElementById(id);
        if (existing) existing.remove();
     };
  }, [html, id]);

  return null;
}
