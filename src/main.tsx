import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';
import { syncService } from './services/syncService';

// Détecter si on est dans Electron (protocole file://)
const isElectron = typeof window !== 'undefined' && 
  (window.electron === true || window.location.protocol === 'file:');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Utiliser HashRouter pour Electron (file://), BrowserRouter pour le web
const Router = isElectron ? HashRouter : BrowserRouter;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <App />
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1f2937',
              color: '#fff',
            },
          }}
        />
      </Router>
    </QueryClientProvider>
  </React.StrictMode>
);

// Enregistrer le service worker pour le cache offline
// Seulement dans le navigateur, pas dans Electron
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && !window.electron) {
  // Attendre que le document soit complètement prêt
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      registerServiceWorker();
    });
  } else if (document.readyState === 'complete' || document.readyState === 'interactive') {
    // Le document est déjà prêt, enregistrer immédiatement
    registerServiceWorker();
  } else {
    // Fallback: attendre le load event
    window.addEventListener('load', registerServiceWorker);
  }
}

function registerServiceWorker() {
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('ServiceWorker registered successfully:', registration.scope);
      })
      .catch((err) => {
        // Ne pas logger comme erreur si c'est juste que le document n'est pas prêt
        if (err.message?.includes('invalid state') || err.name === 'InvalidStateError') {
          console.log('ServiceWorker registration skipped (invalid state)');
        } else {
          console.warn('ServiceWorker registration failed:', err.message || err);
        }
      });
  }
}

// Initialiser la synchronisation dès le chargement
syncService.init();

