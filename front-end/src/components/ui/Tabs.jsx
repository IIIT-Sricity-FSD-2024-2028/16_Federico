'use strict';

import { useState } from 'react';

/**
 * Ported from HOM/ui-template.js#Tabs, which drove its state through
 * data-state attributes and a global UI._handleTabClick. State is local here;
 * the markup and class names are unchanged so the existing CSS still applies.
 */
export default function Tabs({ id = 'tabs-group', tabs = [], activeTabId }) {
  const [active, setActive] = useState(activeTabId || (tabs[0] && tabs[0].id));

  return (
    <div className="tabs" id={id}>
      <div className="tabs-list">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className="tabs-trigger"
            data-tab-id={tab.id}
            data-state={tab.id === active ? 'active' : 'inactive'}
            onClick={() => setActive(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="tabs-content-wrapper">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className="tabs-content"
            data-tab-id={tab.id}
            data-state={tab.id === active ? 'active' : 'inactive'}
          >
            {tab.content}
          </div>
        ))}
      </div>
    </div>
  );
}

