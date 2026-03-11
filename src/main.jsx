import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { checkDomainLock } from './utils/domainLock.js';

// Domain lock check runs before anything renders
if (checkDomainLock()) {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
