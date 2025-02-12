
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Battle from './pages/Battle.tsx'
import setupDiscordSdk from './utils/setupDiscordSdk.ts';

console.log("TEST")

setupDiscordSdk().then(() => {
console.log("TEST2")
  console.log("Discord SDK is authenticated");
});
console.log("TEST3")

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Battle />
  </StrictMode>,
)
