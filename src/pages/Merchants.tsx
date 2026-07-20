// src/pages/Merchants.tsx
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom'; // ✅ إضافة useNavigate
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Pencil, Trash2, Copy, X, Eye, EyeOff, User, Phone, MapPin,
  Wallet, ShoppingBag, Store, Users, CheckCircle, XCircle, TrendingUp,
  Filter, RefreshCw, ChevronDown, ChevronUp, Clock, DollarSign, UserPlus,
  MoreVertical, Star, BarChart3, PieChart, Activity
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api';

// ─── الألوان الأساسية ──────────────────────────────────────────
const COLORS = {
  primary: '#0c6679',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  purple: '#8b5cf6',
  secondary: '#f5a006',
};

// ─── أنماط الفلترة (مطابقة لنسخة التطبيق) ─────────────────────
type FilterState = {
  status: 'all' | 'active' | 'inactive';
  balance: 'all' | 'has_balance' | 'no_balance';
  orders: 'all' | 'high_orders' | 'low_orders';
  sortBy: 'newest' | 'name_asc' | 'name_desc' | 'balance_high' | 'balance_low' | 'orders_high';
};

const defaultFilters: FilterState = {
  status: 'all',
  balance: 'all',
  orders: 'all',
  sortBy: 'newest',
};

// ─── تنسيق التاريخ ─────────────────────────────────────────────
const formatDate = (d: string) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('ar-IQ', { year: 'numeric', month: 'short', day: 'numeric' });
};

// ─── دالة النسخ ──────────────────────────────────────────────────
const copyText = (text: string, label: string) => {
  navigator.clipboard.writeText(text ?? '');
  toast.success(`تم نسخ ${label}`);
};

// ─── مكون بطاقة الإحصاء السريع ──────────────────────────────────
const StatCard = ({ icon: Icon, label, value, color, bg, sub }: any) => (
  <div className={`${bg} rounded-2xl p-4 border border-gray-100/50`}>
    <div className="flex items-center justify-between flex-row-reverse">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center`} style={{ backgroundColor: color + '20' }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div className="text-right">
        <p className="text-xl font-black text-gray-800">{value}</p>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        {sub && <p className="text-[10px] text-gray-400">{sub}</p>}
      </div>
    </div>
  </div>
);

// ─── مكون خيار الفلترة (راديو) ──────────────────────────────────
const FilterOption = ({ active, label, onClick }: any) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
      active
        ? 'border-primary bg-primary/5 text-primary'
        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
    }`}
  >
    {active && <CheckCircle size={14} className="text-primary" />}
    {label}
  </button>
);

