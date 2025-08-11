import React, { useEffect, useState, Fragment } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Menu, Transition, Disclosure } from '@headlessui/react';
import { motion, Variants } from 'framer-motion';
import { FaUserCircle, FaCog, FaBars, FaTimes, FaWarehouse, FaChevronDown, FaCheck } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { usePantry } from '../context/PantryContext';
import { productsService } from '../services/productService';

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

const AnimatedLogo = () => {
  const text = "Food Tracker";

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  };

  const letterVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring', stiffness: 120, damping: 12 },
    },
  };

  return (
    <motion.h1
      className="text-xl font-bold text-gray-800 flex overflow-hidden"
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

  const navLinks = [
    { path: '/', label: 'Kalendarz' },
    { path: '/stats', label: 'Statystyki' },
    { path: '/achievements', label: 'Osiągnięcia' },
  ];

  const notify = async (fn: () => Promise<unknown>, msg: string) => {
    const id = toast.loading('⏳ Czekaj...');
    try {
      await fn();
      toast.success(msg, { id });
    } catch {
      toast.error('❌ Coś poszło nie tak.', { id });
    }
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 0);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const PantrySwitcher = () => {
    const isPantryManagementPage = pathname === '/profile/pantries';

    if (loading) return <div className="w-48 h-8 bg-gray-200 rounded-lg animate-pulse" />;

    if (!selectedPantry) {
      return (
        <div className="flex items-center px-3 py-2 text-sm font-medium bg-gray-100 rounded-lg">
          <FaWarehouse className="mr-2 text-gray-500" />
          <span>Brak spiżarni</span>
        </div>
      )
    }

    return (
      <Menu as="div" className="relative w-48">
        <Menu.Button className={`flex items-center w-full px-4 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-all ${isPantryManagementPage ? 'animate-glow' : ''}`}>
          <FaWarehouse className="mr-3 text-teal-600" />
          <span className="flex-grow text-left truncate">{selectedPantry.name}</span>
          <FaChevronDown className="ml-2 h-4 w-4 text-gray-500" />
        </Menu.Button>

        <Transition as={Fragment} enter="transition duration-150 ease-out" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="transition duration-100 ease-in" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
          <Menu.Items className="absolute left-0 mt-2 w-full origin-top-left bg-white border shadow-lg rounded-md z-50 focus:outline-none">
            <div className="px-1 py-1">
              <p className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Przełącz spiżarnię</p>
              {pantries.map((pantry) => (
                <Menu.Item key={pantry.id}>
                  {({ active }) => (
                    <button
                      onClick={() => selectPantry(pantry.id)}
                      className={classNames('w-full text-left flex justify-between items-center px-3 py-2 text-sm rounded', active ? 'bg-teal-500 text-white' : 'text-gray-900')}
                    >
                      <span className="truncate">{pantry.name}</span>
                      {selectedPantry.id === pantry.id && <FaCheck className="h-4 w-4" />}
                    </button>
                  )}
                </Menu.Item>
              ))}
            </div>
            <div className="border-t border-gray-100" />
            <div className="px-1 py-1">
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={() => navigate('/profile/pantries')}
                    className={classNames('w-full text-left px-3 py-2 text-sm rounded', active ? 'bg-gray-100' : 'text-gray-700')}
                  >
                    Zarządzaj spiżarniami...
                  </button>
                )}
              </Menu.Item>
            </div>
          </Menu.Items>
        </Transition>
      </Menu>
    )
  }

  return (
    <Disclosure as="header" className={`sticky top-0 z-50 bg-white transition-shadow ${scrolled ? 'shadow-lg' : ''}`}>
      {({ open }) => (
        <>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">

              {/* Desktop: logo + "by ipurel" */}
              <div className="hidden md:flex space-x-8 items-center">
                <div className="flex items-baseline gap-2">
                  <Link to="/" className="flex-shrink-0 cursor-pointer">
                    <AnimatedLogo />
                  </Link>
                  <span className="text-sm text-gray-500">
                    by{' '}
                    <a
                      href="https://ipurel.pl" /* TODO: podmień po deployu */
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-gray-700 hover:underline"
                    >
                      iPurel
                    </a>
                  </span>
                </div>
                {user && <PantrySwitcher />}
              </div>

              {/* Nawigacja */}
              <nav className="hidden md:flex space-x-4 items-center">
                {navLinks.map(({ path, label }) => {
                  const active = pathname === path;
                  return (
                    <Link key={path} to={path} className="relative group px-1 py-1 text-lg font-medium">
                      <span className={active ? 'text-teal-600' : 'text-gray-600 group-hover:text-gray-800'}>
                        {label}
                      </span>
                      <span className={`block absolute bottom-0 left-0 h-0.5 bg-teal-500 transition-all duration-300 ${active ? 'w-full' : 'w-0 group-hover:w-full'}`} />
                    </Link>
                  );
                })}
              </nav>

              {/* Mobile: logo + krótki dopisek */}
              <div className="flex-shrink-0 md:hidden">
                <Link to="/" className="flex items-baseline gap-1">
                  <AnimatedLogo />
                  <span className="text-[11px] text-gray-500">by iPurel</span>
                </Link>
              </div>

              {user && (
                <div className="flex items-center space-x-2 sm:space-x-4">
                  <Menu as="div" className="relative hidden md:block">
                    <Menu.Button className="flex items-center px-3 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 rounded-lg focus:outline-none transition transform hover:scale-105 active:scale-95">
                      <FaCog className="mr-2" /> Narzędzia
                    </Menu.Button>
                    <Transition as={React.Fragment} enter="transition duration-150 ease-out" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="transition duration-100 ease-in" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                      <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right bg-white border shadow-lg rounded-md z-50 focus:outline-none">
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={() => notify(productsService.runExpirationCheck, '✅ Sprawdzenie uruchomione!')}
                              className={`w-full text-left px-4 py-2 text-sm rounded focus:outline-none transition transform ${active ? 'bg-gray-100 scale-105' : 'hover:bg-gray-50 hover:scale-[1.02]'}`}
                            >
                              🔄 Wywołaj Sprawdzenie
                            </button>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={() => notify(productsService.sendTestNotification, '📧 Testowy e-mail wysłany!')}
                              className={`w-full text-left px-4 py-2 text-sm rounded focus:outline-none transition transform ${active ? 'bg-gray-100 scale-105' : 'hover:bg-gray-50 hover:scale-[1.02]'}`}
                            >
                              📧 Wyślij testowy e-mail
                            </button>
                          )}
                        </Menu.Item>
                      </Menu.Items>
                    </Transition>
                  </Menu>

                  <Menu as="div" className="relative">
                    <Menu.Button className="flex items-center space-x-2 px-1 py-1 text-gray-700 hover:text-gray-900 rounded-full focus:outline-none transition transform hover:scale-105 active:scale-95">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt="User avatar"
                          className="w-8 h-8 rounded-full object-cover border-2 border-transparent group-hover:border-teal-500"
                        />
                      ) : (
                        <FaUserCircle className="text-3xl text-gray-400" />
                      )}
                    </Menu.Button>
                    <Transition as={React.Fragment} enter="transition duration-150 ease-out" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="transition duration-100 ease-in" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                      <Menu.Items className="absolute right-0 mt-2 w-48 bg-white border shadow-lg rounded-md z-50 focus:outline-none">
                        <div className="px-4 py-2 border-b">
                          <p className="text-sm text-gray-500">Zalogowano jako</p>
                          <p className="text-sm font-medium text-gray-800 truncate">{user.email}</p>
                        </div>
                        <Menu.Item>
                          {({ active }) => (
                            <Link to="/profile" className={`block px-4 py-2 text-sm rounded focus:outline-none transition transform ${active ? 'bg-gray-100' : 'hover:bg-gray-50'}`}>
                              Profil
                            </Link>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <button onClick={logout} className={`w-full text-left px-4 py-2 text-sm text-red-600 rounded focus:outline-none transition transform ${active ? 'bg-gray-100' : 'hover:bg-gray-50'}`}>
                              Wyloguj
                            </button>
                          )}
                        </Menu.Item>
                      </Menu.Items>
                    </Transition>
                  </Menu>

                  <div className="flex items-center md:hidden">
                    <Disclosure.Button className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white">
                      <span className="sr-only">Otwórz menu</span>
                      {open ? <FaTimes className="block h-6 w-6" aria-hidden="true" /> : <FaBars className="block h-6 w-6" aria-hidden="true" />}
                    </Disclosure.Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Disclosure.Panel className="md:hidden border-t border-gray-200">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {user && <div className="px-1 py-3"><PantrySwitcher /></div>}
              <div className="border-t border-gray-100 -mx-2" />
              {navLinks.map(({ path, label }) => (
                <Disclosure.Button
                  key={label}
                  as={Link}
                  to={path}
                  className={`block px-3 py-2 rounded-md text-base font-medium ${pathname === path ? 'bg-teal-100 text-teal-800' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  {label}
                </Disclosure.Button>
              ))}
            </div>
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  );
}
