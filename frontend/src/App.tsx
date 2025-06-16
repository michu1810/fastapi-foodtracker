import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';

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

export default function App() {
  const location = useLocation();
  const minimal = ['/login','/register','/forgot-password','/reset-password','/email-verification-sent','/verify'];
  const isMinimal = minimal.includes(location.pathname);

  return (
    <>
      {!isMinimal && <Header />}
      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className={isMinimal ? '' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'}
        >
          <Routes location={location} key={location.pathname}>
            {/* Minimal routes */}
            {isMinimal && (
              <>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/email-verification-sent" element={<EmailVerificationSent />} />
                <Route path="/verify" element={<VerifyAccount />} />
              </>
            )}
            {/* Protected pages */}
            {!isMinimal && (
              <>
                <Route path="/" element={<RequireAuth><DashboardPage /></RequireAuth>} />
                <Route path="/stats" element={<RequireAuth><StatsPage /></RequireAuth>} />
                <Route path="/profile" element={<RequireAuth><UserProfilePage /></RequireAuth>} />
                <Route path="/achievements" element={<RequireAuth><AchievementsPage /></RequireAuth>} />
              </>
            )}
            {/* Callbacks */}
            <Route path="/google/callback" element={<SocialCallback />} />
            <Route path="/github/callback" element={<SocialCallback />} />
          </Routes>
        </motion.main>
      </AnimatePresence>
      <Toaster position="bottom-right" toastOptions={{ duration: 4000, style: { background: '#333', color: '#fff' } }} />
    </>
  );
}
