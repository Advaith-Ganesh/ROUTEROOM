import type { ReactNode } from 'react';

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-900">{title}</h2>
          <button onClick={onClose} className="text-ink-500 hover:text-ink-900" aria-label="Close">
            ✕
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
