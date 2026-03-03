import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { SplashScreen } from "./components/SplashScreen.tsx";
import { initSentry } from "./lib/sentry.ts";

initSentry();

createRoot(document.getElementById("root")!).render(
  <>
    <SplashScreen />
    <App />
  </>,
);
