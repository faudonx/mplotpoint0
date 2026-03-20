import { Lock } from 'lucide-react';

export function RestrictedModal({ isOpen, onClose, onLogin }: any) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[10000] animate-fadeIn" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-modal-bg border border-white/10 rounded-2xl p-8 max-w-[400px] w-[90%] text-center animate-scaleIn">
        <Lock className="w-12 h-12 text-accent mx-auto mb-4" />
        <h3 className="text-2xl font-bold my-4">Please login to continue</h3>
        <button 
          className="bg-accent text-white border-none px-9 py-3.5 rounded-full font-bold text-[1.05rem] cursor-pointer transition-all duration-300 shadow-[0_6px_25px_rgba(255,69,0,0.4)] hover:brightness-110 hover:-translate-y-1 hover:shadow-[0_10px_35px_rgba(255,69,0,0.6)]"
          onClick={onLogin}
        >
          Login / Register
        </button>
      </div>
    </div>
  );
}
