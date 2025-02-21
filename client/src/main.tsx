import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Battle from './pages/Battle.tsx'
import setupDiscordSdk from './utils/setupDiscordSdk.ts';

async function initializeApp() {
  console.log("Starting Discord SDK...");
  try {
    await setupDiscordSdk();
    console.log("Discord SDK is authenticated");
  } catch (error) {
    console.error("Failed to authenticate Discord SDK:", error);
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Battle />
    </StrictMode>,
  );
}

initializeApp();
