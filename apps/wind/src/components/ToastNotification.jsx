import { useState, useEffect, useCallback } from 'react';
import { X, Wind, AlertTriangle, CheckCircle, Info } from 'lucide-react';

const TOAST_DURATION = 8000;

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { ...toast, id }]);
    
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, toast.duration || TOAST_DURATION);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const handleThermalAlert = (event) => {
      const { probability, lake, message } = event.detail;
      addToast({
        type: 'thermal',
        title: 'Thermal Alert!',
        message: message || `Probability at ${probability}%`,
        lake,
        probability,
      });

      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }

      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('UtahWindFinder', {
          body: message,
          icon: '/vite.svg',
          tag: 'thermal-alert',
        });
      }
    };

    window.addEventListener('thermal-alert', handleThermalAlert);
    
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      window.removeEventListener('thermal-alert', handleThermalAlert);
    };
  }, [addToast]);

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function Toast({ toast, onClose }) {
  const { type, title, message, probability } = toast;

  const config = {
    thermal: {
      icon: Wind,
      bgColor: 'bg-gradient-to-r from-green-900/95 to-emerald-900/95',
      borderColor: 'border-green-500/50',
      iconColor: 'text-green-400',
      titleColor: 'text-green-300',
    },
    warning: {
      icon: AlertTriangle,
      bgColor: 'bg-gradient-to-r from-yellow-900/95 to-orange-900/95',
      borderColor: 'border-yellow-500/50',
      iconColor: 'text-yellow-400',
      titleColor: 'text-yellow-300',
    },
    bust: {
      icon: AlertTriangle,
      bgColor: 'bg-gradient-to-r from-red-900/95 to-rose-900/95',
      borderColor: 'border-red-500/50',
      iconColor: 'text-red-400',
      titleColor: 'text-red-300',
    },
    info: {
      icon: Info,
      bgColor: 'bg-gradient-to-r from-blue-900/95 to-cyan-900/95',
      borderColor: 'border-blue-500/50',
      iconColor: 'text-blue-400',
      titleColor: 'text-blue-300',
    },
    success: {
      icon: CheckCircle,
      bgColor: 'bg-gradient-to-r from-green-900/95 to-teal-900/95',
      borderColor: 'border-green-500/50',
      iconColor: 'text-green-400',
      titleColor: 'text-green-300',
    },
  };

  const { icon: Icon, bgColor, borderColor, iconColor, titleColor } = config[type] || config.info;

  return (
    <div 
      className={`
        ${bgColor} ${borderColor}
        border rounded-xl p-4 shadow-2xl backdrop-blur-sm
        animate-slide-in
        flex items-start gap-3
      `}
      role="alert"
    >
      <div className={`p-2 rounded-lg bg-black/20 ${iconColor}`}>
        <Icon className="w-5 h-5" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className={`font-semibold ${titleColor}`}>{title}</h4>
          {probability && (
            <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-white">
              {probability}%
            </span>
          )}
        </div>
        <p className="text-slate-300 text-sm mt-0.5">{message}</p>
      </div>
      
      <button
        onClick={onClose}
        className="text-slate-400 hover:text-white transition-colors p-1"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function useToast() {
  const showThermalAlert = useCallback((probability, lake) => {
    window.dispatchEvent(new CustomEvent('thermal-alert', {
      detail: {
        probability,
        lake,
        message: `Thermal probability crossed 75% at ${lake}!`,
      },
    }));
  }, []);

  return { showThermalAlert };
}
