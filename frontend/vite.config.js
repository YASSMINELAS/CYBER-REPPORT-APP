/**
 * Configuration Vite du frontend.
 *
 * Role architectural:
 * - Configure l'outil de build/dev server pour React.
 * - Vite sert l'application en developpement et produit le dossier dist en production.
 */
// defineConfig apporte l'autocompletion et une structure claire.
import { defineConfig } from 'vite';
// Plugin officiel pour compiler React/JSX.
import react from '@vitejs/plugin-react';

// Configuration minimale: le projet utilise React avec Vite.
export default defineConfig({
  plugins: [react()],
});
