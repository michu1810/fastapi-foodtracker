import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Menu, Transition, Disclosure } from '@headlessui/react';
import { motion, Variants } from 'framer-motion';
import {
  FaUserCircle,
  FaCog,
  FaBars,
  FaTimes,
  FaWarehouse,
  FaChevronDown,
  FaCheck,
  FaSyncAlt,
  FaEnvelope,
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { usePantry } from '../context/PantryContext';
import { productsService } from '../services/productService';
import { useTranslation } from 'react-i18next';
import AnimatedLangSwitcher from './LanguageSwitcher';
import ThemeToggle from './ThemeToggle';

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

/** --- LOGO --- */
const AnimatedLogo = () => {
  const { t } = useTranslation();
  const text = t('appName');

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };

  const letterVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 120, damping: 12 } },
  };

  return (
    <motion.h1
      className="text-xl font-bold text-gray-800 dark:text-gray-100 flex overflow-hidden"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ scale: 1.03, transition: { type: 'spring', stiffness: 400, damping: 10 } }}
      aria-label={text}
    >
      {text.split('').map((char, index) => (
        <motion.span key={index} variants={letterVariants} style={{ display: 'inline-block', whiteSpace: 'pre' }}>
          {char}
        </motion.span>
      ))}
    </motion.h1>
  );
};

