import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import { startSession } from './ui/logStore';
import { exhibitFromUrl, loadSettings } from './ui/settings';
import './styles.css';

// 起動をログに残す（画面のイベントより先に。設定はこの時点のものを全部残す）
startSession(exhibitFromUrl() ? 'exhibit' : 'dev', loadSettings());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

import './ui/GameLayout.css';

import './ui/Festival.css';
