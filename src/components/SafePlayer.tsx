import React, { useEffect, useRef } from 'react';

interface SafePlayerProps {
  src: string;
  className?: string;
  title?: string;
  onPlay?: () => void;
}

export const SafePlayer: React.FC<SafePlayerProps> = ({ src, className, title, onPlay }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // 1. Smart window.open override
    // This blocks programmatic popups that happen immediately after a click
    const originalWindowOpen = window.open;
    let lastClickTime = 0;

    const handleGlobalClick = () => {
      lastClickTime = Date.now();
      if (onPlay) onPlay();
    };
    window.addEventListener('click', handleGlobalClick, true);

    window.open = function(url, target, features) {
      const timeSinceClick = Date.now() - lastClickTime;
      
      // If a popup is attempted within 500ms of a click, it's likely an ad
      if (timeSinceClick < 500) {
        console.warn('Blocked a potential ad-triggered popup:', url);
        return null;
      }
      
      return originalWindowOpen.call(window, url, target, features);
    };

    // 2. Mutation Observer to remove high z-index overlays
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            const zIndex = window.getComputedStyle(node).zIndex;
            if (zIndex && parseInt(zIndex) > 9999 && !node.closest('.safe-player-container')) {
              console.warn('Removing suspicious high z-index overlay:', node);
              node.remove();
            }
          }
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.open = originalWindowOpen;
      window.removeEventListener('click', handleGlobalClick, true);
      observer.disconnect();
    };
  }, [onPlay]);

  return (
    <div ref={containerRef} className={`relative overflow-hidden safe-player-container ${className}`}>
      {/* Balanced Sandbox Iframe */}
      <iframe
        ref={iframeRef}
        src={src}
        title={title || "Video Player"}
        className="absolute inset-0 w-full h-full border-none"
        allowFullScreen
        referrerPolicy="origin"
        // We omit 'allow-downloads' to block the "setup" file downloads
        // We include 'allow-popups' to avoid breaking the player, but we block them via window.open override
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation allow-pointer-lock allow-top-navigation-by-user-activation allow-modals allow-popups-to-escape-sandbox"
      />
    </div>
  );
};

