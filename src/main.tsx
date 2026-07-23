import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { CurrencyProvider } from './contexts/CurrencyContext';

// Suppress benign ResizeObserver loop limit errors
if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    if (e.message && (
      e.message.includes('ResizeObserver') || 
      e.message.includes('loop limit exceeded') ||
      e.message.includes('Missing or insufficient permissions') ||
      e.message.includes('permission-denied') ||
      e.message.includes('Uncaught Error in snapshot listener')
    )) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  });

  window.addEventListener('unhandledrejection', (e) => {
    if (e.reason && e.reason.message && (
      e.reason.message.includes('Missing or insufficient permissions') ||
      e.reason.message.includes('permission-denied')
    )) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  });
}


const originalConsoleError = console.error;
console.error = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('Uncaught Error in snapshot listener')) {
    return;
  }
  if (args[0] && args[0].code === 'permission-denied') {
    return;
  }
  originalConsoleError.apply(console, args);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CurrencyProvider>
      <App />
    </CurrencyProvider>
  </StrictMode>,
);
