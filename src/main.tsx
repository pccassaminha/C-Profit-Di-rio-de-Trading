import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { CurrencyProvider } from './contexts/CurrencyContext';

// Suppress benign ResizeObserver loop limit errors
if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    if (e.message && (e.message.includes('ResizeObserver') || e.message.includes('loop limit exceeded'))) {
      e.stopImmediatePropagation();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CurrencyProvider>
      <App />
    </CurrencyProvider>
  </StrictMode>,
);
