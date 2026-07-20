// src/pages/Orders.tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Package, MapPin, Calendar, TrendingUp, Copy, Pencil, Trash2,
  ChevronDown, X, Check, Eye, EyeOff, Truck, Clock, User, Phone,
  Map, Store, CreditCard, RefreshCw, AlertCircle, CheckCircle, XCircle,
  Loader2, MoreVertical, Plus, Minus, ShoppingBag, UserPlus, Link
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api';

// ─── الحالات ──────────────────────────────────────────────────────
const STATUS: Record<string, { label: string; color: string; bg: string; border: string; icon: any }> = {
  pending:    { label: 'قيد الانتظار', color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', icon: Clock },
  processing: { label: 'قيد المعالجة', color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', icon: RefreshCw },
  preparing:  { label: 'قيد التجهيز',  color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe', icon: Package },
  shipping:   { label: 'قيد التوصيل', color: '#06b6d4', bg: '#ecfeff', border: '#a5f3fc', icon: Truck },
  delivered:  { label: 'تم التوصيل',  color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0', icon: CheckCircle },
  cancelled:  { label: 'ملغي',         color: '#ef4444', bg: '#fef2f2', border: '#fecaca', icon: XCircle },
  returned:   { label: 'راجع',          color: '#f97316', bg: '#fff7ed', border: '#fed7aa', icon: RefreshCw },
  postponed:  { label: 'مؤجل',         color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb', icon: Clock },
};

const FILTERS = [
  { key: 'all', label: 'الكل' },
  { key: 'pending', label: 'انتظار' },
  { key: 'processing', label: 'معالجة' },
  { key: 'preparing', label: 'تجهيز' },
  { key: 'shipping', label: 'توصيل' },
  { key: 'delivered', label: 'مُسلَّم' },
  { key: 'cancelled', label: 'ملغي' },
  { key: 'returned', label: 'راجع' },
  { key: 'postponed', label: 'مؤجل' },
];

const PROVINCES = ['بغداد', 'البصرة', 'نينوى', 'أربيل', 'كركوك', 'النجف', 'كربلاء', 'الأنبار', 'ديالى', 'واسط', 'ميسان', 'ذي قار', 'المثنى', 'القادسية', 'بابل', 'صلاح الدين', 'السليمانية', 'دهوك', 'حلبجة'];

const formatDate = (d: string) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('ar-IQ', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const copyText = (text: string, label = '') => {
  navigator.clipboard.writeText(text);
  toast.success(label ? `تم نسخ ${label}` : 'تم النسخ');
};

// ─── نموذج فارغ للتعديل ──────────────────────────────────────────
const EMPTY_EDIT = {
  customerName: '',
  customerPhone: '',
  backupPhone: '',
  province: '',
  address: '',
  notes: '',
  items: [] as { productId: number; productName: string; quantity: string; price: string }[],
};

// ─── دالة مساعدة للحصول على أول صورة ────────────────────────────
const getFirstImage = (product: any) => {
  if (!product) return null;
  const imgs = product.images ? product.images.split(',').filter(Boolean) : [];
  return imgs.length > 0 ? imgs[0] : (product.imageUrl || null);
};

export default function Orders() {
  const qc = useQueryClient();

  // ── الحالات المحلية ─────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [dropdownId, setDropdownId] = useState<number | null>(null);
  const [editOrder, setEditOrder] = useState<any>(null);
  const [editForm, setEditForm] = useState({ ...EMPTY_EDIT });
  const [newStatus, setNewStatus] = useState('');

  // ── Debounce للبحث ─────────────────────────────────────────────
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // ── استعلام الطلبات مع pagination ─────────────────────────────
  const {
    data: ordersData,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['admin-orders', filter, debouncedSearch],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams({
        page: String(pageParam),
        limit: '20',
        ...(filter !== 'all' && { status: filter }),
        ...(debouncedSearch && { search: debouncedSearch }),
      });
      const { data } = await api.get(`/api/orders?${params}`);
      return data;
    },
    getNextPageParam: (last) => last.hasMore ? last.page + 1 : undefined,
    initialPageParam: 1,
    refetchInterval: 30000,
    staleTime: 10000,
  });

  const orders = ordersData?.pages.flatMap(p => p.data) ?? [];
  const total = ordersData?.pages[0]?.total ?? 0;

  // ── جلب التجار ──────────────────────────────────────────────────
  const { data: users = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data } = await api.get('/api/admin/users');
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const getMerchant = (merchantId: number) =>
    users.find((u: any) => u.id === merchantId);

  // ── إحصائيات الحالات ───────────────────────────────────────────
  const counts: Record<string, number> = { all: orders.length };
  Object.keys(STATUS).forEach(k => {
    counts[k] = orders.filter((o: any) => o.status === k).length;
  });

  // ── Mutations ──────────────────────────────────────────────────
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: any) => {
      const { data } = await api.patch(`/api/orders/${id}/status`, { status });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      setDropdownId(null);
      toast.success('تم تحديث الحالة ✅');
    },
    onError: () => toast.error('فشل تحديث الحالة'),
  });

  const updateOrder = useMutation({
    mutationFn: async ({ id, data }: any) => {
      const res = await api.put(`/api/orders/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      setEditOrder(null);
      toast.success('تم تعديل الطلب ✅');
    },
    onError: () => toast.error('فشل تعديل الطلب'),
  });

  const deleteOrder = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/orders/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      toast.success('تم حذف الطلب');
    },
    onError: () => toast.error('فشل حذف الطلب'),
  });

  // ── دوال المساعدة ──────────────────────────────────────────────
  const openEdit = (o: any) => {
    setEditForm({
      customerName: o.customerName || '',
      customerPhone: o.customerPhone || '',
      backupPhone: o.backupPhone || '',
      province: o.province || '',
      address: o.address || '',
      notes: o.notes || '',
      items: (o.items || []).map((i: any) => ({
        productId: i.productId,
        productName: i.product?.name || `منتج #${i.productId}`,
        quantity: String(i.quantity),
        price: String(i.price || i.sellingPrice || 0),
      })),
    });
    setEditOrder(o);
  };

  const confirmDelete = (o: any) => {
    if (window.confirm(`هل أنت متأكد من حذف الطلب #${o.id}؟\nلا يمكن التراجع عن هذا الإجراء.`)) {
      deleteOrder.mutate(o.id);
    }
  };

  const handleSaveEdit = () => {
    if (!editForm.customerName.trim()) {
      toast.error('يرجى إدخال اسم الزبون');
      return;
    }
    if (!editForm.customerPhone.trim()) {
      toast.error('يرجى إدخال رقم الهاتف');
      return;
    }
    const items = editForm.items.map((i: any) => ({
      productId: i.productId,
      quantity: Number(i.quantity),
      price: Number(i.price),
    }));
    const updateData: any = { ...editForm, items };
    if (!updateData.backupPhone) delete updateData.backupPhone;
    updateOrder.mutate({ id: editOrder.id, data: updateData });
  };

  // ── تعديل عنصر في قائمة المنتجات (السعر/الكمية) ──────────────
  const updateItem = (idx: number, field: string, value: string) => {
    const newItems = [...editForm.items];
    newItems[idx] = { ...newItems[idx], [field]: value };
    setEditForm(prev => ({ ...prev, items: newItems }));
  };

  const removeItem = (idx: number) => {
    if (editForm.items.length <= 1) {
      toast.error('يجب أن يكون هناك منتج واحد على الأقل');
      return;
    }
    const newItems = editForm.items.filter((_, i) => i !== idx);
    setEditForm(prev => ({ ...prev, items: newItems }));
  };

  const copyAllInfo = (o: any) => {
    const merchant = getMerchant(o.merchantId);
    const items = (o.items || []).map((i: any) =>
      `- ${i.product?.name || `منتج #${i.productId}`} × ${i.quantity} = ${(i.price * i.quantity).toLocaleString()} د.ع`
    ).join('\n');
    const text = `طلب #${o.id}
━━━ معلومات الزبون ━━━
الاسم: ${o.customerName || '—'}
الهاتف: ${o.customerPhone || '—'}
احتياطي: ${o.backupPhone || '—'}
المحافظة: ${o.province || '—'}
العنوان: ${o.address || '—'}
━━━ معلومات التاجر ━━━
المتجر: ${merchant?.storeName || '—'}
هاتف التاجر: ${merchant?.phone || '—'}
━━━ المنتجات ━━━
${items || '—'}
━━━ الأرقام ━━━
المجموع: ${o.totalAmount?.toLocaleString()} د.ع
التوصيل: ${o.shippingCost?.toLocaleString() || '0'} د.ع
الربح: ${o.totalProfit?.toLocaleString() || '0'} د.ع
الحالة: ${STATUS[o.status]?.label || o.status}
${o.notes ? `\nملاحظات: ${o.notes}` : ''}`;
    copyText(text, 'معلومات الطلب');
  };

  // ── إعادة تعيين الفلتر والبحث ──────────────────────────────────
  const resetFilters = () => {
    setFilter('all');
    setSearchTerm('');
    setDebouncedSearch('');
  };

  // ── التحميل عند التمرير (Infinite Scroll) ─────────────────────
  const loadMoreRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!loadMoreRef.current || !hasNextPage || isFetchingNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="p-8" dir="rtl">
      {/* ─── الهيدر ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="text-right">
          <h1 className="text-2xl font-black text-gray-800">الطلبات</h1>
          <p className="text-gray-500 text-sm mt-1">
            {total} طلب
            {orders.length !== total && (
              <span className="mr-2 text-primary">(معروض {orders.length})</span>
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

      {/* ─── البحث والفلاتر ────────────────────────────────────── */}
      <div className="mb-5 space-y-3">
        <div className="relative">
          <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ابحث برقم الطلب، اسم الزبون، أو رقم الهاتف..."
            className="w-full pr-10 pl-4 py-3 rounded-xl border border-gray-200 bg-white text-right outline-none focus:border-primary text-sm"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                filter === f.key
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-primary'
              }`}
            >
              {f.label}
              {(counts[f.key] || 0) > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  filter === f.key ? 'bg-white/20' : 'bg-gray-100 text-gray-500'
                }`}>
                  {counts[f.key]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ─── قائمة الطلبات ────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o: any) => {
            const st = STATUS[o.status] || STATUS.pending;
            const merchant = getMerchant(o.merchantId);
            const items = o.items || [];
            const isOpen = expandedId === o.id;
            const isDropdownOpen = dropdownId === o.id;

            return (
              <div
                key={o.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all hover:shadow-md"
              >

                {/* ─── رأس الكارد ────────────────────────────────── */}
                <div className="px-5 py-4 flex flex-wrap items-center gap-3 cursor-pointer hover:bg-gray-50/50 transition"
                  onClick={() => setExpandedId(isOpen ? null : o.id)}>

                  {/* الحالة مع قائمة منسدلة */}
                  <div className="relative" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => setDropdownId(isDropdownOpen ? null : o.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                        isDropdownOpen ? 'ring-2 ring-primary ring-offset-1' : ''
                      }`}
                      style={{ backgroundColor: st.bg, color: st.color, borderColor: st.border }}
                    >
                      <st.icon size={13} />
                      {st.label}
                      <ChevronDown size={13} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown الحالات */}
                    {isDropdownOpen && (
                      <div className="absolute top-full mt-1 right-0 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-20 min-w-[180px]">
                        {Object.entries(STATUS).map(([key, val]) => (
                          <button
                            key={key}
                            onClick={() => {
                              if (o.status === key) {
                                setDropdownId(null);
                                return;
                              }
                              updateStatus.mutate({ id: o.id, status: key });
                            }}
                            className={`w-full text-right px-4 py-2.5 text-sm font-semibold flex items-center gap-3 transition ${
                              o.status === key
                                ? 'bg-primary/5 text-primary'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <val.icon size={14} style={{ color: val.color }} />
                            {val.label}
                            {o.status === key && <Check size={14} className="mr-auto text-primary" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 text-right min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-black text-gray-800">طلب #{o.id}</span>
                      {o.customerName && (
                        <span className="text-sm font-semibold text-gray-700">{o.customerName}</span>
                      )}
                      {o.customerPhone && (
                        <span className="text-xs text-gray-400 font-mono">{o.customerPhone}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400 mt-1 flex-wrap">
                      {o.province && (
                        <span className="flex items-center gap-1"><MapPin size={11} />{o.province}</span>
                      )}
                      <span className="flex items-center gap-1"><Calendar size={11} />{formatDate(o.createdAt)}</span>
                      {o.totalProfit != null && (
                        <span className="flex items-center gap-1 text-green-600 font-semibold">
                          <TrendingUp size={11} />ربح: {o.totalProfit?.toLocaleString()} د.ع
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="font-black text-primary text-lg leading-none">{o.totalAmount?.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">د.ع</p>
                  </div>

                  <ChevronDown size={16} className={`text-gray-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
                </div>

                {/* ─── التفاصيل الموسعة ────────────────────────── */}
                {isOpen && (
                  <div className="border-t border-gray-100 bg-gray-50/50">

                    {/* شريط الإجراءات */}
                    <div className="flex flex-wrap gap-2 px-5 py-3 border-b border-gray-100 bg-white">
                      <button
                        onClick={() => copyAllInfo(o)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-bold hover:bg-gray-200 transition"
                      >
                        <Copy size={13} /> نسخ كل المعلومات
                      </button>
                      <button
                        onClick={() => openEdit(o)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-xs font-bold hover:bg-blue-100 transition"
                      >
                        <Pencil size={13} /> تعديل البيانات
                      </button>
                      <button
                        onClick={() => confirmDelete(o)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-500 text-xs font-bold hover:bg-red-100 transition"
                      >
                        <Trash2 size={13} /> حذف الطلب
                      </button>
                    </div>

                    <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-4">

                      {/* معلومات الزبون */}
                      <div className="bg-white rounded-2xl p-4 border border-gray-100">
                        <p className="text-xs font-black text-gray-500 mb-3 text-right flex items-center gap-2">
                          <User size={14} /> معلومات الزبون
                        </p>
                        {[
                          { label: 'الاسم', value: o.customerName, key: 'اسم الزبون' },
                          { label: 'الهاتف', value: o.customerPhone, key: 'رقم الهاتف' },
                          { label: 'الهاتف الاحتياطي', value: o.backupPhone, key: 'رقم الاحتياطي' },
                          { label: 'المحافظة', value: o.province, key: 'المحافظة' },
                          { label: 'العنوان', value: o.address, key: 'العنوان' },
                        ].map(({ label, value, key }) => value ? (
                          <div key={label} className="flex items-center justify-between gap-2 mb-2 last:mb-0">
                            <div className="text-right flex-1">
                              <p className="text-xs text-gray-400">{label}</p>
                              <p className="text-sm font-semibold text-gray-800 break-all">{value}</p>
                            </div>
                            <button
                              onClick={() => copyText(value, key)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-primary transition flex-shrink-0"
                            >
                              <Copy size={13} />
                            </button>
                          </div>
                        ) : null)}
                        {o.notes && (
                          <div className="mt-2 pt-2 border-t border-gray-100 text-right">
                            <p className="text-xs text-gray-400">ملاحظات</p>
                            <p className="text-sm text-gray-700 mt-0.5 break-words">{o.notes}</p>
                          </div>
                        )}
                      </div>

                      {/* معلومات التاجر والأرقام */}
                      <div className="space-y-3">
                        {merchant && (
                          <div className="bg-white rounded-2xl p-4 border border-gray-100">
                            <p className="text-xs font-black text-gray-500 mb-3 text-right flex items-center gap-2">
                              <Store size={14} /> التاجر
                            </p>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="text-right flex-1">
                                <p className="text-xs text-gray-400">اسم المتجر</p>
                                <p className="text-sm font-semibold text-gray-800">{merchant.storeName}</p>
                              </div>
                              <button
                                onClick={() => copyText(merchant.storeName, 'اسم المتجر')}
                                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-primary transition flex-shrink-0"
                              >
                                <Copy size={13} />
                              </button>
                            </div>
                            {merchant.phone && (
                              <div className="flex items-center justify-between gap-2">
                                <div className="text-right flex-1">
                                  <p className="text-xs text-gray-400">هاتف التاجر</p>
                                  <p className="text-sm font-semibold text-gray-800 font-mono">{merchant.phone}</p>
                                </div>
                                <button
                                  onClick={() => copyText(merchant.phone, 'هاتف التاجر')}
                                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-primary transition flex-shrink-0"
                                >
                                  <Copy size={13} />
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* الأرقام */}
                        <div className="bg-white rounded-2xl p-4 border border-gray-100">
                          <p className="text-xs font-black text-gray-500 mb-3 text-right flex items-center gap-2">
                            <CreditCard size={14} /> الأرقام
                          </p>
                          {[
                            { label: 'المجموع الكلي', value: o.totalAmount, color: 'text-primary' },
                            { label: 'التوصيل', value: o.shippingCost, color: 'text-cyan-600' },
                            { label: 'الربح', value: o.totalProfit, color: 'text-green-600' },
                            ...(o.promoDiscount ? [{ label: 'خصم الكود', value: `-${o.promoDiscount}`, color: 'text-red-500' }] : []),
                          ].map(({ label, value, color }) => (
                            <div key={label} className="flex items-center justify-between gap-2 mb-1.5 last:mb-0">
                              <span className="text-xs text-gray-500">{label}</span>
                              <span className={`text-sm font-bold ${color}`}>
                                {value?.toLocaleString() || '0'} د.ع
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* المنتجات */}
                    {items.length > 0 && (
                      <div className="px-5 pb-5">
                        <p className="text-xs font-black text-gray-500 mb-3 text-right flex items-center gap-2">
                          <Package size={14} /> المنتجات ({items.length})
                        </p>
                        <div className="space-y-2.5">
                          {items.map((item: any, idx: number) => {
                            const p = item.product || {};
                            const imgUri = getFirstImage(p);
                            const itemTotal = (item.price || item.sellingPrice || 0) * item.quantity;
                            return (
                              <div key={idx} className="flex items-center gap-3 bg-white rounded-xl p-3 border border-gray-100 hover:border-primary/20 transition">
                                {imgUri ? (
                                  <img src={imgUri} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-gray-100" />
                                ) : (
                                  <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                                    <Package size={20} className="text-gray-300" />
                                  </div>
                                )}
                                <div className="flex-1 text-right min-w-0">
                                  <p className="font-semibold text-gray-800 text-sm truncate">{p.name || `منتج #${item.productId}`}</p>
                                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                    <span className="text-xs text-gray-500">الكمية: {item.quantity}</span>
                                    <span className="text-xs text-gray-500">×</span>
                                    <span className="text-xs font-semibold text-gray-700">{item.price?.toLocaleString()} د.ع</span>
                                    {item.profit != null && (
                                      <span className="text-xs text-green-600 font-semibold mr-2">ربح: {item.profit?.toLocaleString()} د.ع</span>
                                    )}
                                  </div>
                                </div>
                                <p className="font-black text-primary flex-shrink-0 text-sm">
                                  {itemTotal.toLocaleString()} د.ع
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* محفز تحميل المزيد (Infinite Scroll) */}
          {hasNextPage && (
            <div ref={loadMoreRef} className="flex justify-center py-4">
              {isFetchingNextPage ? (
                <div className="flex items-center gap-2 text-gray-500">
                  <Loader2 size={18} className="animate-spin" />
                  <span className="text-sm">جاري تحميل المزيد...</span>
                </div>
              ) : (
                <span className="text-sm text-gray-400">مرر للأسفل لتحميل المزيد</span>
              )}
            </div>
          )}

          {orders.length === 0 && !isLoading && (
            <div className="text-center py-16 text-gray-400">
              <Package size={48} className="mx-auto mb-3 opacity-30" />
              <p className="font-semibold text-lg">لا توجد طلبات</p>
              <p className="text-sm mt-1">جرب تغيير الفلتر أو البحث</p>
            </div>
          )}
        </div>
      )}

      {/* ─── مودال تعديل الطلب (مطور) ────────────────────────────── */}
      {editOrder && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={(e) => e.target === e.currentTarget && setEditOrder(null)}
        >
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white z-10 border-b border-gray-100">
              <div className="flex items-center justify-between p-6">
                <h3 className="font-black text-gray-800 text-lg">تعديل طلب #{editOrder.id}</h3>
                <button
                  onClick={() => setEditOrder(null)}
                  className="p-2 hover:bg-gray-100 rounded-xl transition"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* معلومات الزبون */}
              <div className="space-y-3">
                <p className="text-sm font-bold text-primary border-b border-primary/20 pb-2">معلومات الزبون</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { label: 'الاسم *', key: 'customerName', placeholder: 'اسم الزبون' },
                    { label: 'رقم الهاتف *', key: 'customerPhone', placeholder: '07XXXXXXXXX' },
                    { label: 'رقم احتياطي', key: 'backupPhone', placeholder: '07XXXXXXXXX (اختياري)' },
                  ].map(({ label, key, placeholder }) => (
                    <div key={key}>
                      <label className="block text-sm font-semibold text-gray-600 mb-1 text-right">{label}</label>
                      <input
                        value={(editForm as any)[key]}
                        onChange={(e) => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                        placeholder={placeholder}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-primary text-sm text-right"
                      />
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1 text-right">المحافظة</label>
                    <select
                      value={editForm.province}
                      onChange={(e) => setEditForm(f => ({ ...f, province: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-primary text-sm text-right bg-white"
                    >
                      <option value="">اختر المحافظة</option>
                      {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1 text-right">العنوان</label>
                    <input
                      value={editForm.address}
                      onChange={(e) => setEditForm(f => ({ ...f, address: e.target.value }))}
                      placeholder="العنوان التفصيلي"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-primary text-sm text-right"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1 text-right">ملاحظات</label>
                  <textarea
                    value={editForm.notes}
                    onChange={(e) => setEditForm(f => ({ ...f, notes: e.target.value }))}
                    rows={2}
                    placeholder="ملاحظات إضافية..."
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-primary text-sm text-right resize-none"
                  />
                </div>
              </div>

              {/* المنتجات */}
              <div>
                <p className="text-sm font-bold text-primary border-b border-primary/20 pb-2 mb-3">المنتجات</p>
                <div className="space-y-2.5">
                  {editForm.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 text-sm truncate">{item.productName}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <div className="flex items-center gap-1">
                            <label className="text-xs text-gray-500">سعر البيع</label>
                            <input
                              type="number"
                              value={item.price}
                              onChange={(e) => updateItem(idx, 'price', e.target.value)}
                              className="w-24 px-2 py-1 rounded-lg border border-gray-200 text-sm text-right"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <label className="text-xs text-gray-500">الكمية</label>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                              className="w-16 px-2 py-1 rounded-lg border border-gray-200 text-sm text-right"
                            />
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => removeItem(idx)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* أزرار الحفظ */}
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={handleSaveEdit}
                  disabled={updateOrder.isPending}
                  className="flex-1 bg-primary text-white py-3 rounded-xl font-bold text-sm hover:bg-primary-dark disabled:opacity-60 transition"
                >
                  {updateOrder.isPending ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                </button>
                <button
                  onClick={() => setEditOrder(null)}
                  className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold text-sm hover:bg-gray-200 transition"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}