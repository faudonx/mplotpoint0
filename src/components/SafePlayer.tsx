import React, { useEffect, useRef, useState } from 'react';
import { PlayCircle, ShieldCheck } from 'lucide-react';

interface SafePlayerProps {
  src: string;
  className?: string;
  title?: string;
  onPlay?: () => void;
}

export const SafePlayer: React.FC<SafePlayerProps> = ({ src, className, title, onPlay }) => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // 1. Smart window.open override
    // This blocks programmatic popups that happen immediately after a click
    const originalWindowOpen = window.open;
    let lastClickTime = 0;

    const handleGlobalClick = () => {
      lastClickTime = Date.now();
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
  }, []);

  const handleUnlock = () => {
    setIsUnlocked(true);
    if (onPlay) onPlay();
  };

  return (
    <div ref={containerRef} className={`relative overflow-hidden safe-player-container ${className}`}>
      {/* Balanced Sandbox Iframe */}
      <iframe
        ref={iframeRef}
        src={src}
        title={title || "Video Player"}
        className="absolute inset-0 w-full h-full border-none"
        allowFullScreen
        // We omit 'allow-downloads' to block the "setup" file downloads
        // We include 'allow-popups' to avoid breaking the player, but we block them via window.open override
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation allow-pointer-lock allow-top-navigation-by-user-activation"
      />

      {/* Transparent Click Interceptor */}
      {!isUnlocked && (
        <div 
          className="absolute inset-0 z-50 bg-black/20 backdrop-blur-[1px] flex flex-col items-center justify-center cursor-pointer group transition-all hover:bg-black/10"
          onClick={handleUnlock}
        >
          <div className="w-20 h-20 rounded-full bg-accent/80 flex items-center justify-center shadow-2xl transition-transform group-hover:scale-110">
            <PlayCircle className="w-12 h-12 text-white fill-white" />
          </div>
          <div className="mt-4 flex flex-col items-center gap-1">
            <p className="text-white font-bold text-lg drop-shadow-lg flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-green-400" />
              Click to Start Video
            </p>
            <p className="text-white/60 text-xs">Ad-Shield Active</p>
          </div>
        </div>
      )}
    </div>
  );
};
