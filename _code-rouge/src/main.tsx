import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/chakra-petch/latin-500.css";
import "@fontsource/chakra-petch/latin-600.css";
import "@fontsource/chakra-petch/latin-700.css";
import "@fontsource-variable/manrope/wght.css";
import "@fontsource/jetbrains-mono/latin-500.css";
import "@fontsource/jetbrains-mono/latin-700.css";
import "@fontsource/caveat/latin-600.css";
import "./styles/app.css";
import { App } from "./App";
import { GameProvider } from "./game";

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <GameProvider>
      <App />
    </GameProvider>
  </StrictMode>,
);
