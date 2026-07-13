import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setBaseUrl } from "@workspace/api-client-react";

// When deploying to Vercel, set VITE_API_URL to your Render backend URL,
// e.g. https://clariva-api.onrender.com
// In local development this is empty so requests are proxied by Vite.
setBaseUrl(import.meta.env.VITE_API_URL ?? "");

createRoot(document.getElementById("root")!).render(<App />);

