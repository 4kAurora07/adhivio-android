import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Global unhandled rejection handler
window.addEventListener('unhandledrejection', (event) => {
  event.preventDefault();
  console.warn('Unhandled promise rejection:', event.reason);
});

createRoot(document.getElementById("root")!).render(<App />);