// src/pages/Notifications.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Megaphone, Send, Clock, CheckCircle, XCircle, Filter,
  RefreshCw, AlertCircle, Bell, BellOff, Eye, EyeOff,
  Copy, Trash2, Sparkles, MessageSquare, Users, Zap
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api';

// ─── دوال مساعدة ──────────────────────────────────────────────────
const timeAgo = (date: string) => {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return 'الآن';
  if (m < 60) return `منذ ${m} دقيقة`;
  if (h < 24) return `منذ ${h} ساعة`;
  return `منذ ${d} يوم`;
};

const getIcon = (data: any) => {
  try {
    const d = typeof data === 'string' ? JSON.parse(data) : data;
    if (d?.type === 'order_status') return { icon: '📦', color: '#3b82f6' };
    if (d?.type === 'withdrawal_status') return { icon: '💰', color: '#10b981' };
    if (d?.type === 'broadcast') return { icon: '📢', color: '#f59e0b' };
    if (d?.type === 'promo') return { icon: '🎉', color: '#8b5cf6' };
  } catch {}
  return { icon: '🔔', color: '#0c6679' };
};

// ─── قوالب الإشعارات ────────────────────────────────────────────
const TEMPLATES = [
  { label: '🎉 عرض خاص', title: 'عرض خاص!', body: 'لا تفوت عروضنا المميزة، تحقق من المنتجات الجديدة الآن!' },
  { label: '📦 منتج جديد', title: 'منتج جديد', body: 'تم إضافة منتجات جديدة، اطلع عليها الآن!' },
  { label: '⚠️ تنبيه', title: 'تنبيه مهم', body: 'يرجى الاطلاع على آخر التحديثات في التطبيق.' },
  { label: '💰 عروض السحب', title: 'عروض السحب', body: 'خصومات تصل إلى 50% على جميع المنتجات!' },
];

export default function Notifications() {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  // ── جلب الإشعارات ──────────────────────────────────────────────
  const { data: notifications = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-notifications'],
    queryFn: async () => {
      const { data } = await api.get('/api/notifications');
      return data;
    },
    refetchInterval: 30000,
    staleTime: 10000,
  });

  // ── إرسال إشعار جماعي ──────────────────────────────────────────
  const broadcast = useMutation({
    mutationFn: async () => {
      await api.post('/api/notifications/broadcast', { title, body });
    },
    onSuccess: () => {
      toast.success('تم الإرسال لجميع المستخدمين ✅');
      setTitle('');
      setBody('');
      qc.invalidateQueries({ queryKey: ['admin-notifications'] });
    },
    onError: () => toast.error('فشل الإرسال'),
  });

  // ── حذف إشعار ──────────────────────────────────────────────────
  const deleteNotification = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/notifications/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-notifications'] });
      toast.success('تم حذف الإشعار');
    },
    onError: () => toast.error('فشل الحذف'),
  });

  // ── دوال المساعدة ──────────────────────────────────────────────
  const handleSend = () => {
    if (!title.trim()) {
      toast.error('يرجى إدخال العنوان');
      return;
    }
    if (!body.trim()) {
      toast.error('يرجى إدخال نص الرسالة');
      return;
    }
    broadcast.mutate();
  };

  const applyTemplate = (t: typeof TEMPLATES[0]) => {
    setTitle(t.title);
    setBody(t.body);
  };

  const allNotifs = notifications as any[];
  const unreadCount = allNotifs.filter((n) => !n.is_read).length;
  const shown = filter === 'unread' ? allNotifs.filter((n) => !n.is_read) : allNotifs;

  // ─── عرض التحميل ───────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8" dir="rtl">
      {/* ─── الهيدر ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="text-right">
          <h1 className="text-2xl font-black text-gray-800">الإشعارات</h1>
          <p className="text-gray-500 text-sm mt-1">
            {allNotifs.length} إشعار{' '}
            {unreadCount > 0 && (
              <span className="text-red-500 font-bold">({unreadCount} غير مقروء)</span>
            )}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-50 transition"
        >
          <RefreshCw size={16} />
          تحديث
        </button>
      </div>

      {/* ─── بطاقة الإرسال ────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Megaphone size={20} className="text-white" />
          </div>
          <div className="text-right">
            <h2 className="font-bold text-gray-800">إشعار جماعي</h2>
            <p className="text-xs text-gray-400">يصل لجميع المستخدمين فوراً</p>
          </div>
        </div>

        {/* قوالب سريعة */}
        <div className="flex flex-wrap gap-2 mb-4">
          {TEMPLATES.map((t) => (
            <button
              key={t.label}
              onClick={() => applyTemplate(t)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 transition"
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* العنوان */}
        <div className="mb-3">
          <label className="block text-sm font-semibold text-gray-600 mb-1 text-right">العنوان</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="مثال: عرض خاص 🎉"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-primary text-sm text-right"
          />
        </div>

        {/* الرسالة */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-600 mb-1 text-right">الرسالة</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder="اكتب رسالتك هنا..."
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-primary text-sm text-right resize-none"
          />
        </div>

        {/* معاينة */}
        {(title || body) && (
          <div className="bg-primary/5 rounded-xl p-4 border border-primary/20 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                <Bell size={16} className="text-primary" />
              </div>
              <div className="flex-1 text-right">
                <p className="font-bold text-gray-800 text-sm">{title || 'العنوان'}</p>
                <p className="text-xs text-gray-600">{body || 'الرسالة'}</p>
              </div>
              <span className="text-[10px] font-bold text-primary bg-primary/15 px-2 py-1 rounded-lg">
                معاينة
              </span>
            </div>
          </div>
        )}

        {/* زر الإرسال */}
        <button
          onClick={handleSend}
          disabled={broadcast.isPending || !title || !body}
          className={`w-full py-3 rounded-xl font-bold text-sm text-white transition ${
            broadcast.isPending || !title || !body
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-primary hover:bg-primary-dark'
          }`}
        >
          {broadcast.isPending ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              جاري الإرسال...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Send size={16} /> إرسال للجميع
            </span>
          )}
        </button>
      </div>

      {/* ─── سجل الإشعارات ────────────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-gray-800">سجل الإشعارات</h2>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
              filter === 'all'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            الكل ({allNotifs.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
              filter === 'unread'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            غير مقروء ({unreadCount})
          </button>
        </div>
      </div>

      {/* ─── قائمة الإشعارات ──────────────────────────────────── */}
      {shown.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <BellOff size={48} className="mx-auto mb-3 opacity-30" />
          <p className="font-semibold text-lg">لا توجد إشعارات</p>
          <p className="text-sm mt-1">ستظهر الإشعارات هنا عند وصولها</p>
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map((n: any) => {
            const { icon, color } = getIcon(n.data);
            return (
              <div
                key={n.id}
                className={`bg-white rounded-2xl border p-4 shadow-sm transition hover:shadow-md ${
                  !n.is_read ? 'border-r-4 border-r-primary bg-primary/5' : 'border-gray-100'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color + '18' }}>
                    <span className="text-lg">{icon}</span>
                  </div>
                  <div className="flex-1 text-right min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-gray-800 text-sm">{n.title}</p>
                      {!n.is_read && (
                        <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                      )}
                      <span className="text-xs text-gray-400 mr-auto">{timeAgo(n.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1 break-words">{n.body}</p>
                  </div>
                  <button
                    onClick={() => {
                      if (window.confirm('هل تريد حذف هذا الإشعار؟')) {
                        deleteNotification.mutate(n.id);
                      }
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition flex-shrink-0"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}