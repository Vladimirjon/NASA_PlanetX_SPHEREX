import { createRoot } from 'react-dom/client';
import { App } from './ui/app';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-mono/400.css';
import './style.css';
const root = document.getElementById('root');
if (!root) throw new Error('Missing application root');
createRoot(root).render(<App />);