export default function Header() {
  const { user, logout } = useAuth();
  const { pantries, selectedPantry, selectPantry, loading } = usePantry();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const { t } = useTranslation();

  const navLinks = [
    { path: '/', label: t('calendar') },
    { path: '/stats', label: t('stats') },
    { path: '/achievements', label: t('achievements') },
  ];

  const notify = async (fn: () => Promise<unknown>, msgKey: string) => {
    const id = toast.loading(`⏳ ${t('pleaseWait')}`);
    try {
      await fn();
      toast.success(t(msgKey), { id });
    } catch {
      toast.error(`❌ ${t('somethingWentWrong')}`, { id });
    }
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 0);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /** --- PANTRY SWITCHER (responsywny) --- */
  const PantrySwitcher = () => {
    const isPantryManagementPage = pathname === '/profile/pantries';

    if (loading) return <div className="w-full md:w-56 h-9 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />;

    if (!selectedPantry) {
      return (
        <div className="flex w-full md:w-auto items-center px-3 py-2 text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg">
          <FaWarehouse className="mr-2 text-gray-500 dark:text-gray-300" />
          <span className="truncate">{t('noPantry')}</span>
        </div>
      );
    }

    return (
      <Menu as="div" className="relative w-full md:w-56">
        <Menu.Button
          className={classNames(
            'flex items-center w-full px-4 py-2 text-sm font-bold text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-all',
            isPantryManagementPage ? 'animate-glow' : ''
          )}
        >
          <FaWarehouse className="mr-3 text-teal-600" />
          <span className="flex-grow text-left truncate">{selectedPantry.name}</span>
          <FaChevronDown className="ml-2 h-4 w-4 text-gray-500 dark:text-gray-300" />
        </Menu.Button>

        <Transition
          as="div"
          enter="transition duration-150 ease-out"
          enterFrom="opacity-0 scale-95"
          enterTo="opacity-100 scale-100"
          leave="transition duration-100 ease-in"
          leaveFrom="opacity-100 scale-100"
          leaveTo="opacity-0 scale-95"
        >
          <Menu.Items className="absolute left-0 mt-2 w-full origin-top-left bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-lg rounded-md z-50 focus:outline-none">
            <div className="px-1 py-1">
              <p className="px-3 py-2 text-xs font-semibold text-gray-400 dark:text-gray-400 uppercase tracking-wider">
                {t('switchPantry')}
              </p>
              {pantries.map((pantry) => (
                <Menu.Item key={pantry.id}>
                  {({ active }) => (
                    <button
                      onClick={() => selectPantry(pantry.id)}
                      className={classNames(
                        'w-full text-left flex justify-between items-center px-3 py-2 text-sm rounded',
                        active
                          ? 'bg-teal-500 text-white'
                          : 'text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800'
                      )}
                    >
                      <span className="truncate">{pantry.name}</span>
                      {selectedPantry.id === pantry.id && <FaCheck className="h-4 w-4" />}
                    </button>
                  )}
                </Menu.Item>
              ))}
            </div>
            <div className="border-t border-gray-100 dark:border-gray-800" />
            <div className="px-1 py-1">
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={() => navigate('/profile/pantries')}
                    className={classNames(
                      'w-full text-left px-3 py-2 text-sm rounded',
                      active ? 'bg-gray-100 dark:bg-gray-800' : 'text-gray-700 dark:text-gray-200'
                    )}
                  >
                    {t('managePantries')}…
                  </button>
                )}
              </Menu.Item>
            </div>
          </Menu.Items>
        </Transition>
      </Menu>
    );
  };

  /** --- TOOLS (DESKTOP): kontrolowane menu, nie zamyka się przy zmianie języka --- */
  const [toolsOpen, setToolsOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!toolsRef.current) return;
      if (toolsRef.current.contains(e.target as Node)) return;
      setToolsOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setToolsOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, []);

  const ToolsMenuDesktop = () => (
    <div className="relative hidden md:block" ref={toolsRef}>
      <button
        type="button"
        onClick={() => setToolsOpen((v) => !v)}
        className="flex items-center px-3 py-2 text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg focus:outline-none transition transform hover:scale-105 active:scale-95"
        aria-haspopup="true"
        aria-expanded={toolsOpen}
      >
        <FaCog className="mr-2" /> {t('tools')}
      </button>

      <div
        className={classNames(
          'absolute right-0 mt-2 w-80 origin-top-right bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-lg rounded-md z-50 focus:outline-none',
          toolsOpen ? 'pointer-events-auto opacity-100 translate-y-0' : 'pointer-events-none opacity-0 -translate-y-1',
          'transition-all duration-150'
        )}
        role="menu"
        aria-hidden={!toolsOpen}
      >
        <div className="px-2 py-2">
          <button
            onClick={() => notify(productsService.runExpirationCheck, 'expirationCheckStarted')}
            className="w-full grid grid-cols-[20px_1fr] items-center gap-3 px-3 py-2 text-sm rounded hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-100"
          >
            <FaSyncAlt className="w-5 h-5 text-emerald-600" />
            <span className="text-left leading-tight break-words">{t('triggerExpirationCheck')}</span>
          </button>
          <button
            onClick={() => notify(productsService.sendTestNotification, 'testEmailSent')}
            className="mt-1 w-full grid grid-cols-[20px_1fr] items-center gap-3 px-3 py-2 text-sm rounded hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-100"
          >
            <FaEnvelope className="w-5 h-5 text-emerald-600" />
            <span className="text-left leading-tight break-words">{t('sendTestEmail')}</span>
          </button>
        </div>

        <div className="border-t border-gray-100 dark:border-gray-800" />

        <div className="px-3 py-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('appearance')}</p>
          <ThemeToggle />
        </div>

        <div className="border-t border-gray-100 dark:border-gray-800" />

        <div className="px-3 py-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('language')}</p>
          <AnimatedLangSwitcher />
        </div>
      </div>
    </div>
  );

  return (
    <Disclosure
      as="header"
      className={classNames(
        'sticky top-0 z-50 transition-shadow',
        scrolled ? 'shadow-lg' : '',
        'bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700'
      )}
    >
      {({ open }) => (
        <div className="contents">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-16">
              {/* Left (logo + pantry) */}
              <div className="hidden md:flex items-center gap-6">
                <div className="flex items-baseline gap-2">
                  <Link to="/" className="flex-shrink-0 cursor-pointer">
                    <AnimatedLogo />
                  </Link>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {t('by')}{' '}
                    <a
                      href="https://ipurel.pl"
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-gray-700 dark:text-gray-200 hover:underline"
                    >
                      iPurel
                    </a>
                  </span>
                </div>
                {user && <PantrySwitcher />}
              </div>

              {/* Center nav (desktop) */}
              <nav className="hidden md:flex items-center mx-auto gap-4">
                {navLinks.map(({ path, label }) => {
                  const active = pathname === path;
                  return (
                    <Link key={path} to={path} className="relative group px-1 py-1 text-lg font-medium">
                      <span className={active ? 'text-teal-600' : 'text-gray-600 dark:text-gray-300 group-hover:text-gray-800 dark:group-hover:text-white'}>
                        {label}
                      </span>
                      <span
                        className={classNames(
                          'block absolute bottom-0 left-0 h-0.5 bg-teal-500 transition-all duration-300',
                          active ? 'w-full' : 'w-0 group-hover:w-full'
                        )}
                      />
                    </Link>
                  );
                })}
              </nav>

              {/* Right cluster */}
              {user && (
                <div className="ml-auto flex items-center gap-2 sm:gap-4">
                  <ToolsMenuDesktop />

                  {/* User menu */}
                  <Menu as="div" className="relative">
                    <Menu.Button className="flex items-center gap-2 px-1 py-1 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white rounded-full focus:outline-none transition transform hover:scale-105 active:scale-95">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt="User avatar"
                          className="w-8 h-8 rounded-full object-cover border-2 border-transparent"
                        />
                      ) : (
                        <FaUserCircle className="text-3xl text-gray-400 dark:text-gray-300" />
                      )}
                    </Menu.Button>
                    <Transition
                      as="div"
                      enter="transition duration-150 ease-out"
                      enterFrom="opacity-0 scale-95"
                      enterTo="opacity-100 scale-100"
                      leave="transition duration-100 ease-in"
                      leaveFrom="opacity-100 scale-100"
                      leaveTo="opacity-0 scale-95"
                    >
                      <Menu.Items className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-lg rounded-md z-50 focus:outline-none">
                        <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                          <p className="text-sm text-gray-500 dark:text-gray-400">{t('loggedInAs')}</p>
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{user.email}</p>
                        </div>
                        <Menu.Item>
                          {({ active }) => (
                            <Link
                              to="/profile"
                              className={classNames(
                                'block px-4 py-2 text-sm rounded',
                                active ? 'bg-gray-100 dark:bg-gray-800' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
                              )}
                            >
                              {t('profile')}
                            </Link>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={logout}
                              className={classNames(
                                'w-full text-left px-4 py-2 text-sm rounded text-red-600',
                                active ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                              )}
                            >
                              {t('logout')}
                            </button>
                          )}
                        </Menu.Item>
                      </Menu.Items>
                    </Transition>
                  </Menu>

                  {/* Mobile hamburger */}
                  <div className="flex items-center md:hidden">
                    <Disclosure.Button className="inline-flex items-center justify-center p-2 rounded-md text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-teal-500">
                      <span className="sr-only">{t('openMenu')}</span>
                      {open ? <FaTimes className="block h-6 w-6" /> : <FaBars className="block h-6 w-6" />}
                    </Disclosure.Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile panel */}
          <Disclosure.Panel className="md:hidden border-t border-gray-200 dark:border-gray-700">
            <div className="px-4 pt-3 pb-4 space-y-3">
              {user && (
                <div className="w-full">
                  <PantrySwitcher />
                </div>
              )}

              {/* TOOLS (mobile, zwijane) */}
              {user && (
                <Disclosure>
                  {({ open: toolsOpen }) => (
                    <div className="space-y-2">
                      <Disclosure.Button className="w-full flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 shadow-sm">
                        <span className="flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-100">
                          <FaCog className="text-emerald-600" />
                          {t('tools')}
                        </span>
                        <FaChevronDown
                          className={classNames('h-4 w-4 text-gray-500 dark:text-gray-300 transition-transform', toolsOpen ? 'rotate-180' : 'rotate-0')}
                        />
                      </Disclosure.Button>
                      <Disclosure.Panel className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 shadow-sm">
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => notify(productsService.runExpirationCheck, 'expirationCheckStarted')}
                            className="w-full grid grid-cols-[20px_1fr] items-center gap-3 px-3 py-2 text-sm rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                          >
                            <FaSyncAlt className="w-5 h-5 text-emerald-600" />
                            <span className="text-left leading-tight text-gray-800 dark:text-gray-100">{t('triggerExpirationCheck')}</span>
                          </button>
                          <button
                            onClick={() => notify(productsService.sendTestNotification, 'testEmailSent')}
                            className="w-full grid grid-cols-[20px_1fr] items-center gap-3 px-3 py-2 text-sm rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                          >
                            <FaEnvelope className="w-5 h-5 text-emerald-600" />
                            <span className="text-left leading-tight text-gray-800 dark:text-gray-100">{t('sendTestEmail')}</span>
                          </button>
                        </div>

                        <div className="my-3 h-px bg-gray-100 dark:bg-gray-800" />

                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('appearance')}</span>
                          <ThemeToggle />
                        </div>

                        <div className="my-3 h-px bg-gray-100 dark:bg-gray-800" />

                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('language')}</span>
                          <AnimatedLangSwitcher />
                        </div>
                      </Disclosure.Panel>
                    </div>
                  )}
                </Disclosure>
              )}

              {/* Nav links */}
              <div className="border-t border-gray-100 dark:border-gray-800 -mx-4" />
              <div className="space-y-1">
                {navLinks.map(({ path, label }) => (
                  <Disclosure.Button
                    key={path}
                    as={Link}
                    to={path}
                    className={classNames(
                      'block w-full px-3 py-2 rounded-md text-base font-medium',
                      pathname === path
                        ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    )}
                  >
                    {label}
                  </Disclosure.Button>
                ))}
              </div>
            </div>
          </Disclosure.Panel>
        </div>
      )}
    </Disclosure>
  );
}
