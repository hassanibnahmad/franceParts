import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

type Toast = {
  id: number;
  type: ToastType;
  title?: string;
  message: string;
  timeout?: number;
};

type ToastContextValue = {
  push: (t: Omit<Toast, 'id'>) => number;
  remove: (id: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToasts = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToasts must be used within a ToastProvider');
  return ctx;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const toast: Toast = { id, ...t };
    setToasts((s) => [toast, ...s]);

    const timeout = toast.timeout ?? 4000;
    window.setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), timeout);

    return id;
  }, []);

  const remove = useCallback((id: number) => setToasts((s) => s.filter((t) => t.id !== id)), []);

  const value = useMemo(() => ({ push, remove }), [push, remove]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 items-end">
        <AnimatePresence>
          {toasts.map((t) => {
            const color =
              t.type === 'success'
                ? 'green'
                : t.type === 'error'
                ? 'red'
                : 'gray';
            const timeout = t.timeout ?? 4000;

            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className={`relative overflow-hidden max-w-sm w-full px-5 py-4 rounded-2xl 
                shadow-lg border border-${color}-500/30 
                backdrop-blur-md bg-white/10 text-white`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    {t.type === 'success' ? (
                      <CheckCircle className="text-green-400 w-6 h-6" />
                    ) : t.type === 'error' ? (
                      <AlertCircle className="text-red-400 w-6 h-6" />
                    ) : (
                      <Info className="text-gray-300 w-6 h-6" />
                    )}
                  </div>
                  <div className="flex-1">
                    {t.title && <div className="font-semibold">{t.title}</div>}
                    <div className="text-sm opacity-90">{t.message}</div>
                  </div>
                  <button
                    onClick={() => remove(t.id)}
                    className="opacity-70 hover:opacity-100 transition-opacity bg-transparent"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Barre de progression */}
                <motion.div
                  className={`absolute bottom-0 left-0 h-1 bg-${color}-400`}
                  initial={{ width: '100%' }}
                  animate={{ width: 0 }}
                  transition={{ duration: timeout / 1000, ease: 'linear' }}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
