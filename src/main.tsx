import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { SplashScreen } from "./components/SplashScreen.tsx";

createRoot(document.getElementById("root")!).render(
  <>
    <SplashScreen />
    <App />
  </>,
);
