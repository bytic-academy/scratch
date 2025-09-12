import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import HomePage from "./pages/home.tsx";
import { BrowserRouter, Route, Routes } from "react-router";
import { ScreenOrientation } from "@capacitor/screen-orientation";

void ScreenOrientation.lock({ orientation: "landscape-primary" });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
