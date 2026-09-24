import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource-variable/inter';
import './styles.css';
import './select.css';
import { App } from './App';
import { PublicPortal } from './PublicPortal';
import './invoice-overview.css';
import './document-composer.css';
import './design-system.css';
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {location.pathname.replace(/\/$/, '') === '/portal' ? (
      <PublicPortal />
    ) : (
      <App embedded={new URLSearchParams(location.search).get('embedded') === '1'} />
    )}
  </React.StrictMode>,
);
