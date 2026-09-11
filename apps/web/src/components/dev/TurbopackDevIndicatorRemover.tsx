'use client';

import { useEffect } from 'react';
import { useSession } from '@/auth/sessionStore';

const STYLE_ID = 'hide-turbopack-dev-tool-admin';

const HIDE_CSS = `
nextjs-portal,
#nextjs-dev-indicator,
[data-nextjs-dev-tools],
[data-nextjs-toast],
[data-nextjs-toast-wrapper],
[data-next-badge],
[data-nextjs-indicator],
[data-nextjs-dev-overlay] {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
  width: 0 !important;
  height: 0 !important;
  overflow: hidden !important;
}
`;

export function TurbopackDevIndicatorRemover() {
  const { currentUser } = useSession();
  const isAdmin = currentUser?.email?.toLowerCase().trim() === 'admin@apex.com';

  useEffect(() => {
    if (!isAdmin) {
      // Clean up injected style tag if user is not admin@apex.com
      const existingStyle = document.getElementById(STYLE_ID);
      if (existingStyle) {
        existingStyle.remove();
      }
      return;
    }

    // 1. Inject or update CSS style
    let styleTag = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = STYLE_ID;
      styleTag.textContent = HIDE_CSS;
      document.head.appendChild(styleTag);
    }

    // 2. Hide any existing or dynamically created shadow roots or portals
    const hidePortalElements = () => {
      const portals = document.querySelectorAll('nextjs-portal');
      portals.forEach((p) => {
        const el = p as HTMLElement;
        el.style.display = 'none';
        el.style.visibility = 'hidden';
        if (el.shadowRoot) {
          const innerStyleId = 'hide-shadow-turbopack';
          if (!el.shadowRoot.getElementById(innerStyleId)) {
            const innerStyle = document.createElement('style');
            innerStyle.id = innerStyleId;
            innerStyle.textContent = '* { display: none !important; visibility: hidden !important; }';
            el.shadowRoot.appendChild(innerStyle);
          }
        }
      });
    };

    hidePortalElements();

    // 3. Set up MutationObserver to instantly hide if Next.js re-renders portal in DOM
    const observer = new MutationObserver(() => {
      hidePortalElements();
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      const st = document.getElementById(STYLE_ID);
      if (st) st.remove();
    };
  }, [isAdmin]);

  return null;
}
