import React from 'react';

export interface TabItem<T extends string> {
  id: T;
  label: string;
  badge?: number | string;
  badgeClass?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface SegmentedTabsProps<T extends string> {
  tabs: TabItem<T>[];
  activeTab: T;
  onChange: (tab: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}

/**
 * Padrão Oficial de Guias / Sub-abas (Segmented Control)
 * Design moderno com container rebaixado, pills ativas de alto contraste e suporte a badges e ícones.
 */
export function SegmentedTabs<T extends string>({
  tabs,
  activeTab,
  onChange,
  className = '',
  size = 'md',
}: SegmentedTabsProps<T>) {
  const isSm = size === 'sm';

  return (
    <div
      className={`inline-flex items-center ${isSm ? 'p-0.5 rounded-xl gap-0.5' : 'p-1 rounded-2xl gap-1'} bg-slate-200/80 dark:bg-slate-900 border border-slate-300/70 dark:border-slate-800 overflow-x-auto max-w-full shadow-inner [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`${isSm ? 'px-2.5 py-1 rounded-lg text-xs' : 'px-3.5 py-1.5 rounded-xl text-xs'} font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer select-none ${
              isActive
                ? 'bg-white dark:bg-blue-600 text-blue-700 dark:text-white shadow-xs font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
            }`}
          >
            {Icon && (
              <Icon
                className={`${isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} shrink-0 transition-transform ${
                  isActive ? 'scale-110 text-blue-600 dark:text-white' : 'text-slate-500 dark:text-slate-400'
                }`}
              />
            )}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`px-1.5 py-0.2 rounded-md text-[10px] font-black shrink-0 transition-colors ${
                  isActive
                    ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-200'
                    : 'bg-slate-300/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
