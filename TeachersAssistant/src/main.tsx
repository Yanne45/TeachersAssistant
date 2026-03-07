import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles/tokens.css';
import './styles/globals.css';

// L'initialisation de la DB est maintenant gérée par WorkspaceContext
// (ouverture dynamique de fichiers .ta)
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
