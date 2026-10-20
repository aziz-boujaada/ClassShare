import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Check, Heart, MessageSquare, ArrowLeft, ExternalLink } from 'lucide-react';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import type { Notification } from '../types/index.ts';

export const NotificationsPage: React.FC = () => {
  const { user, refreshUnreadCount } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(true);

  const fetchNotifs = async () => {
    setLoading(true);
    try {
      const list = await api.getNotifications();
      setNotifications(list);
    } catch (e) {
      console.error('Failed to load notifications:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const handleMarkOne = async (id: string) => {
    await api.markNotificationAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    await refreshUnreadCount();
  };

  const handleMarkAll = async () => {
    await api.markAllNotificationsAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await refreshUnreadCount();
  };

  const filteredNotifs = notifications.filter((n) => (filter === 'unread' ? !n.is_read : true));

  return (
    <div className="min-h-screen bg-slate-50/50 py-10 dark:bg-slate-950">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Retour au tableau de bord
        </Link>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                <Bell className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900 dark:text-white">
                  Centre de Notifications
                </h1>
                <p className="text-xs text-slate-500">
                  Activités récentes relatives à vos présentations et interactions.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                <button
                  onClick={() => setFilter('all')}
                  className={`rounded-lg px-3 py-1 text-xs font-bold ${
                    filter === 'all'
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
                      : 'text-slate-500'
                  }`}
                >
                  Toutes
                </button>
                <button
                  onClick={() => setFilter('unread')}
                  className={`rounded-lg px-3 py-1 text-xs font-bold ${
                    filter === 'unread'
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
                      : 'text-slate-500'
                  }`}
                >
                  Non lues
                </button>
              </div>

              <button
                onClick={handleMarkAll}
                className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
              >
                <Check className="h-3.5 w-3.5" /> Tout marquer lu
              </button>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-14 bg-slate-100 rounded-2xl dark:bg-slate-800" />
              <div className="h-14 bg-slate-100 rounded-2xl dark:bg-slate-800" />
            </div>
          ) : filteredNotifs.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Aucune notification dans cette vue.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredNotifs.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start justify-between p-4 rounded-2xl transition-colors ${
                    !n.is_read
                      ? 'bg-indigo-50/50 dark:bg-indigo-950/20'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <img
                      src={
                        n.actor?.avatar_url ||
                        `https://api.dicebear.com/7.x/bottts/svg?seed=${n.actor?.username || 'user'}`
                      }
                      alt=""
                      className="h-9 w-9 rounded-full object-cover shrink-0 mt-0.5 border border-slate-200"
                    />
                    <div>
                      <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                        <strong className="text-slate-900 dark:text-white">
                          {n.actor?.full_name || 'Un étudiant'}
                        </strong>{' '}
                        {n.type === 'like' && (
                          <span className="text-rose-600 dark:text-rose-400 inline-flex items-center gap-1">
                            <Heart className="h-3 w-3 fill-rose-500 inline" /> a aimé votre exposé
                          </span>
                        )}
                        {n.type === 'comment' && (
                          <span className="text-indigo-600 dark:text-indigo-400 inline-flex items-center gap-1">
                            <MessageSquare className="h-3 w-3 inline" /> a commenté votre exposé
                          </span>
                        )}
                      </p>

                      {n.presentation && (
                        <Link
                          to={`/presentations/${n.presentation.slug}`}
                          onClick={() => handleMarkOne(n.id)}
                          className="font-bold text-xs text-slate-900 dark:text-white hover:text-indigo-600 mt-1 inline-flex items-center gap-1"
                        >
                          « {n.presentation.title} » <ExternalLink className="h-3 w-3 text-slate-400" />
                        </Link>
                      )}

                      <span className="text-[10px] text-slate-400 block mt-1">
                        {new Date(n.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  {!n.is_read && (
                    <button
                      onClick={() => handleMarkOne(n.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:text-indigo-600 text-xs"
                      title="Marquer comme lu"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
