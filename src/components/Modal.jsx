import { useEffect, useRef, useCallback } from 'react';

export default function Modal({ isOpen, onClose, label, children, className = '' }) {
  const overlayRef = useRef(null);
  const contentRef = useRef(null);
  const previousFocus = useRef(null);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }
    if (e.key !== 'Tab') return;

    const focusable = contentRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable?.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    previousFocus.current = document.activeElement;
    document.body.style.overflow = 'hidden';

    const timer = setTimeout(() => {
      const firstFocusable = contentRef.current?.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    }, 50);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = '';
      previousFocus.current?.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onKeyDown={handleKeyDown}
    >
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="fixed inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
        <div ref={contentRef} className={`relative ${className}`}>
          {children}
        </div>
      </div>
    </div>
  );
}
