import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react';

type ToastType = 'error' | 'success' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  action?: { label: string; onClick: () => void };
  duration?: number;
}

interface ToastContextValue {
  addToast: {
    (toast: Omit<Toast, 'id'>): void;
    (title: string, type?: ToastType, message?: string): void;
  };
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  addToast: () => {},
  removeToast: () => {},
});

let toastCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (toastInput: Omit<Toast, 'id'> | string, type: ToastType = 'info', message?: string) => {
      const toast = normalizeToast(toastInput, type, message);
      const id = `toast-${++toastCounter}`;
      setToasts((prev) => [...prev, { ...toast, id }]);
      const duration = toast.duration ?? 5000;
      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[10000] flex flex-col gap-2 max-w-sm" role="status" aria-live="polite" aria-atomic="false">
        <AnimatePresence>
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

const iconMap = {
  error: AlertCircle,
  success: CheckCircle,
  info: Info,
  warning: AlertCircle,
};

const colorMap = {
  error: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', icon: 'var(--danger)' },
  success: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', icon: 'var(--success)' },
  info: { bg: 'rgba(6,182,212,0.12)', border: 'rgba(6,182,212,0.3)', icon: 'var(--accent)' },
  warning: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', icon: 'var(--warning)' },
};

function normalizeToast(
  toastInput: Omit<Toast, 'id'> | string,
  type: ToastType = 'info',
  message?: string,
): Omit<Toast, 'id'> {
  if (typeof toastInput === 'string') {
    return { type, title: toastInput, ...(message !== undefined ? { message } : {}) };
  }

  if (!toastInput || typeof toastInput !== 'object' || !('type' in toastInput) || typeof toastInput.type !== 'string') {
    return { type: 'info', title: 'Notification' };
  }

  if (!(toastInput.type in colorMap)) {
    return { ...toastInput, type: 'info' };
  }

  return toastInput;
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const Icon = iconMap[toast.type];
  const colors = colorMap[toast.type];

  return (
    <motion.div
      initial={{ opacity: 0, x: 80, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.95 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-lg px-4 py-3 flex items-start gap-3 shadow-lg backdrop-blur-sm"
      style={{
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        minWidth: 280,
      }}
    >
      <Icon size={16} className="mt-0.5 shrink-0" style={{ color: colors.icon }} />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
          {toast.title}
        </p>
        {toast.message && (
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {toast.message}
          </p>
        )}
        {toast.action && (
          <button
            type="button"
            onClick={toast.action.onClick}
            className="text-[12px] font-semibold mt-1.5 px-2 py-0.5 rounded transition-colors"
            style={{ color: colors.icon, background: `${colors.icon}15` }}
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button type="button" onClick={onDismiss} className="p-0.5 shrink-0 mt-0.5 rounded hover:bg-white/10 transition-colors" aria-label="Dismiss notification">
        <X size={12} style={{ color: 'var(--text-muted)' }} />
      </button>
    </motion.div>
  );
}
