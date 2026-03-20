import React, { useEffect, useRef, useState } from 'react';
import { PlayCircle, ShieldCheck, AlertCircle } from 'lucide-react';

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
    // We only block window.open if it's triggered very close to a user interaction 
    // that we suspect is an ad-click, or if it's called while we're in "locking" mode.
    const originalWindowOpen = window.open;
    let lastClickTime = 0;

    const handleGlobalClick = () => {
      lastClickTime = Date.now();
    };
    window.addEventListener('click', handleGlobalClick, true);

    window.open = function(url, target, features) {
      const timeSinceClick = Date.now() - lastClickTime;
      
      // If a popup is attempted immediately after a click (within 500ms)
      // and we're still in the "unlocked" transition or it looks suspicious
      if (timeSinceClick < 500) {
        console.warn('Blocked a potential ad-triggered popup:', url);
        return null;
      }
      
      return originalWindowOpen.call(window, url, target, features);
    };

    // 2. Refined Mutation Observer
    // Only remove elements with extremely high z-index or known ad patterns
    // Never touch the iframe or core containers
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            const zIndex = window.getComputedStyle(node).zIndex;
            const isHighZ = zIndex && parseInt(zIndex) > 9999;
            
            const isKnownAd = 
              node.id?.toLowerCase().includes('popunder') ||
              node.className?.toLowerCase().includes('ad-overlay') ||
              (node instanceof HTMLScriptElement && node.src.includes('adsbygoogle'));

            // Only remove if it's clearly an overlay and not part of our player
            if ((isHighZ || isKnownAd) && !node.closest('.safe-player-container')) {
              console.warn('Removing suspicious overlay element:', node);
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

  const handleUnlock = (e: React.MouseEvent) => {
    // Prevent the click from propagating to the iframe immediately if needed
    // but we want the user to be able to play.
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
        // Requirement 1: Balanced sandbox
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation allow-pointer-lock allow-top-navigation-by-user-activation"
      />

      {/* Requirement 3: Smart Click Protection Layer */}
      {!isUnlocked && (
        <div 
          className="absolute inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center cursor-pointer group transition-all hover:bg-black/20"
          onClick={handleUnlock}
        >
          <div className="w-20 h-20 rounded-full bg-accent/90 flex items-center justify-center shadow-[0_0_40px_rgba(255,69,0,0.3)] transition-transform group-hover:scale-110">
            <PlayCircle className="w-12 h-12 text-white fill-white" />
          </div>
          
          <div className="mt-4 flex flex-col items-center gap-1">
            <p className="text-white font-bold text-lg drop-shadow-lg flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-green-400" />
              Click to Start Playing
            </p>
            <p className="text-white/60 text-xs">Safe Player Mode Active</p>
          </div>
        </div>
      )}
    </div>
  );
};
