import { createRoot } from "react-dom/client";
import "./styles/globals.css";
import "./app/i18n";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(<App />);
