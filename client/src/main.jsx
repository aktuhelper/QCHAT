import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { BrowserRouter } from 'react-router-dom';
import { AppContextProvider } from './context/AppContext.jsx';
import { GoogleOAuthProvider } from '@react-oauth/google';

const root = createRoot(document.getElementById('root'));

root.render(
  <StrictMode>
    <GoogleOAuthProvider clientId="68010942941-ciddkk7ft4ep4hj400ubq6pu76pm6836.apps.googleusercontent.com">
      <BrowserRouter>
        <AppContextProvider>
          <App />
        </AppContextProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  </StrictMode>
);
