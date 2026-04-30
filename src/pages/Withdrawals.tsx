import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Wallet, Copy, ChevronDown, User } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api';

const W_STATUS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending:  { label: 'قيد المعالجة', color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
  approved: { label: 'تم القبول',    color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' },
  paid:     { label: 'تم الدفع',     color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0' },
  rejected: { label: 'مرفوض',        color: '#ef4444', bg: '#fef2f2', border: '#fecaca' },
};

const FILTERS = [
  { key: 'all',      label: 'الكل' },
  { key: 'pending',  label: 'معالجة' },
  { key: 'approved', label: 'مقبول' },
  { key: 'paid',     label: 'مدفوع' },
  { key: 'rejected', label: 'مرفوض' },
];

const formatDate = (d: string) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('ar-IQ', { year: 'numeric', month: 'short', day: 'numeric' });
};

const copy = (text: string, label: string) => {
  navigator.clipboard.writeText(text ?? '');
  toast.success(`تم نسخ ${label}`);
};

export default function Withdrawals() {
  const qc = useQueryClient();
  const [filter, setFilter]       = useState('all');
  const [search, setSearch]       = useState('');
  const [openId, setOpenId]       = useState<number | null>(null);

  const { data: withdrawals = [], isLoading } = useQuery({
    queryKey: ['admin-withdrawals'],
    refetchInterval: 15000,
    queryFn: async () => { const { data } = await api.get('/api/withdrawals'); return data as any[]; },
  });

  const { data: users = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => { const { data } = await api.get('/api/admin/users'); return data as any[]; },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const { data } = await api.patch(`/api/withdrawals/${id}`, { status });
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['admin-withdrawals'] });
      setOpenId(null);
      toast.success(`تم التحديث: ${W_STATUS[vars.status]?.label}`);
    },
    onError: () => toast.error('فشل تحديث الحالة'),
  });

  const getMerchant = (merchantId: number) =>
    (users as any[]).find((u: any) => u.id === merchantId);

  const counts: Record<string, number> = { all: (withdrawals as any[]).length };
  Object.keys(W_STATUS).forEach(k => {
    counts[k] = (withdrawals as any[]).filter((w: any) => w.status === k).length;
  });

  const totalPending = (withdrawals as any[])
    .filter((w: any) => w.status === 'pending')
    .reduce((s: number, w: any) => s + (w.amount || 0), 0);

  const filtered = (withdrawals as any[]).filter((w: any) => {
    const matchFilter = filter === 'all' || w.status === filter;
    const merchant    = getMerchant(w.merchantId);
    const matchSearch = !search ||
      String(w.id).includes(search) ||
      merchant?.storeName?.includes(search) ||
      w.accountDetails?.includes(search);
    return matchFilter && matchSearch;
  });

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-row-reverse mb-6">
        <div className="text-right">
          <h1 className="text-2xl font-black text-gray-800">السحوبات</h1>
          <p className="text-gray-500 text-sm mt-1">{(withdrawals as any[]).length} طلب سحب</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 text-right">
          <p className="text-xs text-amber-600 font-semibold">معلقة بانتظار الدفع</p>
          <p className="font-black text-amber-700 text-lg">{totalPending.toLocaleString()} د.ع</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="ابحث برقم الطلب أو اسم التاجر أو رقم البطاقة..."
          className="w-full pr-10 pl-4 py-3 rounded-xl border border-gray-200 bg-white text-right outline-none focus:border-primary text-sm" />
      </div>

      {/* Filters */}
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

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 font-semibold border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3">#</th>
                  <th className="px-5 py-3">التاجر</th>
                  <th className="px-5 py-3">المبلغ</th>
                  <th className="px-5 py-3">رقم البطاقة</th>
                  <th className="px-5 py-3">التاريخ</th>
                  <th className="px-5 py-3">الحالة</th>
                  <th className="px-5 py-3">تغيير الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((w: any) => {
                  const st       = W_STATUS[w.status] || W_STATUS.pending;
                  const merchant = getMerchant(w.merchantId);
                  return (
                    <tr key={w.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4 text-gray-400 font-mono text-xs">#{w.id}</td>

                      {/* التاجر */}
                      <td className="px-5 py-4">
                        {merchant ? (
                          <div className="flex items-center gap-2 flex-row-reverse">
                            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <span className="text-primary font-black text-xs">{merchant.storeName?.charAt(0)}</span>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-gray-800 text-xs">{merchant.storeName}</p>
                              <p className="text-xs text-gray-400">{merchant.phone}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 flex-row-reverse text-gray-400">
                            <User size={14} />
                            <span className="text-xs">#{w.merchantId}</span>
                          </div>
                        )}
                      </td>

                      {/* المبلغ */}
                      <td className="px-5 py-4 font-black text-primary text-base">
                        {w.amount?.toLocaleString()} د.ع
                      </td>

                      {/* رقم البطاقة */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 flex-row-reverse">
                          <span className="font-mono text-gray-600 text-xs bg-gray-100 px-2 py-1 rounded-lg">
                            {w.accountDetails || '—'}
                          </span>
                          {w.accountDetails && (
                            <button onClick={() => copy(w.accountDetails, 'رقم البطاقة')}
                              className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-primary transition-colors">
                              <Copy size={13} />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* التاريخ */}
                      <td className="px-5 py-4 text-xs text-gray-400">{formatDate(w.createdAt)}</td>

                      {/* الحالة */}
                      <td className="px-5 py-4">
                        <span className="px-3 py-1.5 rounded-xl text-xs font-bold"
                          style={{ backgroundColor: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
                          {st.label}
                        </span>
                      </td>

                      {/* Dropdown تغيير الحالة */}
                      <td className="px-5 py-4">
                        <div className="relative">
                          <button onClick={() => setOpenId(openId === w.id ? null : w.id)}
                            className="flex items-center gap-1.5 flex-row-reverse px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:border-primary hover:text-primary transition-all bg-white">
                            تغيير
                            <ChevronDown size={13} className={openId === w.id ? 'rotate-180' : ''} />
                          </button>

                          {openId === w.id && (
                            <div className="absolute left-0 top-8 z-20 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden w-36">
                              {Object.entries(W_STATUS).map(([key, val]) => (
                                <button key={key}
                                  onClick={() => {
                                    if (key !== w.status) updateStatus.mutate({ id: w.id, status: key });
                                    setOpenId(null);
                                  }}
                                  className={`w-full text-right px-4 py-2.5 text-xs font-semibold transition-colors hover:bg-gray-50 ${
                                    w.status === key ? 'text-primary bg-primary/5' : 'text-gray-700'}`}>
                                  {val.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filtered.length === 0 && !isLoading && (
              <div className="text-center py-16 text-gray-400">
                <Wallet size={40} className="mx-auto mb-2 opacity-30" />
                <p className="font-semibold">لا توجد سحوبات</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* إغلاق الـ dropdown عند الضغط خارجه */}
      {openId !== null && (
        <div className="fixed inset-0 z-10" onClick={() => setOpenId(null)} />
      )}
    </div>
  );
}
