import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";

// When deploying to Vercel, set VITE_API_URL to your Render backend URL,
// e.g. https://clariva-api.onrender.com
// In local development this is empty so requests are proxied by Vite.
setBaseUrl(import.meta.env.VITE_API_URL ?? "");

// Restore the session token from localStorage so authenticated requests are
// sent with the Authorization header even after a page refresh.
const persistedToken = localStorage.getItem("auth_token");
if (persistedToken) {
  setAuthTokenGetter(() => persistedToken);
}

createRoot(document.getElementById("root")!).render(<App />);


