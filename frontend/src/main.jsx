import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './styles/globals.css';
import './styles/layout.css';
import './styles/sidebar.css';
import './styles/topbar.css';
import './styles/components.css';
import './styles/tables.css';
import './styles/forms.css';
import './styles/dashboard.css';
import './styles/animations.css';

import keycloak from './keycloak';

keycloak
  .init({
    onLoad: 'login-required',
    checkLoginIframe: false,
  })
  .then(() => {
    ReactDOM.createRoot(document.getElementById('root')).render(
      <React.StrictMode>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </React.StrictMode>
    );
  })
  .catch(() => {
    console.error('Keycloak initialization failed');
  });