import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';

import Regulamin from './pages/terms';
import PolitykaPrywatnosci from "./pages/privacy";
import Footer from './components/Footer';
import Header from './components/Header';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import EmailVerificationSent from './pages/EmailVerificationSent';
import VerifyAccount from './pages/VerifyAccount';
import DashboardPage from './pages/DashboardPage';
import StatsPage from './pages/StatsPage';
import UserProfilePage from './pages/UserProfilePage';
import RequireAuth from './routes/RequireAuth';
import SocialCallback from './components/SocialCallback';
import AchievementsPage from './pages/AchievementsPage';
import { PantryManagementPage } from './pages/PantryManagementPage';
import JoinPantryPage from './pages/JoinPantryPage';

export default function App() {
  const location = useLocation();

  // Ścieżki z "minimalnym" widokiem (bez Header/Footer)
  const minimal = [
    '/login','/register','/forgot-password','/reset-password','/email-verification-sent','/verify'
  ];

  // Dodatkowo: jeśli wchodzimy na /regulamin lub /polityka-prywatnosci z ?from=register
  const search = new URLSearchParams(location.search);
  const fromRegister = search.get('from') === 'register';
  const isLegalStandalone =
    fromRegister &&
    (location.pathname.startsWith('/regulamin') || location.pathname.startsWith('/polityka-prywatnosci'));

  const isMinimal = isLegalStandalone || minimal.some(path => location.pathname.startsWith(path));

  return (
    <>
      {!isMinimal && <Header />}
      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname + location.search}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className={isMinimal ? '' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'}
        >
          <Routes location={location} key={location.pathname + location.search}>
            {/* Minimal routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/email-verification-sent" element={<EmailVerificationSent />} />
            <Route path="/verify" element={<VerifyAccount />} />

            {/* Public: dołączanie do spiżarni */}
            <Route path="/join-pantry/:token" element={<JoinPantryPage />} />

            {/* Public: dokumenty (działają też w trybie standalone z ?from=register) */}
            <Route path="/regulamin" element={<Regulamin />} />
            <Route path="/polityka-prywatnosci" element={<PolitykaPrywatnosci />} />

            {/* Protected */}
            <Route path="/" element={<RequireAuth><DashboardPage /></RequireAuth>} />
            <Route path="/stats" element={<RequireAuth><StatsPage /></RequireAuth>} />
            <Route path="/profile" element={<RequireAuth><UserProfilePage /></RequireAuth>} />
            <Route path="/achievements" element={<RequireAuth><AchievementsPage /></RequireAuth>} />
            <Route path="/profile/pantries" element={<RequireAuth><PantryManagementPage /></RequireAuth>} />

            {/* Callbacks */}
            <Route path="/google/callback" element={<SocialCallback />} />
            <Route path="/github/callback" element={<SocialCallback />} />
          </Routes>
        </motion.main>
      </AnimatePresence>
      {!isMinimal && <Footer />}
      <Toaster
        position="bottom-right"
        toastOptions={{ duration: 4000, style: { background: '#333', color: '#fff' } }}
      />
    </>
  );
}
