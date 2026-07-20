// src/pages/Support.tsx
import { useState, useMemo, useEffect, useRef, ChangeEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Send, Image as ImageIcon, User, Phone, Clock, MoreVertical,
  Ban, Lock, Unlock, CheckCircle, XCircle, AlertTriangle, RefreshCw,
  MessageSquare, Users, ChevronLeft, Trash2, Copy, Camera
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

type SortType = 'recent' | 'unread' | 'most';

// ─── مكون فقاعة الرسالة ──────────────────────────────────────────
const ChatBubble = ({ item, nextItem }: { item: any; nextItem: any }) => {
  const isAdmin = item.from_admin;
  const showDate = !nextItem || formatDate(item.created_at) !== formatDate(nextItem.created_at);

  return (
    <>
      {showDate && (
        <div className="flex justify-center my-3">
          <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            {formatDate(item.created_at)}
          </span>
        </div>
      )}
      <div className={`flex items-end gap-2 mb-1.5 ${isAdmin ? 'justify-start' : 'justify-end'}`}>
        {!isAdmin && (
          <div className="w-7 h-7 rounded-full bg-gray-400 flex items-center justify-center flex-shrink-0">
            <User size={14} className="text-white" />
          </div>
        )}
        <div className={`max-w-[78%] ${isAdmin ? 'order-1' : ''}`}>
          <div className={`rounded-2xl px-4 py-2.5 ${
            isAdmin
              ? 'bg-primary text-white rounded-bl-sm shadow-sm'
              : 'bg-white text-gray-800 rounded-br-sm border border-gray-200 shadow-sm'
          }`}>
            {item.image_url && (
              <img
                src={item.image_url}
                alt="صورة"
                className="w-48 h-48 rounded-lg object-cover mb-1.5"
              />
            )}
            {item.message && (
              <p className={`text-sm leading-relaxed ${isAdmin ? 'text-white' : 'text-gray-800'}`}>
                {item.message}
              </p>
            )}
            <span className={`text-[10px] block mt-1 ${isAdmin ? 'text-white/70' : 'text-gray-400'}`}>
              {formatTime(item.created_at)}
            </span>
          </div>
        </div>
      </div>
    </>
  );
};

// ─── المكون الرئيسي ──────────────────────────────────────────────
export default function Support() {
  const qc = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [reply, setReply] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortType>('recent');
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevUnreadCount = useRef<number>(0);

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

  // ── إشعار بالرسائل الجديدة ─────────────────────────────────────
  useEffect(() => {
    if (!convList.length) return;
    const totalUnread = convList.reduce((sum: number, c: any) => sum + (c.unread || 0), 0);
    if (totalUnread > prevUnreadCount.current) {
      const newMessagesCount = totalUnread - prevUnreadCount.current;
      toast.success(`📩 لديك ${newMessagesCount} رسالة جديدة من التجار`);
    }
    prevUnreadCount.current = totalUnread;
  }, [convList]);

  // ── التمرير لأسفل عند اختيار مستخدم أو إرسال رسالة ────────────
  useEffect(() => {
    if (selectedUser && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedUser, conversations]);

  // ── إرسال رد ────────────────────────────────────────────────────
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

  // ── حظر / فك الحظر ─────────────────────────────────────────────
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

  // ── تحديث المستخدم المحدد عند تغير البيانات ──────────────────
  useEffect(() => {
    if (!selectedUser) return;
    const updated = convList.find((c: any) => c.userId === selectedUser.userId);
    if (updated && updated.messages?.length !== selectedUser.messages?.length) {
      setSelectedUser(updated);
    }
  }, [convList, selectedUser]);

  // ── تعيين المحادثة كمقروءة ────────────────────────────────────
  const markAsRead = async (userId: number) => {
    qc.setQueryData(['admin-support'], (old: any) => {
      if (!Array.isArray(old)) return old;
      return old.map((c: any) => c.userId === userId ? { ...c, unread: 0 } : c);
    });
    try {
      await api.post(`/api/admin/support/${userId}/read`);
    } catch {}
  };

  // ── معالجة الإرسال ─────────────────────────────────────────────
  const handleSend = () => {
    if (!reply.trim() || !selectedUser) return;
    sendReply.mutate({ userId: selectedUser.userId, message: reply.trim() });
  };

  // ── رفع صورة ────────────────────────────────────────────────────
  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
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

  // ── نسخ الرسالة ─────────────────────────────────────────────────
  const copyMessage = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('تم نسخ الرسالة');
  };

  // ── تأكيد الحظر ─────────────────────────────────────────────────
  const confirmBlock = (user: any) => {
    const isBlocked = user.isBlocked;
    if (window.confirm(isBlocked
      ? `هل تريد فك حظر ${user.storeName}؟`
      : `هل تريد حظر ${user.storeName}؟`
    )) {
      blockMutation.mutate({ userId: user.userId, block: !isBlocked });
    }
  };

  // ── فلترة وترتيب المحادثات ─────────────────────────────────────
  const filtered = useMemo(() => {
    return [...convList]
      .filter(c => !search || c.storeName?.includes(search) || c.phone?.includes(search))
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

  // ─── عرض التحميل ──────────────────────────────────────────────
  if (isLoading && !convList.length) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ─── قائمة المحادثات ──────────────────────────────────────────
  if (!selectedUser) {
    return (
      <div className="p-8" dir="rtl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black text-gray-800">الدعم الفني</h1>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-50 transition"
          >
            <RefreshCw size={16} />
            تحديث
          </button>
        </div>

        {/* البحث والترتيب */}
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث عن تاجر..."
              className="w-full pr-10 pl-4 py-3 rounded-xl border border-gray-200 bg-white text-right outline-none focus:border-primary text-sm"
            />
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
                className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
                  sort === key
                    ? 'bg-primary text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* قائمة المحادثات */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <MessageSquare size={48} className="mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-lg">لا توجد محادثات</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((c: any) => {
              const msgs = c.messages || [];
              const last = msgs[msgs.length - 1];
              return (
                <div
                  key={c.userId}
                  onClick={() => {
                    setSelectedUser(c);
                    if (c.unread > 0) markAsRead(c.userId);
                  }}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg">
                        {c.storeName?.charAt(0) || 'ت'}
                      </div>
                      {c.unread > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold min-w-[20px] h-5 rounded-full flex items-center justify-center px-1.5 border-2 border-white">
                          {c.unread > 99 ? '99+' : c.unread}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 text-right min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-gray-400">
                          {last ? formatTime(last.created_at) : ''}
                        </span>
                        <span className="font-bold text-gray-800">{c.storeName}</span>
                      </div>
                      {last ? (
                        <p className={`text-sm truncate ${c.unread > 0 ? 'font-semibold text-gray-800' : 'text-gray-500'}`}>
                          {last.from_admin ? '↩ ' : ''}{last.image_url ? '📷 صورة' : last.message || ''}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-400">{c.phone}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ─── نافذة المحادثة ────────────────────────────────────────────
  const msgs = [...(selectedUser.messages || [])].reverse();

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] p-8" dir="rtl">
      {/* هيدر المحادثة */}
      <div className="flex items-center gap-3 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
        <button
          onClick={() => setSelectedUser(null)}
          className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1 text-right">
          <p className="font-bold text-gray-800">{selectedUser.storeName}</p>
          <p className="text-sm text-gray-400">{selectedUser.phone}</p>
        </div>
        <button
          onClick={() => confirmBlock(selectedUser)}
          className={`p-2 rounded-xl transition ${
            selectedUser.isBlocked
              ? 'bg-green-50 text-green-600 hover:bg-green-100'
              : 'bg-red-50 text-red-500 hover:bg-red-100'
          }`}
        >
          {selectedUser.isBlocked ? <Unlock size={18} /> : <Ban size={18} />}
        </button>
      </div>

      {/* منطقة الرسائل */}
      <div className="flex-1 overflow-y-auto bg-gray-50 rounded-2xl p-4 mb-3">
        {msgs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <MessageSquare size={48} className="mb-3 opacity-30" />
            <p className="font-semibold">لا توجد رسائل</p>
          </div>
        ) : (
          <div className="space-y-1">
            {msgs.map((msg: any, idx: number) => (
              <div
                key={msg.id}
                className="group relative"
                onDoubleClick={() => msg.message && copyMessage(msg.message)}
              >
                <ChatBubble item={msg} nextItem={msgs[idx + 1]} />
                {msg.message && (
                  <button
                    onClick={() => copyMessage(msg.message)}
                    className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition p-1 rounded bg-gray-200/80 hover:bg-gray-300"
                    title="نسخ الرسالة"
                  >
                    <Copy size={12} />
                  </button>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* شريط الإدخال */}
      <div className="flex items-center gap-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-2">
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingImage}
          className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition disabled:opacity-50"
        >
          {uploadingImage ? (
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : (
            <ImageIcon size={20} />
          )}
        </button>

        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="اكتب ردك..."
          className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary outline-none text-sm text-right resize-none min-h-[44px] max-h-[120px]"
          rows={1}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />

        <button
          onClick={handleSend}
          disabled={!reply.trim() || sendReply.isPending}
          className={`p-2.5 rounded-xl transition ${
            !reply.trim() || sendReply.isPending
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-primary hover:bg-primary-dark'
          }`}
        >
          {sendReply.isPending ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send size={18} className="text-white" />
          )}
        </button>
      </div>
    </div>
  );
}