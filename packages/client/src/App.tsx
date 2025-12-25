import React from "react";
import { Routes, Route } from "react-router-dom";
import ROUTES from "@/utils/routes";

// import LandingPage from "@/pages/LandingPage";    // new file above
import LoginPage from "@/pages/login"; // you already have this file
import RegisterPage from "@/pages/register"; // if exists
import LandingPage from "./pages/landingPage";
// import Dashboard from "@/pages/dashboard";       // if exists

export default function App() {
  return (
    <Routes>
      <Route path={ROUTES.HOME} element={<LandingPage />} />
      <Route path={ROUTES.LOGIN} element={<LoginPage />} />
      <Route path={ROUTES.REGISTER} element={<RegisterPage />} />

      {/* fallback */}
      <Route path="*" element={<LandingPage />} />
    </Routes>
  );
}
