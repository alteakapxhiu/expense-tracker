import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const stored = localStorage.getItem("ledgerly-theme");
document.documentElement.classList.add(stored === "light" ? "light" : "dark");
createRoot(document.getElementById("root")!).render(<App />);
