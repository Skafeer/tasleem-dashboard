// src/pages/Support.tsx
import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Send, Image as ImageIcon, User, Phone, Clock, ChevronLeft,
  Ban, Lock, LockOpen, RefreshCw, MessageSquare, Users, AlertCircle,
  Paperclip, X, CheckCircle, MoreVertical, Trash2, Copy, Camera
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api';

// ─── دوال مساعدة ──────────────────────────────────────────────────
const formatTime = (date: string) => {
  const d = date.endsWith('Z') || date.includes('+') ? date : date + 'Z';
  return new Date(d).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (date: string) => {
  const d = date.endsWith('Z') || date.includes('+') ? date : date + 'Z';
  return new Date(d).toLocaleDateString('ar-IQ', { day: 'numeric', month: 'short' });
};

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

type SortType = 'recent' | 'unread' | 'most';

// ─── مكون رسالة واحدة ────────────────────────────────────────────
const ChatBubble = ({ message, isAdmin, showDate, onCopy }: any) => {
  return (
    <>
      {showDate && (
        <div className="flex justify-center my-3">
          <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            {formatDate(message.created_at)}
          </span>
        </div>
      )}
      <div className={`flex items-end gap-2 mb-2 ${isAdmin ? 'justify-start' : 'justify-end'}`}>
        {!isAdmin && (
          <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center flex-shrink-0">
            <User size={14} className="text-white" />
          </div>
        )}
        <div className={`max-w-[75%] ${isAdmin ? 'order-1' : 'order-2'}`}>
          <div
            className={`rounded-2xl px-4 py-2.5 shadow-sm ${
              isAdmin
                ? 'bg-primary text-white rounded-bl-none'
                : 'bg-white border border-gray-200 rounded-br-none'
            }`}
            onDoubleClick={() => message.message && onCopy(message.message)}
          >
            {message.image_url && (
              <img
                src={message.image_url}
                alt="مرفق"
                className="max-w-[200px] max-h-[200px] rounded-lg mb-1 object-cover"
              />
            )}
            {message.message && (
              <p className={`text-sm leading-relaxed ${isAdmin ? 'text-white' : 'text-gray-800'}`}>
                {message.message}
              </p>
            )}
            <span className={`text-[10px] mt-1 block ${isAdmin ? 'text-white/70' : 'text-gray-400'}`}>
              {formatTime(message.created_at)}
            </span>
          </div>
        </div>
      </div>
    </>
  );
};

export default function Support() {
  const qc = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [reply, setReply] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortType>('recent');
  const [uploadingImage, setUploadingImage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── جلب المحادثات ──────────────────────────────────────────────
  const { data: conversations = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-support'],
    queryFn: async () => {
      const { data } = await api.get('/api/admin/support');
      return data;
    },
    refetchInterval: 5000,
  });

  const convList = conversations as any[];

  // ── التمرير إلى أسفل عند فتح محادثة أو إرسال رسالة ────────────
  useEffect(() => {
    if (selectedUser && messagesEndRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [selectedUser, selectedUser?.messages?.length]);

  // ── إشعار بالرسائل الجديدة ─────────────────────────────────────
  const prevUnreadCount = useRef<number>(0);
  useEffect(() => {
    if (!convList.length) return;
    const totalUnread = convList.reduce((sum: number, c: any) => sum + (c.unread || 0), 0);
    if (totalUnread > prevUnreadCount.current) {
      const newMessagesCount = totalUnread - prevUnreadCount.current;
      toast.success(`📩 لديك ${newMessagesCount} رسالة جديدة من التجار`);
    }
    prevUnreadCount.current = totalUnread;
  }, [convList]);

  // ── تحديث المستخدم المحدد عند تحديث البيانات ──────────────────
  useEffect(() => {
    if (!selectedUser) return;
    const updated = convList.find((c: any) => c.userId === selectedUser.userId);
    if (updated && updated.messages?.length !== selectedUser.messages?.length) {
      setSelectedUser(updated);
    }
  }, [convList, selectedUser]);

  // ── العمليات ──────────────────────────────────────────────────
  const sendReply = useMutation({
    mutationFn: async ({ userId, message, imageUrl }: { userId: number; message: string; imageUrl?: string }) => {
      await api.post(`/api/admin/support/${userId}`, { message, imageUrl });
    },
    onSuccess: () => {
      setReply('');
      qc.invalidateQueries({ queryKey: ['admin-support'] });
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    },
    onError: () => toast.error('فشل إرسال الرد'),
  });

  const blockMutation = useMutation({
    mutationFn: async ({ userId, block }: { userId: number; block: boolean }) => {
      await api.post(`/api/admin/support/${userId}/block`, { block });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['admin-support'] });
      if (selectedUser && selectedUser.userId === vars.userId) {
        setSelectedUser((prev: any) => ({ ...prev, isBlocked: vars.block }));
      }
      toast.success(vars.block ? 'تم حظر المستخدم' : 'تم فك الحظر عن المستخدم');
    },
    onError: () => toast.error('فشل تحديث حالة الحظر'),
  });

  const markAsRead = async (userId: number) => {
    qc.setQueryData(['admin-support'], (old: any) => {
      if (!Array.isArray(old)) return old;
      return old.map((c: any) => c.userId === userId ? { ...c, unread: 0 } : c);
    });
    try {
      await api.post(`/api/admin/support/${userId}/read`);
    } catch {}
  };

  // ── دوال المساعدة ──────────────────────────────────────────────
  const handleSend = () => {
    if (!reply.trim() || !selectedUser) return;
    sendReply.mutate({ userId: selectedUser.userId, message: reply.trim() });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedUser) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم الصورة كبير جداً (الحد الأقصى 5 ميجا)');
      return;
    }

    setUploadingImage(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const base64 = ev.target?.result as string;
          const { data } = await api.post('/api/support/upload-image', { imageBase64: base64 });
          if (data?.url) {
            sendReply.mutate({ userId: selectedUser.userId, message: '', imageUrl: data.url });
          } else {
            toast.error('لم يتم استلام رابط الصورة');
          }
        } catch {
          toast.error('فشل رفع الصورة');
        } finally {
          setUploadingImage(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error('حدث خطأ');
      setUploadingImage(false);
    }
    e.target.value = '';
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('تم نسخ الرسالة');
  };

  const confirmBlock = (user: any) => {
    const isBlocked = user.isBlocked;
    if (window.confirm(isBlocked ? `هل تريد فك حظر ${user.storeName}؟` : `هل تريد حظر ${user.storeName}؟`)) {
      blockMutation.mutate({ userId: user.userId, block: !isBlocked });
    }
  };

  // ─── الفلترة والترتيب ──────────────────────────────────────────
  const filtered = useMemo(() => {
    return [...convList]
      .filter(c => !search || c.storeName?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search))
      .sort((a, b) => {
        if (sort === 'unread') return b.unread - a.unread;
        if (sort === 'most') return (b.messages?.length || 0) - (a.messages?.length || 0);
        const getTime = (conv: any) => {
          const msgs = conv.messages || [];
          if (msgs.length > 0) {
            return new Date(msgs[msgs.length - 1].created_at).getTime();
          }
          return 0;
        };
        return getTime(b) - getTime(a);
      });
  }, [convList, search, sort]);

  // ─── عرض قائمة المحادثات ──────────────────────────────────────
  if (!selectedUser) {
    return (
      <div className="p-6" dir="rtl">
        {/* الهيدر */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-black text-gray-800">الدعم الفني</h1>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-50 transition"
          >
            <RefreshCw size={16} />
            تحديث
          </button>
        </div>

        {/* شريط البحث */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث عن تاجر..."
              className="w-full pr-10 pl-4 py-3 rounded-xl border border-gray-200 bg-white text-right outline-none focus:border-primary text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <div className="flex gap-2">
            {[
              ['recent', 'الأحدث'],
              ['unread', 'غير مقروء'],
              ['most', 'الأكثر'],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setSort(key as SortType)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  sort === key
                    ? 'bg-primary text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-primary'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* قائمة المحادثات */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <MessageSquare size={48} className="mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-lg">لا توجد محادثات</p>
            <p className="text-sm mt-1">ستظهر محادثات التجار هنا</p>
          </div>
        ) : (
          <div className="space-y-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {filtered.map((item: any) => {
              const msgs = item.messages || [];
              const last = msgs[msgs.length - 1];
              return (
                <button
                  key={item.userId}
                  onClick={() => {
                    setSelectedUser(item);
                    if (item.unread > 0) markAsRead(item.userId);
                  }}
                  className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition border-b border-gray-50 last:border-0 text-right"
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-white font-bold text-lg">
                        {item.storeName?.charAt(0) || 'ت'}
                      </span>
                    </div>
                    {item.unread > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                        {item.unread > 99 ? '99+' : item.unread}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-gray-400">
                        {last ? formatTime(last.created_at) : ''}
                      </span>
                      <span className="font-bold text-gray-800 truncate">{item.storeName}</span>
                    </div>
                    {last ? (
                      <p className={`text-sm truncate ${item.unread > 0 ? 'font-semibold text-gray-800' : 'text-gray-500'}`}>
                        {last.from_admin ? '↩ ' : ''}
                        {last.image_url ? '📷 صورة' : last.message}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-400">{item.phone}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ─── عرض المحادثة ──────────────────────────────────────────────
  const msgs = selectedUser.messages || []; // الأقدم أولاً، الأحدث أخيراً

  return (
    <div className="flex flex-col h-full bg-gray-50" dir="rtl">
      {/* ─── هيدر المحادثة ────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 flex-shrink-0">
        <button
          onClick={() => setSelectedUser(null)}
          className="p-2 rounded-xl hover:bg-gray-100 transition"
        >
          <ChevronLeft size={20} className="text-gray-600" />
        </button>
        <div className="flex-1 text-right">
          <p className="font-bold text-gray-800">{selectedUser.storeName}</p>
          <p className="text-xs text-gray-400">{selectedUser.phone}</p>
        </div>
        <button
          onClick={() => confirmBlock(selectedUser)}
          className={`p-2 rounded-xl transition ${
            selectedUser.isBlocked
              ? 'bg-green-50 text-green-600 hover:bg-green-100'
              : 'bg-red-50 text-red-500 hover:bg-red-100'
          }`}
        >
          {selectedUser.isBlocked ? <LockOpen size={18} /> : <Ban size={18} />}
        </button>
      </div>

      {/* ─── منطقة الرسائل ────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {msgs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <MessageSquare size={48} className="mb-3 opacity-30" />
            <p className="font-semibold">لا توجد رسائل</p>
            <p className="text-sm">ابدأ المحادثة الآن</p>
          </div>
        ) : (
          msgs.map((msg: any, idx: number) => {
            const nextMsg = msgs[idx + 1];
            const showDate = !nextMsg || formatDate(msg.created_at) !== formatDate(nextMsg.created_at);
            return (
              <ChatBubble
                key={msg.id}
                message={msg}
                isAdmin={msg.from_admin}
                showDate={showDate}
                onCopy={handleCopy}
              />
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ─── شريط الإدخال ────────────────────────────────────── */}
      <div className="flex items-end gap-2 p-3 bg-white border-t border-gray-200 flex-shrink-0">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingImage}
          className="p-2.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition flex-shrink-0"
        >
          {uploadingImage ? (
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : (
            <Paperclip size={18} />
          )}
        </button>

        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="اكتب ردك..."
          rows={1}
          className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-primary text-sm text-right resize-none min-h-[44px] max-h-[120px]"
          style={{ direction: 'rtl' }}
        />

        <button
          onClick={handleSend}
          disabled={!reply.trim() || sendReply.isPending}
          className={`p-2.5 rounded-xl text-white flex-shrink-0 transition ${
            !reply.trim() || sendReply.isPending
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-primary hover:bg-primary-dark'
          }`}
        >
          {sendReply.isPending ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send size={18} />
          )}
        </button>
      </div>
    </div>
  );
}