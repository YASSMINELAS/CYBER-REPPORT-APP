/**
 * Point d'entree React du frontend.
 *
 * Role architectural:
 * - Monte l'application React dans la div #root de index.html.
 * - Active React Router avec BrowserRouter pour gerer les pages cote client.
 *
 * Flux:
 * index.html -> main.jsx -> App.jsx -> routes/pages/components.
 */
// React est la bibliotheque UI utilisee pour construire les composants.
import React from 'react';
// ReactDOM connecte React au DOM reel du navigateur.
import ReactDOM from 'react-dom/client';
// BrowserRouter active le routing base sur l'URL du navigateur.
import { BrowserRouter } from 'react-router-dom';
// App contient la declaration des routes principales.
import App from './App.jsx';
// CSS global de l'application.
import './styles.css';

// Cree la racine React et rend l'application.
ReactDOM.createRoot(document.getElementById('root')).render(
  // StrictMode aide a detecter certains problemes en developpement.
  <React.StrictMode>
    {/* BrowserRouter rend useNavigate, Routes et Link disponibles dans toute l'app. */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
