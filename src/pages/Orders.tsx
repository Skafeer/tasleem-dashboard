import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, ChevronDown, Package, MapPin, Calendar, TrendingUp } from 'lucide-react';
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
  { key: 'all',       label: 'الكل' },
  { key: 'pending',   label: 'انتظار' },
  { key: 'processing',label: 'معالجة' },
  { key: 'preparing', label: 'تجهيز' },
  { key: 'shipping',  label: 'توصيل' },
  { key: 'delivered', label: 'مُسلَّم' },
  { key: 'cancelled', label: 'ملغي' },
  { key: 'returned',  label: 'راجع' },
  { key: 'postponed', label: 'مؤجل' },
];

const STATUS_OPTIONS = Object.entries(STATUS).map(([k, v]) => ({ key: k, label: v.label }));

const formatDate = (d: string) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('ar-IQ', { year: 'numeric', month: 'short', day: 'numeric' });
};

export default function Orders() {
  const qc = useQueryClient();
  const [search, setSearch]           = useState('');
  const [filter, setFilter]           = useState('all');
  const [expandedId, setExpandedId]   = useState<number | null>(null);
  const [statusModal, setStatusModal] = useState<any>(null);
  const [newStatus, setNewStatus]     = useState('');

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['admin-orders', filter],
    refetchInterval: 15000,
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '200', page: '1' });
      if (filter !== 'all') params.set('status', filter);
      const { data } = await api.get(`/api/orders?${params}`);
      return (Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []) as any[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) =>
      api.patch(`/api/orders/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      setStatusModal(null);
      toast.success('تم تحديث الحالة ✅');
    },
    onError: () => toast.error('فشل تحديث الحالة'),
  });

  const filtered = orders.filter((o: any) =>
    !search ||
    String(o.id).includes(search) ||
    o.customerName?.includes(search) ||
    o.customerPhone?.includes(search)
  );

  // عدد كل فئة
  const counts: Record<string, number> = { all: orders.length };
  Object.keys(STATUS).forEach(k => { counts[k] = orders.filter((o: any) => o.status === k).length; });

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

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-row-reverse flex-wrap mb-5">
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
              filter === f.key
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-gray-600 border-gray-200 hover:border-primary'}`}>
            {f.label}
            {counts[f.key] > 0 && (
              <span className={`mr-1.5 px-1.5 py-0.5 rounded-full text-xs ${filter === f.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {counts[f.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((o: any) => {
            const st = STATUS[o.status] || STATUS.pending;
            const isExpanded = expandedId === o.id;
            const items = o.items || o.orderItems || [];
            return (
              <div key={o.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Row */}
                <div className="flex items-center flex-row-reverse px-5 py-4 gap-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : o.id)}>

                  {/* Status Badge */}
                  <span className="px-3 py-1.5 rounded-xl text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
                    {st.label}
                  </span>

                  {/* Info */}
                  <div className="flex-1 text-right min-w-0">
                    <div className="flex items-center gap-3 flex-row-reverse mb-1">
                      <span className="font-black text-gray-800">طلب #{o.id}</span>
                      {o.customerName && <span className="text-sm text-gray-600 truncate">{o.customerName}</span>}
                      {o.customerPhone && <span className="text-xs text-gray-400">{o.customerPhone}</span>}
                    </div>
                    <div className="flex items-center gap-4 flex-row-reverse text-xs text-gray-400">
                      {o.province && (
                        <span className="flex items-center gap-1 flex-row-reverse">
                          <MapPin size={11} />{o.province}
                        </span>
                      )}
                      <span className="flex items-center gap-1 flex-row-reverse">
                        <Calendar size={11} />{formatDate(o.createdAt)}
                      </span>
                      {o.totalProfit != null && (
                        <span className="flex items-center gap-1 flex-row-reverse text-green-600 font-semibold">
                          <TrendingUp size={11} />ربح: {o.totalProfit?.toLocaleString()} د.ع
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="text-right flex-shrink-0">
                    <p className="font-black text-primary text-lg">{o.totalAmount?.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">د.ع</p>
                  </div>

                  {/* Expand arrow */}
                  <ChevronDown size={16} className={`text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                </div>

                {/* Expanded */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-5 py-4 bg-gray-50">
                    {/* Products */}
                    {items.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-bold text-gray-500 mb-3 text-right">المنتجات</p>
                        <div className="space-y-2">
                          {items.map((item: any, idx: number) => {
                            const p = item.product || {};
                            const imgs = p.images ? p.images.split(',').filter(Boolean) : [];
                            return (
                              <div key={idx} className="flex items-center flex-row-reverse gap-3 bg-white rounded-xl p-3 border border-gray-100">
                                {imgs[0]
                                  ? <img src={imgs[0]} alt={p.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                                  : <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0"><Package size={18} className="text-gray-300" /></div>
                                }
                                <div className="flex-1 text-right min-w-0">
                                  <p className="font-semibold text-gray-800 text-sm truncate">{p.name || item.productName || `منتج #${item.productId}`}</p>
                                  <p className="text-xs text-gray-400 mt-0.5">
                                    الكمية: {item.quantity} × {item.sellingPrice?.toLocaleString()} د.ع
                                  </p>
                                </div>
                                <p className="font-bold text-primary text-sm flex-shrink-0">
                                  {(item.quantity * item.sellingPrice).toLocaleString()} د.ع
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {o.notes && (
                      <div className="mb-4 text-right">
                        <p className="text-xs font-bold text-gray-500 mb-1">ملاحظات</p>
                        <p className="text-sm text-gray-600 bg-white rounded-xl p-3 border border-gray-100">{o.notes}</p>
                      </div>
                    )}

                    {/* Change Status */}
                    <div className="flex items-center justify-between flex-row-reverse">
                      <p className="text-xs text-gray-500">تغيير حالة الطلب:</p>
                      <button onClick={() => { setStatusModal(o); setNewStatus(o.status); }}
                        className="flex items-center gap-2 flex-row-reverse bg-primary text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-primary-dark transition-colors">
                        تغيير الحالة
                      </button>
                    </div>
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

      {/* Status Modal */}
      {statusModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={e => e.target === e.currentTarget && setStatusModal(null)}>
          <div className="bg-white rounded-3xl w-full max-w-sm p-6">
            <h3 className="font-black text-gray-800 text-lg mb-1 text-right">تغيير حالة الطلب</h3>
            <p className="text-sm text-gray-400 mb-5 text-right">طلب #{statusModal.id}</p>

            <div className="space-y-2 mb-6">
              {STATUS_OPTIONS.map(({ key, label }) => (
                <button key={key} onClick={() => setNewStatus(key)}
                  className={`w-full text-right px-4 py-3 rounded-xl text-sm font-semibold transition-all border ${
                    newStatus === key
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-gray-100 hover:border-gray-200 text-gray-700'}`}>
                  {label}
                </button>
              ))}
            </div>

            <div className="flex gap-3 flex-row-reverse">
              <button onClick={() => updateStatus.mutate({ id: statusModal.id, status: newStatus })}
                disabled={updateStatus.isPending || newStatus === statusModal.status}
                className="flex-1 bg-primary text-white py-3 rounded-xl font-bold text-sm hover:bg-primary-dark disabled:opacity-60 transition-colors">
                {updateStatus.isPending ? 'جاري التحديث...' : 'تحديث'}
              </button>
              <button onClick={() => setStatusModal(null)}
                className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
