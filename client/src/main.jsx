import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import App from './app/App.jsx';
import ThemeProvider from './app/ThemeProvider.jsx';
import './styles/reset.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/utilities.css';
import './styles/reveal.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
);
