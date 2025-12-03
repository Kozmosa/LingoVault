import React from 'react';
import { X, RefreshCcw, Loader2 } from 'lucide-react';

export interface DrawerItem {
  key: string;
  label: string;
  description?: string;
}

interface NavigationDrawerProps {
  isOpen: boolean;
  title: string;
  subtitle: string;
  navLabel: string;
  closeLabel: string;
  items: DrawerItem[];
  activeKey: string;
  onSelect: (key: string) => void;
  onClose: () => void;
  onCheckUpdates: () => void;
  checkUpdatesLabel: string;
  isCheckingUpdates?: boolean;
}

export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  isOpen,
  title,
  subtitle,
  navLabel,
  closeLabel,
  items,
  activeKey,
  onSelect,
  onClose,
  onCheckUpdates,
  checkUpdatesLabel,
  isCheckingUpdates = false,
}) => {
  return (
    <div
      className={`fixed inset-0 z-40 transition-opacity duration-300 ${isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
    >
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`absolute left-0 top-0 h-full w-72 max-w-full bg-white dark:bg-slate-900 shadow-xl border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-300 ease-out flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
        aria-label={navLabel}
        style={{ paddingTop: 'var(--safe-area-top)' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{title}</span>
            <span className="text-xs text-slate-400 dark:text-slate-500">{subtitle}</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label={closeLabel}
          >
            <X size={18} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
          {items.map((item) => {
            const isActive = item.key === activeKey;
            return (
              <button
                key={item.key}
                onClick={() => {
                  onSelect(item.key);
                  onClose();
                }}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'}`}
              >
                <div className="font-medium text-sm">{item.label}</div>
                {item.description && (
                  <div className={`text-xs mt-1 ${isActive ? 'text-white/80' : 'text-slate-400 dark:text-slate-500'}`}>
                    {item.description}
                  </div>
                )}
              </button>
            );
          })}
        </nav>
        <div className="px-4 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/70">
          <button
            onClick={onCheckUpdates}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg border border-brand-200/60 dark:border-brand-900/40 bg-white dark:bg-slate-900 text-sm font-medium text-brand-600 dark:text-brand-400 hover:bg-brand-50/60 dark:hover:bg-slate-800/70 transition-colors"
          >
            <span>{checkUpdatesLabel}</span>
            {isCheckingUpdates ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <RefreshCcw size={16} />
            )}
          </button>
        </div>
      </aside>
    </div>
  );
};
