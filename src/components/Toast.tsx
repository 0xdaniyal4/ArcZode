/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2, AlertTriangle, Info, ExternalLink } from 'lucide-react';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
  txHash?: string;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (type: 'success' | 'error' | 'info', title: string, message: string, txHash?: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: 'success' | 'error' | 'info', title: string, message: string, txHash?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message, txHash }]);

    // Auto-remove after 6 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div id="toast-container" className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 100, y: 0, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9, transition: { duration: 0.2 } }}
              layout
              className="pointer-events-auto w-full glass-card bg-black/85 border-brand-gold/40 p-4 flex gap-3 shadow-[0_10px_30px_rgba(0,51,204,0.3)] relative overflow-hidden group"
              style={{ borderLeft: '4px solid #FFD700' }}
            >
              {/* Gold light sweep on toast entry */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-brand-gold/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
              
              <div className="flex-shrink-0 mt-0.5">
                {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-brand-success glow-blue" />}
                {toast.type === 'error' && <AlertTriangle className="w-5 h-5 text-brand-danger" />}
                {toast.type === 'info' && <Info className="w-5 h-5 text-brand-accent" />}
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-white font-display tracking-wide">{toast.title}</h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">{toast.message}</p>
                {toast.txHash && (
                  <a
                    href={`https://testnet.arcscan.app/tx/${toast.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-brand-gold hover:underline mt-2 font-orbitron"
                  >
                    View Tx <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="flex-shrink-0 text-slate-400 hover:text-white transition-colors self-start p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
