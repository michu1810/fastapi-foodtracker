import "./i18n";
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthProvider';
import { PantryProvider } from './context/PantryProvider';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <PantryProvider>
          <App />
        </PantryProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
