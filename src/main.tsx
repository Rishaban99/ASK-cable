import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ToastProvider } from './components/Toast.tsx';
import './index.css';

// -------------------------------------------------------------------
// PREVENT MOBILE ZOOMING (Pinch-to-zoom & gesture zoom)
// -------------------------------------------------------------------
if (typeof window !== 'undefined') {
  // Prevent iOS Safari gesture pinch-zoom
  document.addEventListener('gesturestart', (e) => {
    e.preventDefault();
  });
  document.addEventListener('gesturechange', (e) => {
    e.preventDefault();
  });
  document.addEventListener('gestureend', (e) => {
    e.preventDefault();
  });

  // Block multi-touch pinch zoom
  document.addEventListener(
    'touchstart',
    (e) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    },
    { passive: false }
  );
}

createRoot(document.getElementById('root')!).render(
  <ToastProvider>
    <App />
  </ToastProvider>
);
