// src/pages/MerchantDetails.tsx
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight, User, Phone, MapPin, Calendar, Wallet, ShoppingBag,
  CheckCircle, XCircle, TrendingUp, Clock, Copy, Package, Truck,
  CreditCard, DollarSign, Loader2, RefreshCw // ✅ تمت إضافة RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api';

// ─── الحالات (مطابقة للتطبيق) ──────────────────────────────────
const STATUS: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  processing: { label: 'قيد المعالجة', color: '#3b82f6', bg: '#eff6ff', icon: Clock },
  shipping: { label: 'قيد التوصيل', color: '#06b6d4', bg: '#ecfeff', icon: Truck },
  delivered: { label: 'تم التوصيل', color: '#10b981', bg: '#ecfdf5', icon: CheckCircle },
  cancelled: { label: 'ملغي', color: '#ef4444', bg: '#fef2f2', icon: XCircle },
  returned: { label: 'مرفوض', color: '#f97316', bg: '#fff7ed', icon: RefreshCw }, // ✅ الآن يعمل
  postponed: { label: 'مؤجل', color: '#6b7280', bg: '#f9fafb', icon: Clock },
};

const formatDate = (d: string) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('ar-IQ', { year: 'numeric', month: 'short', day: 'numeric' });
};

const fmt = (n: number) => Math.round(n).toLocaleString('ar-IQ');

const copyText = (text: string, label: string) => {
  navigator.clipboard.writeText(text ?? '');
  toast.success(`تم نسخ ${label}`);
};

// ─── مكون البطاقة الإحصائية ─────────────────────────────────────
const StatCard = ({ label, value, color, bg, icon: Icon }: any) => (
  <div className={`${bg} rounded-2xl p-4 border border-gray-100/50 flex-1 min-w-[120px]`}>
    <div className="flex items-center gap-3 flex-row-reverse">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: color + '20' }}>
        <Icon size={16} style={{ color }} />
      </div>
      <div className="text-right">
        <p className="text-lg font-black text-gray-800">{value}</p>
        <p className="text-[10px] text-gray-500 font-medium">{label}</p>
      </div>
    </div>
  </div>
);

