import { StrictMode } from 'react';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/syne/700.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/hanken-grotesk/400.css';
import '@fontsource/hanken-grotesk/500.css';
import '@fontsource/hanken-grotesk/600.css';
import '@fontsource/hanken-grotesk/700.css';
import './styles/tokens.css';
import './styles/global.css';
import './styles/studio-compat.css';
import { App } from './App.tsx';

export default function DesktopApp() {
  return (
  <StrictMode>
    <div className="desktop-app"><App /></div>
  </StrictMode>
  );
}
