import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  GraduationCap,
  PlusCircle,
  Bell,
  Search,
  User,
  LogOut,
  Settings,
  Menu,
  X,
  Trophy,
  Compass,
  LayoutDashboard,
  Code2,
  UsersRound,
  Check,
  Moon,
  Sun,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.ts';
import type { Notification } from '../../types/index.ts';

export const Navbar: React.FC = () => {
  const { user, logout, unreadCount, refreshUnreadCount } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [darkMode, setDarkMode] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Toggle Dark Mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifDropdownOpen(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleOpenNotifications = async () => {
    const nextState = !notifDropdownOpen;
    setNotifDropdownOpen(nextState);
    if (nextState) {
      try {
        const list = await api.getNotifications();
        setNotifications(list.slice(0, 5));
      } catch (err) {
        console.error('Failed to load notifications:', err);
      }
    }
  };

  const handleMarkAllRead = async () => {
    await api.markAllNotificationsAsRead();
    await refreshUnreadCount();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/presentations?search=${encodeURIComponent(searchQuery.trim())}`);
      setMobileMenuOpen(false);
    }
  };

  const navLinks = [
    { label: 'Découvrir', path: '/presentations', icon: Compass },
    { label: 'Membres', path: '/users', icon: UsersRound },
    { label: 'Classement', path: '/leaderboard', icon: Trophy },
    ...(user ? [
      { label: 'Tableau de bord', path: '/dashboard', icon: LayoutDashboard },
      { label: 'Défis de code', path: '/challenges', icon: Code2 },
    ] : []),
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 transition-colors">
        <div className="mx-auto flex h-[72px] w-full max-w-[1720px] items-center justify-between px-4 sm:px-6 lg:px-10 2xl:px-12">
          {/* Logo & Brand */}
          <div className="flex items-center gap-6 xl:gap-9">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                  Class<span className="text-indigo-600 dark:text-indigo-400">Share</span>
                </span>
                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 -mt-1 hidden sm:inline">
                  Partage Académique
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1.5 xl:gap-2">
              {navLinks.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors xl:px-3.5 ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Search bar (desktop) */}
          <form onSubmit={handleSearchSubmit} className="hidden lg:flex min-w-0 w-full max-w-lg flex-1 items-center relative mx-6 xl:mx-10">
            <Search className="absolute left-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher une présentation, sujet, tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200 dark:focus:bg-slate-900"
            />
          </form>

          {/* Right actions */}
          <div className="flex shrink-0 items-center gap-2.5 xl:gap-3">
            {/* Dark mode toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              aria-label="Basculer le mode sombre"
              className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {user ? (
              <>
                {/* Notification Dropdown Trigger */}
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={handleOpenNotifications}
                    aria-label="Notifications"
                    className="relative rounded-xl p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Notification Dropdown Menu */}
                  {notifDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-800 dark:bg-slate-900 z-50">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 px-2">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Notifications ({unreadCount} non lues)
                        </span>
                        {unreadCount > 0 && (
                          <button
                            onClick={handleMarkAllRead}
                            className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                          >
                            <Check className="h-3 w-3" /> Tout marquer lu
                          </button>
                        )}
                      </div>

                      <div className="mt-2 divide-y divide-slate-100 dark:divide-slate-800/80 max-h-72 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="py-6 text-center text-xs text-slate-400">
                            Aucune notification pour le moment.
                          </div>
                        ) : (
                          notifications.map((n) => (
                            <Link
                              key={n.id}
                              to={n.presentation ? `/presentations/${n.presentation.slug}` : '/notifications'}
                              onClick={() => {
                                api.markNotificationAsRead(n.id);
                                setNotifDropdownOpen(false);
                              }}
                              className={`flex items-start gap-3 p-2.5 rounded-xl transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
                                !n.is_read ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : ''
                              }`}
                            >
                              <img
                                src={
                                  n.actor?.avatar_url ||
                                  `https://api.dicebear.com/7.x/bottts/svg?seed=${n.actor?.username || 'user'}`
                                }
                                alt=""
                                className="h-7 w-7 rounded-full shrink-0 mt-0.5 border border-slate-200"
                              />
                              <div className="text-xs">
                                <p className="text-slate-700 dark:text-slate-300">
                                  <strong className="text-slate-900 dark:text-white">
                                    {n.actor?.full_name || 'Un étudiant'}
                                  </strong>{' '}
                                  {n.type === 'like' && 'a aimé votre présentation'}
                                  {n.type === 'comment' && 'a commenté votre présentation'}
                                  {n.presentation && (
                                    <span className="font-semibold text-indigo-600 dark:text-indigo-400 block truncate">
                                      « {n.presentation.title} »
                                    </span>
                                  )}
                                </p>
                                <span className="text-[10px] text-slate-400 mt-1 block">
                                  {new Date(n.created_at).toLocaleDateString('fr-FR', {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                            </Link>
                          ))
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
                        <Link
                          to="/notifications"
                          onClick={() => setNotifDropdownOpen(false)}
                          className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                        >
                          Voir toutes les notifications →
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                {/* Create presentation CTA */}
                <Link
                  to="/presentations/new"
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition-all hover:scale-[1.02]"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>Publier</span>
                </Link>

                {/* User Dropdown */}
                <div className="relative" ref={userRef}>
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    aria-label="Menu utilisateur"
                    className="flex items-center gap-2 rounded-xl p-1 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <img
                      src={
                        user.avatar_url ||
                        `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`
                      }
                      alt={user.full_name}
                      className="h-8 w-8 rounded-full object-cover border-2 border-indigo-500/40"
                    />
                  </button>

                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-900 z-50">
                      <div className="p-3 border-b border-slate-100 dark:border-slate-800">
                        <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                          {user.full_name}
                        </div>
                        <div className="text-xs text-indigo-600 dark:text-indigo-400 font-mono">
                          @{user.username}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 truncate">
                          {user.study_program || 'Étudiant'}
                        </div>
                      </div>

                      <div className="py-1 text-xs">
                        <Link
                          to={`/profile/${user.username}`}
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          <User className="h-4 w-4 text-slate-400" /> Mon profil public
                        </Link>
                        <Link
                          to="/dashboard"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          <LayoutDashboard className="h-4 w-4 text-slate-400" /> Mon tableau de bord
                        </Link>
                        <Link
                          to="/settings/profile"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          <Settings className="h-4 w-4 text-slate-400" /> Modifier mon profil
                        </Link>
                      </div>

                      <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                        <button
                          onClick={() => {
                            logout();
                            setUserDropdownOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold"
                        >
                          <LogOut className="h-4 w-4" /> Déconnexion
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="rounded-xl px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Connexion
                </Link>
                <Link
                  to="/register"
                  className="rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700"
                >
                  S'inscrire
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden rounded-xl p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Ouvrir le menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900 space-y-3">
            <form onSubmit={handleSearchSubmit} className="relative w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher une présentation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs dark:border-slate-800 dark:bg-slate-800"
              />
            </form>

            <div className="space-y-1">
              {navLinks.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <item.icon className="h-4 w-4 text-indigo-500" />
                  {item.label}
                </Link>
              ))}

              {user && (
                <Link
                  to="/presentations/new"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                >
                  <PlusCircle className="h-4 w-4" />
                  Créer une présentation
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

    </>
  );
};
