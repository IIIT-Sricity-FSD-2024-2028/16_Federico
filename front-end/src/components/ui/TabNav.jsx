'use strict';

import '../css/tab-nav.css';

/**
 * Universal tab and view switcher component.
 */
export default function TabNav({
  tabs = [], // [{ id, label, count, icon }]
  activeTab,
  onChange,
  variant = 'underline', // 'underline' | 'pills'
  className = '',
}) {
  return (
    <div
      className={['tab-nav-container', `variant-${variant}`, className]
        .filter(Boolean)
        .join(' ')}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={'tab-nav-item' + (isActive ? ' is-active' : '')}
            onClick={() => onChange && onChange(tab.id)}
          >
            {tab.icon ? <span className="tab-nav-icon">{tab.icon}</span> : null}
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count !== null ? (
              <span className="tab-nav-badge">{tab.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
