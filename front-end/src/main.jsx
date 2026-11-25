import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';

// The three stylesheets every legacy page loaded on every route. Portal-specific
// stylesheets are imported by their own route chunk instead, so only one portal's
// CSS is live at a time.
import './styles/design-tokens.css';
import './styles/material-components.css';
import './styles/ui-feedback.css';

import { store } from './store/store.js';
import AppRouter from './routes.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <AppRouter />
    </Provider>
  </StrictMode>,
);