export default function MerchantDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'orders' | 'withdrawals'>('orders');

  // ── جلب بيانات التاجر ──────────────────────────────────────
  const { data: merchant, isLoading: merchantLoading } = useQuery({
    queryKey: ['merchant', id],
    queryFn: async () => {
      const { data: users } = await api.get('/api/admin/users');
      const merchant = users.find((u: any) => u.id === Number(id));
      if (!merchant) throw new Error('التاجر غير موجود');
      return merchant;
    },
    enabled: !!id,
    staleTime: 30000,
  });

  // ── جلب الطلبات ────────────────────────────────────────────
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['merchant-orders', id],
    queryFn: async () => {
      const { data } = await api.get(`/api/orders?merchantId=${id}&limit=999`);
      const result = data?.data || data;
      return Array.isArray(result) ? result : [];
    },
    enabled: !!id,
    refetchInterval: 30000,
    staleTime: 10000,
  });

  // ── جلب السحوبات ───────────────────────────────────────────
  const { data: withdrawals = [], isLoading: withdrawalsLoading } = useQuery({
    queryKey: ['merchant-withdrawals', id],
    queryFn: async () => {
      const { data } = await api.get('/api/withdrawals');
      return (data as any[]).filter((w: any) => w.merchantId === Number(id));
    },
    enabled: !!id,
    refetchInterval: 30000,
    staleTime: 10000,
  });

  const isLoading = merchantLoading || ordersLoading || withdrawalsLoading;

  if (isLoading || !merchant) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Loader2 size={40} className="text-primary animate-spin" />
        <span className="mr-4 text-gray-500 text-lg font-semibold">جاري تحميل بيانات التاجر...</span>
      </div>
    );
  }

  // ── حساب الإحصائيات ──────────────────────────────────────
  const allOrders = orders as any[];
  const delivered = allOrders.filter((o: any) => o.status === 'delivered');
  const totalRevenue = delivered.reduce((s, o) => s + (o.totalAmount || 0), 0);
  const totalProfit = delivered.reduce((s, o) => s + (o.totalProfit || 0), 0);
  const totalOrders = allOrders.length;
  const deliveryRate = totalOrders > 0 ? Math.round((delivered.length / totalOrders) * 100) : 0;

  const ws = withdrawals as any[];
  const paidWithdrawals = ws.filter((w: any) => w.status === 'paid');
  const totalWithdrawn = paidWithdrawals.reduce((s, w) => s + (w.amount || 0), 0);

  return (
    <div className="p-8" dir="rtl">
      {/* ─── الهيدر ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/merchants')}
          className="flex items-center gap-2 text-gray-600 hover:text-primary transition font-semibold"
        >
          <ArrowRight size={18} />
          العودة إلى التجار
        </button>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-black text-gray-800">التاجر: {merchant.storeName}</h1>
          <button
            onClick={() => copyText(String(merchant.id), 'رقم التاجر')}
            className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition"
          >
            <Copy size={16} />
          </button>
        </div>
      </div>

      {/* ─── بطاقة المعلومات الأساسية ────────────────────────── */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6 text-center">
        <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-3">
          <span className="text-3xl font-black text-primary">{merchant.storeName?.charAt(0) || '؟'}</span>
        </div>
        <h2 className="text-xl font-bold text-gray-800">{merchant.storeName}</h2>
        <p className="text-sm text-gray-400 mt-1">#{merchant.merchantId || merchant.id}</p>
        <div className="flex items-center justify-center gap-4 mt-3 text-sm flex-wrap">
          <div className="flex items-center gap-1 text-gray-600">
            <Phone size={15} className="text-primary" />
            <span className="font-mono">{merchant.phone || '—'}</span>
            {merchant.phone && (
              <button
                onClick={() => copyText(merchant.phone, 'رقم الهاتف')}
                className="p-1 text-gray-400 hover:text-primary transition"
              >
                <Copy size={12} />
              </button>
            )}
          </div>
          {merchant.address && (
            <div className="flex items-center gap-1 text-gray-600">
              <MapPin size={15} className="text-primary" />
              <span>{merchant.address}</span>
            </div>
          )}
          <div className="flex items-center gap-1 text-gray-400 text-xs">
            <Calendar size={15} />
            <span>تاريخ التسجيل: {formatDate(merchant.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* ─── إحصائيات سريعة ────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="إجمالي الطلبات"
          value={totalOrders}
          color="#0c6679"
          bg="bg-teal-50"
          icon={ShoppingBag}
        />
        <StatCard
          label="نسبة التسليم"
          value={`${deliveryRate}%`}
          color="#10b981"
          bg="bg-green-50"
          icon={CheckCircle}
        />
        <StatCard
          label="الإيرادات"
          value={`${fmt(totalRevenue)} د.ع`}
          color="#10b981"
          bg="bg-green-50"
          icon={TrendingUp}
        />
        <StatCard
          label="الأرباح"
          value={`${fmt(totalProfit)} د.ع`}
          color="#0c6679"
          bg="bg-teal-50"
          icon={Wallet}
        />
      </div>

      {/* ─── الرصيد ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6">
        <div className="flex items-center justify-around">
          <div className="text-center">
            <p className="text-xs text-gray-400">الرصيد المتاح</p>
            <p className="text-lg font-bold text-green-600">{fmt(merchant.balance || 0)} د.ع</p>
          </div>
          <div className="w-px h-10 bg-gray-200" />
          <div className="text-center">
            <p className="text-xs text-gray-400">الرصيد المعلق</p>
            <p className="text-lg font-bold text-amber-600">{fmt(merchant.pendingBalance || 0)} د.ع</p>
          </div>
          <div className="w-px h-10 bg-gray-200" />
          <div className="text-center">
            <p className="text-xs text-gray-400">إجمالي السحوبات</p>
            <p className="text-lg font-bold text-blue-600">{fmt(totalWithdrawn)} د.ع</p>
          </div>
        </div>
      </div>

      {/* ─── تبويبات الطلبات والسحوبات ──────────────────────────── */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-6 py-3 font-bold text-sm transition border-b-2 ${
            activeTab === 'orders'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          الطلبات ({allOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('withdrawals')}
          className={`px-6 py-3 font-bold text-sm transition border-b-2 ${
            activeTab === 'withdrawals'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          السحوبات ({ws.length})
        </button>
      </div>

      {/* ─── محتوى التبويب: الطلبات ────────────────────────────── */}
      {activeTab === 'orders' && (
        <>
          {allOrders.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <ShoppingBag size={48} className="mx-auto mb-3 opacity-30" />
              <p className="font-semibold">لا توجد طلبات لهذا التاجر</p>
            </div>
          ) : (
            <div className="space-y-3">
              {allOrders.map((o: any) => {
                const st = STATUS[o.status] || STATUS.processing;
                const Icon = st.icon;
                return (
                  <div
                    key={o.id}
                    className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-gray-800">طلب #{o.id}</span>
                        <span
                          className="px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1"
                          style={{ backgroundColor: st.bg, color: st.color }}
                        >
                          <Icon size={13} />
                          {st.label}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">{fmt(o.totalAmount || 0)} د.ع</p>
                        <p className="text-xs text-gray-400">{formatDate(o.createdAt)}</p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 mt-2 flex items-center gap-2 flex-wrap">
                      <span>الزبون: {o.customerName || 'بدون اسم'}</span>
                      {o.customerPhone && (
                        <span className="text-gray-400">| {o.customerPhone}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ─── محتوى التبويب: السحوبات ────────────────────────────── */}
      {activeTab === 'withdrawals' && (
        <>
          {ws.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <CreditCard size={48} className="mx-auto mb-3 opacity-30" />
              <p className="font-semibold">لا توجد سحوبات لهذا التاجر</p>
            </div>
          ) : (
            <div className="space-y-3">
              {ws.map((w: any) => {
                const st =
                  w.status === 'pending'
                    ? { label: 'قيد المعالجة', color: '#f59e0b', bg: '#fffbeb' }
                    : w.status === 'approved'
                    ? { label: 'مقبول', color: '#3b82f6', bg: '#eff6ff' }
                    : w.status === 'paid'
                    ? { label: 'مدفوع', color: '#10b981', bg: '#ecfdf5' }
                    : { label: 'مرفوض', color: '#ef4444', bg: '#fef2f2' };
                return (
                  <div
                    key={w.id}
                    className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between flex-wrap gap-2"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="px-3 py-1 rounded-xl text-xs font-bold"
                        style={{ backgroundColor: st.bg, color: st.color }}
                      >
                        {st.label}
                      </span>
                      <span className="font-bold text-primary">{fmt(w.amount)} د.ع</span>
                    </div>
                    <div className="text-right text-xs text-gray-400">
                      {formatDate(w.createdAt)}
                      {w.accountDetails && (
                        <p className="text-gray-500 mt-1">بطاقة: **** {w.accountDetails.slice(-4)}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}