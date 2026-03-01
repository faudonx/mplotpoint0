import { AlertTriangle, CheckCircle, XCircle, HelpCircle } from 'lucide-react';

export function ConfirmModal({ isOpen, title, message, type, onConfirm, onCancel }: any) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'warning': return <AlertTriangle className="w-12 h-12 text-[#ffa500] mb-4 mx-auto" />;
      case 'success': return <CheckCircle className="w-12 h-12 text-[#4caf50] mb-4 mx-auto" />;
      case 'error': return <XCircle className="w-12 h-12 text-[#ff6b6b] mb-4 mx-auto" />;
      default: return <HelpCircle className="w-12 h-12 text-accent mb-4 mx-auto" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[300] animate-fadeIn" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="bg-modal-bg border border-white/10 rounded-2xl p-8 max-w-[400px] w-[90%] text-center animate-scaleIn">
        {getIcon()}
        <h3 className="text-2xl font-bold mb-2">{title}</h3>
        <p className="text-text-secondary mb-6 leading-[1.5]">{message}</p>
        <div className="flex gap-4 justify-center">
          <button 
            className="px-7 py-3 rounded-full border-2 border-white/10 bg-transparent text-white font-semibold cursor-pointer transition-all duration-200 hover:border-accent hover:bg-accent/10"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button 
            className="px-7 py-3 rounded-full border-none bg-accent text-white font-semibold cursor-pointer transition-all duration-200 hover:brightness-110 hover:-translate-y-0.5"
            onClick={onConfirm}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