export default function Merchants() {
  const qc = useQueryClient();
  const navigate = useNavigate(); // ✅ تعريف useNavigate

  // ── الحالات المحلية ────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [tempFilters, setTempFilters] = useState<FilterState>(defaultFilters);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [showPass, setShowPass] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // ── جلب البيانات ──────────────────────────────────────────────
  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data } = await api.get('/api/admin/users');
      return data;
    },
    refetchInterval: 30000,
    staleTime: 10000,
  });

  // ─── Mutations ──────────────────────────────────────────────────
  const updateUser = useMutation({
    mutationFn: async ({ id, data }: any) => {
      const res = await api.patch(`/api/admin/users/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      setEditUser(null);
      toast.success('تم تحديث بيانات التاجر ✅');
    },
    onError: () => toast.error('فشل تحديث البيانات'),
  });

  const deleteMerchant = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/admin/users/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('تم حذف حساب التاجر');
    },
    onError: () => toast.error('فشل حذف الحساب'),
  });

  // ─── دوال الفلترة والترتيب (مطابقة لنسخة التطبيق) ─────────────
  const getFilteredMerchants = useMemo(() => {
    let filtered = (users as any[])
      .filter((u: any) => u.role === 'merchant');

    // 🔍 البحث
    if (search.trim()) {
      const query = search.trim().toLowerCase();
      filtered = filtered.filter((u: any) =>
        u.storeName?.toLowerCase().includes(query) ||
        u.phone?.includes(query) ||
        String(u.merchantId || u.id).includes(query)
      );
    }

    // 📊 فلترة حسب الحالة (النشاط)
    if (filters.status === 'active') {
      filtered = filtered.filter((u: any) => (u.balance || 0) > 0 || (u.pendingBalance || 0) > 0);
    } else if (filters.status === 'inactive') {
      filtered = filtered.filter((u: any) => (u.balance || 0) === 0 && (u.pendingBalance || 0) === 0);
    }

    // 💰 فلترة حسب الرصيد
    if (filters.balance === 'has_balance') {
      filtered = filtered.filter((u: any) => (u.balance || 0) > 0);
    } else if (filters.balance === 'no_balance') {
      filtered = filtered.filter((u: any) => (u.balance || 0) === 0);
    }

    // 📦 فلترة حسب الطلبات (تقديرية باستخدام الرصيد كمعيار مؤقت)
    if (filters.orders === 'high_orders') {
      filtered = filtered.filter((u: any) => (u.balance || 0) > 50000);
    } else if (filters.orders === 'low_orders') {
      filtered = filtered.filter((u: any) => (u.balance || 0) < 10000);
    }

    // 🔄 الترتيب
    switch (filters.sortBy) {
      case 'name_asc':
        filtered.sort((a: any, b: any) => a.storeName?.localeCompare(b.storeName) || 0);
        break;
      case 'name_desc':
        filtered.sort((a: any, b: any) => b.storeName?.localeCompare(a.storeName) || 0);
        break;
      case 'balance_high':
        filtered.sort((a: any, b: any) => (b.balance || 0) - (a.balance || 0));
        break;
      case 'balance_low':
        filtered.sort((a: any, b: any) => (a.balance || 0) - (b.balance || 0));
        break;
      case 'orders_high':
        filtered.sort((a: any, b: any) => (b.pendingBalance || 0) - (a.pendingBalance || 0));
        break;
      default: // 'newest'
        filtered.sort((a: any, b: any) => b.id - a.id);
    }

    return filtered;
  }, [users, search, filters]);

  const merchants = getFilteredMerchants;

  // ─── إحصائيات سريعة ──────────────────────────────────────────
  const totalMerchants = (users as any[]).filter((u: any) => u.role === 'merchant').length;
  const activeMerchants = (users as any[]).filter(
    (u: any) => u.role === 'merchant' && ((u.balance || 0) > 0 || (u.pendingBalance || 0) > 0)
  ).length;
  const totalBalance = (users as any[])
    .filter((u: any) => u.role === 'merchant')
    .reduce((s, u) => s + (u.balance || 0), 0);
  const totalPending = (users as any[])
    .filter((u: any) => u.role === 'merchant')
    .reduce((s, u) => s + (u.pendingBalance || 0), 0);

  // ─── دوال المودال ─────────────────────────────────────────────
  const openFilterModal = () => {
    setTempFilters({ ...filters });
    setShowFilterModal(true);
  };

  const applyFilters = () => {
    setFilters({ ...tempFilters });
    setShowFilterModal(false);
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
    setTempFilters(defaultFilters);
    setSearch('');
    setShowFilterModal(false);
  };

  const openEdit = (u: any) => {
    setEditForm({
      storeName: u.storeName || '',
      phone: u.phone || '',
      address: u.address || '',
      balance: String(u.balance ?? 0),
      password: '',
    });
    setShowPass(false);
    setEditUser(u);
  };

  const handleSave = () => {
    if (!editForm.storeName.trim()) {
      toast.error('اسم المتجر مطلوب');
      return;
    }
    if (!editForm.phone.trim()) {
      toast.error('رقم الهاتف مطلوب');
      return;
    }
    const data: any = {
      storeName: editForm.storeName.trim(),
      phone: editForm.phone.trim(),
      address: editForm.address.trim(),
      balance: Number(editForm.balance) || 0,
    };
    if (editForm.password.trim()) data.password = editForm.password.trim();
    updateUser.mutate({ id: editUser.id, data });
  };

  const confirmDelete = (u: any) => {
    if (window.confirm(`هل أنت متأكد من حذف حساب "${u.storeName}" نهائياً؟`)) {
      deleteMerchant.mutate(u.id);
    }
  };

  // ─── نسخ كل معلومات التاجر ───────────────────────────────────
  const copyAllMerchantInfo = (u: any) => {
    const text = `━━━ معلومات التاجر ━━━
الاسم: ${u.storeName || '—'}
رقم التاجر: ${u.merchantId || u.id}
الهاتف: ${u.phone || '—'}
العنوان: ${u.address || '—'}
الرصيد المتاح: ${(u.balance || 0).toLocaleString()} د.ع
الرصيد المعلق: ${(u.pendingBalance || 0).toLocaleString()} د.ع
تاريخ التسجيل: ${formatDate(u.createdAt)}
الحالة: ${(u.balance || 0) > 0 ? 'نشط' : 'غير نشط'}`;
    copyText(text, 'معلومات التاجر');
  };

  // ─── خيارات الفلترة ──────────────────────────────────────────
  const statusOptions = [
    { id: 'all', label: 'الكل' },
    { id: 'active', label: 'نشط' },
    { id: 'inactive', label: 'غير نشط' },
  ];

  const balanceOptions = [
    { id: 'all', label: 'الكل' },
    { id: 'has_balance', label: 'لديه رصيد' },
    { id: 'no_balance', label: 'رصيد صفر' },
  ];

  const ordersOptions = [
    { id: 'all', label: 'الكل' },
    { id: 'high_orders', label: 'طلبات عالية' },
    { id: 'low_orders', label: 'طلبات قليلة' },
  ];

  const sortOptions = [
    { id: 'newest', label: 'الأحدث' },
    { id: 'name_asc', label: 'الاسم (أ-ي)' },
    { id: 'name_desc', label: 'الاسم (ي-أ)' },
    { id: 'balance_high', label: 'أعلى رصيد' },
    { id: 'balance_low', label: 'أقل رصيد' },
    { id: 'orders_high', label: 'أكثر طلبات' },
  ];

  return (
    <div className="p-8" dir="rtl">
      {/* ─── الهيدر ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="text-right">
          <h1 className="text-2xl font-black text-gray-800">التجار</h1>
          <p className="text-gray-500 text-sm mt-1">
            {totalMerchants} تاجر مسجل
            {merchants.length !== totalMerchants && (
              <span className="mr-2 text-primary">(معروض {merchants.length})</span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={resetFilters}
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-50 transition"
          >
            <RefreshCw size={16} />
            إعادة تعيين
          </button>
        </div>
      </div>

      {/* ─── البطاقات السريعة ────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={Users}
          label="إجمالي التجار"
          value={totalMerchants}
          color={COLORS.primary}
          bg="bg-teal-50"
        />
        <StatCard
          icon={CheckCircle}
          label="نشط"
          value={activeMerchants}
          color={COLORS.success}
          bg="bg-green-50"
        />
        <StatCard
          icon={XCircle}
          label="غير نشط"
          value={totalMerchants - activeMerchants}
          color={COLORS.danger}
          bg="bg-red-50"
        />
        <StatCard
          icon={Wallet}
          label="إجمالي الرصيد"
          value={`${totalBalance.toLocaleString()} د.ع`}
          color={COLORS.purple}
          bg="bg-purple-50"
          sub={`معلق: ${totalPending.toLocaleString()} د.ع`}
        />
      </div>

      {/* ─── البحث والفلترة ──────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-4 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم، الهاتف، أو رقم التاجر..."
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
        <button
          onClick={openFilterModal}
          className="flex items-center gap-2 bg-white border-2 border-primary text-primary px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary/5 transition"
        >
          <Filter size={16} />
          فلترة متقدمة
        </button>
      </div>

      {/* ─── قائمة التجار (بطاقات محسنة) ────────────────────── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : merchants.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Users size={48} className="mx-auto mb-3 opacity-30" />
          <p className="font-semibold text-lg">لا يوجد تجار</p>
          <p className="text-sm mt-1">
            {search || filters.status !== 'all' || filters.balance !== 'all' || filters.orders !== 'all'
              ? 'لا توجد نتائج مطابقة للبحث أو الفلتر'
              : 'سيتم إضافة التجار قريباً'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {merchants.map((u: any) => {
            const isExpanded = expandedId === u.id;
            const isActive = (u.balance || 0) > 0 || (u.pendingBalance || 0) > 0;

            return (
              <div
                key={u.id}
                onClick={() => navigate(`/merchants/${u.id}`)} // ✅ التنقل لصفحة التفاصيل
                className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all hover:shadow-md cursor-pointer ${
                  isExpanded ? 'ring-2 ring-primary ring-offset-2' : ''
                }`}
              >
                {/* ─── رأس البطاقة ────────────────────────────── */}
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary font-black text-lg">
                          {u.storeName?.charAt(0) || '؟'}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-gray-800 text-base">{u.storeName}</p>
                          <button
                            onClick={(e) => { e.stopPropagation(); copyText(u.storeName, 'اسم المتجر'); }}
                            className="p-0.5 text-gray-400 hover:text-primary transition"
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded-lg text-gray-600">
                            #{u.merchantId || u.id}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); copyText(String(u.merchantId || u.id), 'رقم التاجر'); }}
                            className="p-0.5 text-gray-400 hover:text-primary transition"
                          >
                            <Copy size={10} />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-bold ${
                          isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {isActive ? 'نشط' : 'غير نشط'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ─── معلومات سريعة ───────────────────────────── */}
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-gray-500 flex items-center gap-1">
                      <Phone size={14} /> هاتف
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono font-semibold text-gray-700">{u.phone || '—'}</span>
                      {u.phone && (
                        <button
                          onClick={(e) => { e.stopPropagation(); copyText(u.phone, 'رقم الهاتف'); }}
                          className="p-1 text-gray-400 hover:text-primary transition"
                        >
                          <Copy size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  {u.address && (
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-gray-500 flex items-center gap-1">
                        <MapPin size={14} /> العنوان
                      </span>
                      <span className="text-gray-700 truncate max-w-[150px]">{u.address}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-gray-500 flex items-center gap-1">
                      <Clock size={14} /> التسجيل
                    </span>
                    <span className="text-gray-600">{formatDate(u.createdAt)}</span>
                  </div>
                </div>

                {/* ─── الرصيد ───────────────────────────────────── */}
                <div className="px-4 py-3 bg-gray-50/50 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="text-center flex-1">
                      <p className="text-[10px] text-gray-400">الرصيد المتاح</p>
                      <p className="font-bold text-primary text-sm">
                        {(u.balance || 0).toLocaleString()} د.ع
                      </p>
                    </div>
                    <div className="w-px h-8 bg-gray-200" />
                    <div className="text-center flex-1">
                      <p className="text-[10px] text-gray-400">الرصيد المعلق</p>
                      <p className="font-bold text-amber-600 text-sm">
                        {(u.pendingBalance || 0).toLocaleString()} د.ع
                      </p>
                    </div>
                  </div>
                </div>

                {/* ─── أزرار الإجراءات ──────────────────────────── */}
                <div className="p-3 flex items-center gap-2 border-t border-gray-100 bg-white">
                  <button
                    onClick={(e) => { e.stopPropagation(); copyAllMerchantInfo(u); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-bold hover:bg-gray-200 transition flex-1 justify-center"
                  >
                    <Copy size={13} /> نسخ الكل
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); openEdit(u); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition flex-1 justify-center"
                  >
                    <Pencil size={13} /> تعديل
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); confirmDelete(u); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-500 text-xs font-bold hover:bg-red-100 transition flex-1 justify-center"
                  >
                    <Trash2 size={13} /> حذف
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── مودال الفلترة المتقدمة ──────────────────────────── */}
      {showFilterModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={(e) => e.target === e.currentTarget && setShowFilterModal(false)}
        >
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white z-10 border-b border-gray-100">
              <div className="flex items-center justify-between p-6">
                <h2 className="text-xl font-black text-gray-800">فلترة التجار</h2>
                <button
                  onClick={() => setShowFilterModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-xl transition"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* حسب النشاط */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-3 text-right">حسب النشاط</h3>
                <div className="flex flex-wrap gap-2">
                  {statusOptions.map((opt) => (
                    <FilterOption
                      key={opt.id}
                      active={tempFilters.status === opt.id}
                      label={opt.label}
                      onClick={() => setTempFilters((prev) => ({ ...prev, status: opt.id as any }))}
                    />
                  ))}
                </div>
              </div>

              {/* حسب الرصيد */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-3 text-right">حسب الرصيد</h3>
                <div className="flex flex-wrap gap-2">
                  {balanceOptions.map((opt) => (
                    <FilterOption
                      key={opt.id}
                      active={tempFilters.balance === opt.id}
                      label={opt.label}
                      onClick={() => setTempFilters((prev) => ({ ...prev, balance: opt.id as any }))}
                    />
                  ))}
                </div>
              </div>

              {/* حسب الطلبات */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-3 text-right">حسب الطلبات</h3>
                <div className="flex flex-wrap gap-2">
                  {ordersOptions.map((opt) => (
                    <FilterOption
                      key={opt.id}
                      active={tempFilters.orders === opt.id}
                      label={opt.label}
                      onClick={() => setTempFilters((prev) => ({ ...prev, orders: opt.id as any }))}
                    />
                  ))}
                </div>
              </div>

              {/* الترتيب */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-3 text-right">ترتيب حسب</h3>
                <div className="flex flex-wrap gap-2">
                  {sortOptions.map((opt) => (
                    <FilterOption
                      key={opt.id}
                      active={tempFilters.sortBy === opt.id}
                      label={opt.label}
                      onClick={() => setTempFilters((prev) => ({ ...prev, sortBy: opt.id as any }))}
                    />
                  ))}
                </div>
              </div>

              {/* الأزرار */}
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={resetFilters}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition"
                >
                  <RefreshCw size={16} /> إعادة تعيين
                </button>
                <button
                  onClick={applyFilters}
                  className="flex-1 bg-primary text-white py-2.5 rounded-xl font-bold hover:bg-primary-dark transition"
                >
                  تطبيق الفلتر
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── مودال تعديل التاجر ────────────────────────────────── */}
      {editUser && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={(e) => e.target === e.currentTarget && setEditUser(null)}
        >
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white z-10 border-b border-gray-100">
              <div className="flex items-center justify-between p-6">
                <h3 className="font-black text-gray-800 text-lg">تعديل بيانات التاجر</h3>
                <button
                  onClick={() => setEditUser(null)}
                  className="p-2 hover:bg-gray-100 rounded-xl transition"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* معلومات القراءة فقط */}
              <div className="bg-gray-50 rounded-2xl p-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">رقم التاجر</span>
                  <span className="font-mono font-bold text-gray-700">#{editUser.merchantId || editUser.id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">تاريخ التسجيل</span>
                  <span className="text-gray-700">{formatDate(editUser.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">الرصيد المتاح</span>
                  <span className="font-bold text-primary">{(editUser.balance || 0).toLocaleString()} د.ع</span>
                </div>
              </div>

              {/* حقول التعديل */}
              {[
                { label: 'اسم المتجر *', key: 'storeName', placeholder: 'اسم المتجر' },
                { label: 'رقم الهاتف *', key: 'phone', placeholder: '07XXXXXXXXX' },
                { label: 'العنوان', key: 'address', placeholder: 'العنوان' },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="block text-sm font-semibold text-gray-600 mb-1.5 text-right">{label}</label>
                  <input
                    value={editForm[key]}
                    onChange={(e) => setEditForm((f: any) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-primary text-sm text-right"
                  />
                </div>
              ))}

              {/* الرصيد */}
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1.5 text-right">
                  الرصيد المتاح (د.ع)
                </label>
                <input
                  type="number"
                  value={editForm.balance}
                  onChange={(e) => setEditForm((f: any) => ({ ...f, balance: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-primary text-sm text-right"
                />
              </div>

              {/* كلمة مرور جديدة */}
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1.5 text-right">
                  كلمة مرور جديدة (اختياري)
                </label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={editForm.password}
                    onChange={(e) => setEditForm((f: any) => ({ ...f, password: e.target.value }))}
                    placeholder="اتركه فارغاً إذا لا تريد تغييره"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-primary text-sm text-right pl-10"
                  />
                  <button
                    onClick={() => setShowPass(!showPass)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={updateUser.isPending}
                className="w-full bg-primary text-white py-3 rounded-xl font-bold text-sm hover:bg-primary-dark disabled:opacity-60 transition"
              >
                {updateUser.isPending ? 'جاري الحفظ...' : 'حفظ التعديلات'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}