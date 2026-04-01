/**
 * ui-templates.js
 * Central template generator for Federico Hospital UI components.
 * Returns pure HTML strings.
 */

window.UI = {
  /**
   * Helper to merge conditional classes
   */
  cn: (...classes) => classes.filter(Boolean).join(' '),

  /**
   * Badge Component
   * @param {Object} props - { children, variant: 'success'|'warning'|'error'|'info'|'neutral', className }
   */
  Badge: ({ children, variant = 'neutral', className = '' }) => {
    const baseClass = 'badge';
    const variantClass = `badge-${variant}`;
    return `<span class="${UI.cn(baseClass, variantClass, className)}">${children}</span>`;
  },

  /**
   * Button Component
   * @param {Object} props - { children, variant: 'primary'|'secondary'|'outline'|'danger', size: 'default'|'sm'|'lg', className, id, disabled, onClick }
   */
  Button: ({ children, variant = 'primary', size = 'default', className = '', id = '', disabled = false, dataFlow = '' }) => {
    const classes = UI.cn('btn', `btn-${variant}`, `btn-${size}`, className);
    const idAttr = id ? `id="${id}"` : '';
    const disabledAttr = disabled ? 'disabled' : '';
    const flowAttr = dataFlow ? `data-flow="${dataFlow}"` : '';
    return `<button ${idAttr} class="${classes}" ${disabledAttr} ${flowAttr}>${children}</button>`;
  },

  /**
   * Card Components
   */
  Card: ({ children, className = '' }) => {
    return `<div class="${UI.cn('card', className)}">${children}</div>`;
  },
  
  CardHeader: ({ title, description, action = '', className = '' }) => {
    return `
      <div class="${UI.cn('card-header', className)}">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <h4 class="card-title">${title}</h4>
            ${description ? `<p class="card-description">${description}</p>` : ''}
          </div>
          ${action ? `<div>${action}</div>` : ''}
        </div>
      </div>
    `;
  },

  CardContent: ({ children, className = '' }) => {
    return `<div class="${UI.cn('card-content', className)}">${children}</div>`;
  },

  CardFooter: ({ children, className = '' }) => {
    return `<div class="${UI.cn('card-footer', className)}">${children}</div>`;
  },

  /**
   * Input Component
   * @param {Object} props - { type, placeholder, value, className, id, dataFlow }
   */
  Input: ({ type = 'text', placeholder = '', value = '', className = '', id = '', dataFlow = '' }) => {
    const idAttr = id ? `id="${id}"` : '';
    const valueAttr = value ? `value="${value}"` : '';
    const flowAttr = dataFlow ? `data-flow="${dataFlow}"` : '';
    return `<input type="${type}" placeholder="${placeholder}" ${valueAttr} ${idAttr} class="${UI.cn('input', className)}" ${flowAttr} />`;
  },

  /**
   * Tabs Component
   * @param {Object} props - { id, tabs: [{ id, label, content }] }
   */
  Tabs: ({ id = 'tabs-group', tabs = [], activeTabId }) => {
    const activeId = activeTabId || (tabs[0] && tabs[0].id);
    
    const triggers = tabs.map(tab => `
      <button 
        class="tabs-trigger" 
        data-tabs-target="${id}" 
        data-tab-id="${tab.id}" 
        data-state="${tab.id === activeId ? 'active' : 'inactive'}"
        onclick="UI._handleTabClick(this)"
      >
        ${tab.label}
      </button>
    `).join('');

    const contents = tabs.map(tab => `
      <div 
        class="tabs-content" 
        data-tabs-group="${id}" 
        data-tab-id="${tab.id}" 
        data-state="${tab.id === activeId ? 'active' : 'inactive'}"
      >
        ${tab.content}
      </div>
    `).join('');

    return `
      <div class="tabs" id="${id}">
        <div class="tabs-list">
          ${triggers}
        </div>
        <div class="tabs-content-wrapper">
          ${contents}
        </div>
      </div>
    `;
  },

  /**
   * Internal Tab Handler (Minimal logic attached for demo purposes)
   */
  _handleTabClick: (element) => {
    const targetGroup = element.getAttribute('data-tabs-target');
    const tabId = element.getAttribute('data-tab-id');
    
    // Update triggers
    document.querySelectorAll(`.tabs-trigger[data-tabs-target="${targetGroup}"]`).forEach(btn => {
      btn.setAttribute('data-state', btn === element ? 'active' : 'inactive');
    });

    // Update content
    document.querySelectorAll(`.tabs-content[data-tabs-group="${targetGroup}"]`).forEach(content => {
      content.setAttribute('data-state', content.getAttribute('data-tab-id') === tabId ? 'active' : 'inactive');
    });
  }
};