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
    // 1. Prevent Popups & Redirects via Window.open override
    const originalWindowOpen = window.open;
    window.open = function() {
      console.warn('Blocked an attempted popup/window.open call.');
      return null;
    };

    // 2. Mutation Observer to detect and remove injected ad elements
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            // Check for common ad-like patterns
            const isAdLike = 
              (node.style.zIndex && parseInt(node.style.zIndex) > 1000) ||
              (node.style.position === 'fixed' && (node.style.top === '0px' || node.style.bottom === '0px')) ||
              node.id?.toLowerCase().includes('ad') ||
              node.className?.toLowerCase().includes('ad-') ||
              (node instanceof HTMLScriptElement && node.src.includes('adsbygoogle')) ||
              (node instanceof HTMLImageElement && node.src.includes('ad-'));

            if (isAdLike && !node.closest('.safe-player-container')) {
              console.warn('Removing suspected ad element:', node);
              node.remove();
            }
          }
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // 3. Disable Malicious Event Listeners
    const originalAddEventListener = window.addEventListener;
    // @ts-ignore
    window.addEventListener = function(type, listener, options) {
      if (type === 'click' || type === 'mousedown' || type === 'mouseup') {
        // Check if the listener is being added by a known ad script or looks suspicious
        // This is a bit aggressive, so we use a simple check
        const isSuspicious = typeof listener === 'function' && listener.toString().includes('window.open');
        if (isSuspicious) {
          console.warn('Blocked a suspicious event listener.');
          return;
        }
      }
      return originalAddEventListener.call(window, type, listener, options);
    };

    return () => {
      window.open = originalWindowOpen;
      window.addEventListener = originalAddEventListener;
      observer.disconnect();
    };
  }, []);

  const handleUnlock = () => {
    setIsUnlocked(true);
    if (onPlay) onPlay();
  };

  return (
    <div ref={containerRef} className={`relative overflow-hidden safe-player-container ${className}`}>
      {/* Strict Sandbox Iframe */}
      <iframe
        ref={iframeRef}
        src={src}
        title={title || "Video Player"}
        className="absolute inset-0 w-full h-full border-none"
        allowFullScreen
        // Requirement 2: Strict sandbox
        sandbox="allow-same-origin allow-scripts allow-forms allow-pointer-lock"
        // Note: We explicitly omit allow-popups and allow-top-navigation
      />

      {/* Requirement 3: Click Protection Layer */}
      {!isUnlocked && (
        <div 
          className="absolute inset-0 z-50 bg-black/60 backdrop-blur-[4px] flex flex-col items-center justify-center cursor-pointer group transition-all hover:bg-black/40"
          onClick={handleUnlock}
        >
          <div className="w-24 h-24 rounded-full bg-accent/90 flex items-center justify-center shadow-[0_0_60px_rgba(255,69,0,0.5)] transition-transform group-hover:scale-110">
            <PlayCircle className="w-14 h-14 text-white fill-white" />
          </div>
          
          <div className="mt-6 flex flex-col items-center gap-2">
            <p className="text-white font-bold text-xl drop-shadow-lg flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-green-400" />
              Secure Player Mode
            </p>
            <p className="text-white/70 text-sm font-medium">Click to unlock and start watching</p>
          </div>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/40 px-4 py-2 rounded-full border border-white/10">
            <AlertCircle className="w-4 h-4 text-accent" />
            <span className="text-[0.7rem] text-white/60 uppercase tracking-widest font-bold">Ads & Popups Blocked</span>
          </div>
        </div>
      )}
    </div>
  );
};
