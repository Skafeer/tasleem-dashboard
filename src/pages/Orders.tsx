import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Package, MapPin, Calendar, TrendingUp, Copy, Pencil, Trash2, ChevronDown, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api';

const STATUS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending:    { label: 'قيد الانتظار', color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
  processing: { label: 'قيد المعالجة', color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' },
  preparing:  { label: 'قيد التجهيز',  color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe' },
  shipping:   { label: 'قيد التوصيل', color: '#06b6d4', bg: '#ecfeff', border: '#a5f3fc' },
  delivered:  { label: 'تم التوصيل',  color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0' },
  cancelled:  { label: 'ملغي',         color: '#ef4444', bg: '#fef2f2', border: '#fecaca' },
  returned:   { label: 'راجع',          color: '#f97316', bg: '#fff7ed', border: '#fed7aa' },
  postponed:  { label: 'مؤجل',         color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb' },
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

const PROVINCES = ['بغداد','البصرة','نينوى','أربيل','كركوك','النجف','كربلاء','الأنبار','ديالى','واسط','ميسان','ذي قار','المثنى','القادسية','بابل','صلاح الدين','السليمانية','دهوك','حلبجة'];

const formatDate = (d: string) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('ar-IQ', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const copyText = (text: string, label = '') => {
  navigator.clipboard.writeText(text);
  toast.success(label ? `تم نسخ ${label}` : 'تم النسخ');
};

const EMPTY_EDIT = { customerName: '', customerPhone: '', province: '', address: '', notes: '' };

export default function Orders() {
  const qc = useQueryClient();
  const [search, setSearch]           = useState('');
  const [filter, setFilter]           = useState('all');
  const [expandedId, setExpandedId]   = useState<number | null>(null);
  const [editModal, setEditModal]     = useState<any>(null);
  const [statusModal, setStatusModal] = useState<any>(null);
  const [editForm, setEditForm]       = useState({ ...EMPTY_EDIT });
  const [newStatus, setNewStatus]     = useState('');

  // ── جلب الطلبات ──
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['admin-orders', filter],
    refetchInterval: 15000,
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '500', page: '1' });
      if (filter !== 'all') params.set('status', filter);
      const { data } = await api.get(`/api/orders?${params}`);
      return (Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []) as any[];
    },
  });

  // ── جلب التجار ──
  const { data: users = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => { const { data } = await api.get('/api/admin/users'); return data as any[]; },
  });

  const getMerchant = (merchantId: number) => (users as any[]).find((u: any) => u.id === merchantId);

  // ── تعديل حالة ──
  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.patch(`/api/orders/${id}/status`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-orders'] }); setStatusModal(null); toast.success('تم تحديث الحالة ✅'); },
    onError: () => toast.error('فشل تحديث الحالة'),
  });

  // ── تعديل بيانات الطلب ──
  const updateOrder = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.patch(`/api/orders/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-orders'] }); setEditModal(null); toast.success('تم تحديث الطلب ✅'); },
    onError: () => toast.error('فشل تحديث الطلب'),
  });

  // ── حذف طلب ──
  const deleteOrder = useMutation({
    mutationFn: (id: number) => api.delete(`/api/orders/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-orders'] }); toast.success('تم حذف الطلب'); },
    onError: () => toast.error('فشل حذف الطلب'),
  });

  const openEdit = (o: any) => {
    setEditForm({
      customerName:  o.customerName  || '',
      customerPhone: o.customerPhone || '',
      province:      o.province      || '',
      address:       o.address       || '',
      notes:         o.notes         || '',
    });
    setEditModal(o);
  };

  const handleSaveEdit = () => {
    if (!editForm.customerName.trim()) return toast.error('اسم الزبون مطلوب');
    if (!editForm.customerPhone.trim()) return toast.error('رقم الهاتف مطلوب');
    updateOrder.mutate({ id: editModal.id, data: editForm });
  };

  const copyAllInfo = (o: any) => {
    const merchant = getMerchant(o.merchantId);
    const items    = (o.items || []).map((i: any) => `- ${i.product?.name || `منتج #${i.productId}`} × ${i.quantity}`).join('\n');
    const text = `طلب #${o.id}
━━━ معلومات الزبون ━━━
الاسم: ${o.customerName || '—'}
الهاتف: ${o.customerPhone || '—'}
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

  const filtered = (orders as any[]).filter((o: any) =>
    !search ||
    String(o.id).includes(search) ||
    o.customerName?.includes(search) ||
    o.customerPhone?.includes(search)
  );

  const counts: Record<string, number> = { all: orders.length };
  Object.keys(STATUS).forEach(k => { counts[k] = (orders as any[]).filter((o: any) => o.status === k).length; });

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-row-reverse mb-6">
        <div className="text-right">
          <h1 className="text-2xl font-black text-gray-800">الطلبات</h1>
          <p className="text-gray-500 text-sm mt-1">{orders.length} طلب</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="ابحث برقم الطلب أو اسم الزبون أو رقم الهاتف..."
          className="w-full pr-10 pl-4 py-3 rounded-xl border border-gray-200 bg-white text-right outline-none focus:border-primary text-sm" />
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-row-reverse flex-wrap mb-5">
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${filter === f.key ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-200 hover:border-primary'}`}>
            {f.label}
            {(counts[f.key] || 0) > 0 && (
              <span className={`mr-1.5 px-1.5 py-0.5 rounded-full text-xs ${filter === f.key ? 'bg-white/20' : 'bg-gray-100 text-gray-500'}`}>
                {counts[f.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Orders */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((o: any) => {
            const st       = STATUS[o.status] || STATUS.pending;
            const merchant = getMerchant(o.merchantId);
            const items    = o.items || o.orderItems || [];
            const isOpen   = expandedId === o.id;

            return (
              <div key={o.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

                {/* Header Row */}
                <div className="flex items-center flex-row-reverse px-5 py-4 gap-3 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedId(isOpen ? null : o.id)}>

                  <span className="px-3 py-1.5 rounded-xl text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
                    {st.label}
                  </span>

                  <div className="flex-1 text-right min-w-0">
                    <div className="flex items-center gap-3 flex-row-reverse flex-wrap">
                      <span className="font-black text-gray-800">طلب #{o.id}</span>
                      {o.customerName && <span className="text-sm font-semibold text-gray-700">{o.customerName}</span>}
                      {o.customerPhone && <span className="text-xs text-gray-400 font-mono">{o.customerPhone}</span>}
                    </div>
                    <div className="flex items-center gap-4 flex-row-reverse text-xs text-gray-400 mt-1 flex-wrap">
                      {o.province && <span className="flex items-center gap-1 flex-row-reverse"><MapPin size={11} />{o.province}</span>}
                      <span className="flex items-center gap-1 flex-row-reverse"><Calendar size={11} />{formatDate(o.createdAt)}</span>
                      {o.totalProfit != null && (
                        <span className="flex items-center gap-1 flex-row-reverse text-green-600 font-semibold">
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

                {/* Expanded Details */}
                {isOpen && (
                  <div className="border-t border-gray-100 bg-gray-50">

                    {/* Action Buttons */}
                    <div className="flex flex-row-reverse gap-2 px-5 py-3 border-b border-gray-100 bg-white flex-wrap">
                      <button onClick={() => copyAllInfo(o)}
                        className="flex items-center gap-1.5 flex-row-reverse px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-bold hover:bg-gray-200 transition-colors">
                        <Copy size={13} /> نسخ كل المعلومات
                      </button>
                      <button onClick={() => { setStatusModal(o); setNewStatus(o.status); }}
                        className="flex items-center gap-1.5 flex-row-reverse px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-colors">
                        <Check size={13} /> تغيير الحالة
                      </button>
                      <button onClick={() => openEdit(o)}
                        className="flex items-center gap-1.5 flex-row-reverse px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-xs font-bold hover:bg-blue-100 transition-colors">
                        <Pencil size={13} /> تعديل البيانات
                      </button>
                      <button onClick={() => { if (confirm(`حذف الطلب #${o.id}؟`)) deleteOrder.mutate(o.id); }}
                        className="flex items-center gap-1.5 flex-row-reverse px-3 py-1.5 rounded-lg bg-red-50 text-red-500 text-xs font-bold hover:bg-red-100 transition-colors">
                        <Trash2 size={13} /> حذف الطلب
                      </button>
                    </div>

                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">

                      {/* معلومات الزبون */}
                      <div className="bg-white rounded-2xl p-4 border border-gray-100">
                        <p className="text-xs font-black text-gray-500 mb-3 text-right">معلومات الزبون</p>
                        {[
                          { label: 'الاسم',     value: o.customerName,  key: 'اسم الزبون' },
                          { label: 'الهاتف',    value: o.customerPhone, key: 'رقم الهاتف' },
                          { label: 'المحافظة', value: o.province,      key: 'المحافظة' },
                          { label: 'العنوان',  value: o.address,       key: 'العنوان' },
                        ].map(({ label, value, key }) => value ? (
                          <div key={label} className="flex items-center justify-between flex-row-reverse mb-2 last:mb-0">
                            <div className="text-right">
                              <p className="text-xs text-gray-400">{label}</p>
                              <p className="text-sm font-semibold text-gray-800">{value}</p>
                            </div>
                            <button onClick={() => copyText(value, key)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-primary transition-colors">
                              <Copy size={13} />
                            </button>
                          </div>
                        ) : null)}
                        {o.notes && (
                          <div className="mt-2 pt-2 border-t border-gray-100 text-right">
                            <p className="text-xs text-gray-400">ملاحظات</p>
                            <p className="text-sm text-gray-700 mt-0.5">{o.notes}</p>
                          </div>
                        )}
                      </div>

                      {/* معلومات التاجر والأرقام */}
                      <div className="space-y-3">
                        {merchant && (
                          <div className="bg-white rounded-2xl p-4 border border-gray-100">
                            <p className="text-xs font-black text-gray-500 mb-3 text-right">التاجر</p>
                            <div className="flex items-center justify-between flex-row-reverse mb-2">
                              <div className="text-right">
                                <p className="text-xs text-gray-400">اسم المتجر</p>
                                <p className="text-sm font-semibold text-gray-800">{merchant.storeName}</p>
                              </div>
                              <button onClick={() => copyText(merchant.storeName, 'اسم المتجر')} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-primary transition-colors">
                                <Copy size={13} />
                              </button>
                            </div>
                            {merchant.phone && (
                              <div className="flex items-center justify-between flex-row-reverse">
                                <div className="text-right">
                                  <p className="text-xs text-gray-400">هاتف التاجر</p>
                                  <p className="text-sm font-semibold text-gray-800 font-mono">{merchant.phone}</p>
                                </div>
                                <button onClick={() => copyText(merchant.phone, 'هاتف التاجر')} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-primary transition-colors">
                                  <Copy size={13} />
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* الأرقام */}
                        <div className="bg-white rounded-2xl p-4 border border-gray-100">
                          <p className="text-xs font-black text-gray-500 mb-3 text-right">الأرقام</p>
                          {[
                            { label: 'المجموع الكلي', value: o.totalAmount,  color: 'text-primary' },
                            { label: 'التوصيل',       value: o.shippingCost, color: 'text-gray-700' },
                            { label: 'الربح',          value: o.totalProfit,  color: 'text-green-600' },
                          ].map(({ label, value, color }) => (
                            <div key={label} className="flex items-center justify-between flex-row-reverse mb-1.5 last:mb-0">
                              <span className="text-xs text-gray-500">{label}</span>
                              <span className={`text-sm font-bold ${color}`}>{value?.toLocaleString() || '0'} د.ع</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* المنتجات */}
                    {items.length > 0 && (
                      <div className="px-5 pb-5">
                        <p className="text-xs font-black text-gray-500 mb-3 text-right">المنتجات ({items.length})</p>
                        <div className="space-y-2">
                          {items.map((item: any, idx: number) => {
                            const p    = item.product || {};
                            const imgs = p.images ? p.images.split(',').filter(Boolean) : [];
                            return (
                              <div key={idx} className="flex items-center flex-row-reverse gap-3 bg-white rounded-xl p-3 border border-gray-100">
                                {imgs[0]
                                  ? <img src={imgs[0]} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-gray-100" />
                                  : <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0"><Package size={20} className="text-gray-300" /></div>
                                }
                                <div className="flex-1 text-right min-w-0">
                                  <p className="font-semibold text-gray-800 text-sm">{p.name || `منتج #${item.productId}`}</p>
                                  <p className="text-xs text-gray-400 mt-0.5">
                                    الكمية: {item.quantity} × {item.sellingPrice?.toLocaleString()} د.ع
                                  </p>
                                  {item.profit != null && (
                                    <p className="text-xs text-green-600 font-semibold mt-0.5">ربح: {item.profit?.toLocaleString()} د.ع</p>
                                  )}
                                </div>
                                <p className="font-black text-primary flex-shrink-0">
                                  {(item.quantity * (item.sellingPrice || item.price || 0)).toLocaleString()} د.ع
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

          {filtered.length === 0 && !isLoading && (
            <div className="text-center py-16 text-gray-400">
              <Package size={48} className="mx-auto mb-3 opacity-30" />
              <p className="font-semibold">لا توجد طلبات</p>
            </div>
          )}
        </div>
      )}

      {/* ── Modal تعديل البيانات ── */}
      {editModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setEditModal(null)}>
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between flex-row-reverse p-6 border-b border-gray-100 sticky top-0 bg-white">
              <h3 className="font-black text-gray-800">تعديل طلب #{editModal.id}</h3>
              <button onClick={() => setEditModal(null)} className="p-2 hover:bg-gray-100 rounded-xl"><X size={18} className="text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              {[
                { label: 'اسم الزبون *', key: 'customerName',  placeholder: 'اسم الزبون' },
                { label: 'رقم الهاتف *', key: 'customerPhone', placeholder: '07XXXXXXXXX' },
                { label: 'العنوان',       key: 'address',       placeholder: 'العنوان التفصيلي' },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="block text-sm font-semibold text-gray-600 mb-1.5 text-right">{label}</label>
                  <input value={(editForm as any)[key]} onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder} dir="rtl"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-primary text-sm text-right" />
                </div>
              ))}

              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1.5 text-right">المحافظة</label>
                <select value={editForm.province} onChange={e => setEditForm(f => ({ ...f, province: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-primary text-sm text-right bg-white">
                  <option value="">اختر المحافظة</option>
                  {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1.5 text-right">ملاحظات</label>
                <textarea value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3} placeholder="ملاحظات إضافية..." dir="rtl"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-primary text-sm text-right resize-none" />
              </div>

              <button onClick={handleSaveEdit} disabled={updateOrder.isPending}
                className="w-full bg-primary text-white py-3 rounded-xl font-bold text-sm hover:bg-primary-dark disabled:opacity-60 transition-colors">
                {updateOrder.isPending ? 'جاري الحفظ...' : 'حفظ التعديلات'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal تغيير الحالة ── */}
      {statusModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setStatusModal(null)}>
          <div className="bg-white rounded-3xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between flex-row-reverse mb-5">
              <h3 className="font-black text-gray-800">تغيير حالة طلب #{statusModal.id}</h3>
              <button onClick={() => setStatusModal(null)} className="p-2 hover:bg-gray-100 rounded-xl"><X size={18} className="text-gray-500" /></button>
            </div>
            <div className="space-y-2 mb-5">
              {Object.entries(STATUS).map(([key, val]) => (
                <button key={key} onClick={() => setNewStatus(key)}
                  className={`w-full text-right px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border ${newStatus === key ? 'border-primary bg-primary/5 text-primary' : 'border-gray-100 text-gray-700 hover:border-gray-200'}`}>
                  {val.label}
                  {newStatus === key && <span className="float-left text-primary">✓</span>}
                </button>
              ))}
            </div>
            <div className="flex gap-3 flex-row-reverse">
              <button onClick={() => updateStatus.mutate({ id: statusModal.id, status: newStatus })}
                disabled={updateStatus.isPending || newStatus === statusModal.status}
                className="flex-1 bg-primary text-white py-3 rounded-xl font-bold text-sm disabled:opacity-60 transition-colors">
                {updateStatus.isPending ? 'جاري التحديث...' : 'تحديث'}
              </button>
              <button onClick={() => setStatusModal(null)} className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold text-sm">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
