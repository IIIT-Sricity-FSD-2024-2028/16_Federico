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
   *
   * Emits both the app-local `.badge`/`.badge-<variant>` classes (styled
   * in global.css to the Material You tonal-chip look) and the shared
   * `.md-chip`/`.md-chip-<variant>` classes from
   * ../shared/material-components.css, so this component tracks either
   * stylesheet without any markup consumer needing to change.
   */
  Badge: ({ children, variant = 'neutral', className = '' }) => {
    const baseClass = 'badge';
    const variantClass = `badge-${variant}`;
    return `<span class="${UI.cn(baseClass, variantClass, 'md-chip', `md-chip-${variant}`, className)}">${children}</span>`;
  },

  /**
   * Button Component
   * @param {Object} props - { children, variant: 'primary'|'secondary'|'outline'|'danger', size: 'default'|'sm'|'lg', className, id, disabled, onClick, dataAttrs }
   *
   * Emits both the app-local `.btn`/`.btn-<variant>`/`.btn-<size>` classes
   * (styled in global.css to Material You pill buttons) and the shared
   * `.md-btn`/`.md-btn-<variant>` classes from
   * ../shared/material-components.css.
   *
   * `dataAttrs` (e.g. `{ action: 'billing-detail', ledgerId: 42 }`) emits
   * `data-*` attributes for a delegated `click` listener to read, instead
   * of `onClick` (which bakes a `window.fnName = ...` global call directly
   * into the generated HTML — still supported for callers that need it,
   * but prefer `dataAttrs` + delegation for new code).
   */
  Button: ({ children, variant = 'primary', size = 'default', className = '', id = '', disabled = false, dataFlow = '', onClick = '', dataAttrs = null }) => {
    const MD_VARIANT = { primary: 'filled', secondary: 'tonal', outline: 'outlined', danger: 'danger' };
    const MD_SIZE = { sm: 'md-btn-sm', lg: 'md-btn-lg' };
    const classes = UI.cn('btn', `btn-${variant}`, `btn-${size}`, 'md-btn', `md-btn-${MD_VARIANT[variant] || 'filled'}`, MD_SIZE[size], className);
    const idAttr = id ? `id="${id}"` : '';
    const disabledAttr = disabled ? 'disabled' : '';
    const flowAttr = dataFlow ? `data-flow="${dataFlow}"` : '';
    const onClickAttr = onClick ? `onclick="${onClick}"` : '';
    const dataAttrsStr = dataAttrs
      ? Object.entries(dataAttrs)
          .map(([key, value]) => `data-${key.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())}="${String(value)}"`)
          .join(' ')
      : '';
    return `<button ${idAttr} class="${classes}" ${disabledAttr} ${flowAttr} ${onClickAttr} ${dataAttrsStr}>${children}</button>`;
  },

  /**
   * Card Components
   */
  Card: ({ children, className = '' }) => {
    return `<div class="${UI.cn('card', 'md-card', className)}">${children}</div>`;
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