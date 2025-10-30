// runtime fetch fixes (monkey-patch) to handle legacy PUT/DELETE -> POST _action fallback
import './lib/fetchFixes';
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
// AOS (Animate On Scroll) for scroll animations
import AOS from 'aos'
import 'aos/dist/aos.css'
import { ToastProvider } from './components/Toast';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>,
)

// Initialize AOS after hydration so it works on client-side navigation
if (typeof window !== 'undefined') {
  // delay slightly so components mount
  setTimeout(() => {
    AOS.init({ once: true, duration: 700, offset: 120 });
  }, 120);
}
