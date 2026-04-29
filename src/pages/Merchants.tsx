import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Pencil, Trash2, Copy, X, Eye, EyeOff, User, Phone, MapPin, Wallet, ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api';

const formatDate = (d: string) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('ar-IQ', { year: 'numeric', month: 'short', day: 'numeric' });
};

const copy = (text: string, label: string) => {
  navigator.clipboard.writeText(text ?? '');
  toast.success(`تم نسخ ${label}`);
};

export default function Merchants() {
  const qc = useQueryClient();
  const [search, setSearch]       = useState('');
  const [editUser, setEditUser]   = useState<any>(null);
  const [showPass, setShowPass]   = useState(false);
  const [editForm, setEditForm]   = useState<any>({});

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    refetchInterval: 30000,
    queryFn: async () => { const { data } = await api.get('/api/admin/users'); return data as any[]; },
  });

  const updateUser = useMutation({
    mutationFn: async ({ id, data }: any) => { const res = await api.patch(`/api/admin/users/${id}`, data); return res.data; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); setEditUser(null); toast.success('تم تحديث بيانات التاجر ✅'); },
    onError: () => toast.error('فشل تحديث البيانات'),
  });

  const deleteMerchant = useMutation({
    mutationFn: async (id: number) => api.delete(`/api/admin/users/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('تم حذف الحساب'); },
    onError: () => toast.error('فشل الحذف'),
  });

  const openEdit = (u: any) => {
    setEditForm({ storeName: u.storeName || '', phone: u.phone || '', address: u.address || '', balance: String(u.balance ?? 0), password: '' });
    setShowPass(false);
    setEditUser(u);
  };

  const handleSave = () => {
    if (!editForm.storeName.trim()) return toast.error('اسم المتجر مطلوب');
    const data: any = {
      storeName: editForm.storeName.trim(),
      phone: editForm.phone.trim(),
      address: editForm.address.trim(),
      balance: Number(editForm.balance) || 0,
    };
    if (editForm.password.trim()) data.password = editForm.password.trim();
    updateUser.mutate({ id: editUser.id, data });
  };

  const merchants = (users as any[]).filter((u: any) => u.role === 'merchant');
  const filtered  = merchants.filter((u: any) =>
    !search ||
    u.storeName?.includes(search) ||
    u.phone?.includes(search) ||
    u.merchantId?.includes(search)
  );

  const totalBalance = merchants.reduce((s: number, u: any) => s + (u.balance || 0), 0);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-row-reverse mb-6">
        <div className="text-right">
          <h1 className="text-2xl font-black text-gray-800">التجار</h1>
          <p className="text-gray-500 text-sm mt-1">{merchants.length} تاجر مسجل</p>
        </div>
        {/* Stats */}
        <div className="flex gap-3 flex-row-reverse">
          <div className="bg-white border border-gray-100 rounded-2xl px-5 py-3 text-right shadow-sm">
            <p className="text-xs text-gray-400">إجمالي الأرصدة</p>
            <p className="font-black text-primary text-lg">{totalBalance.toLocaleString()} د.ع</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="ابحث بالاسم أو الهاتف أو الـ ID..."
          className="w-full pr-10 pl-4 py-3 rounded-xl border border-gray-200 bg-white text-right outline-none focus:border-primary text-sm" />
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
                  <th className="px-5 py-3">التاجر</th>
                  <th className="px-5 py-3">الهاتف</th>
                  <th className="px-5 py-3">رقم التاجر</th>
                  <th className="px-5 py-3">الرصيد المتاح</th>
                  <th className="px-5 py-3">الأرباح المنتظرة</th>
                  <th className="px-5 py-3">تاريخ التسجيل</th>
                  <th className="px-5 py-3">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((u: any) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3 flex-row-reverse">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-primary font-black text-sm">{u.storeName?.charAt(0)}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-800">{u.storeName}</p>
                          <p className="text-xs text-gray-400">{u.address || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 flex-row-reverse">
                        <span className="font-mono text-gray-700">{u.phone}</span>
                        <button onClick={() => copy(u.phone, 'رقم الهاتف')} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-primary transition-colors">
                          <Copy size={13} />
                        </button>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 flex-row-reverse">
                        <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded-lg text-gray-600">{u.merchantId}</span>
                        <button onClick={() => copy(u.merchantId, 'رقم التاجر')} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-primary transition-colors">
                          <Copy size={13} />
                        </button>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-bold text-primary">{(u.balance || 0).toLocaleString()} د.ع</td>
                    <td className="px-5 py-4 font-semibold text-amber-600">{(u.pendingBalance || 0).toLocaleString()} د.ع</td>
                    <td className="px-5 py-4 text-xs text-gray-400">{formatDate(u.createdAt)}</td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2 flex-row-reverse">
                        <button onClick={() => openEdit(u)} className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => { if (confirm(`حذف "${u.storeName}"؟`)) deleteMerchant.mutate(u.id); }}
                          className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <User size={40} className="mx-auto mb-2 opacity-30" />
                <p className="font-semibold">لا يوجد تجار</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal تعديل */}
      {editUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={e => e.target === e.currentTarget && setEditUser(null)}>
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between flex-row-reverse p-6 border-b border-gray-100 sticky top-0 bg-white">
              <h3 className="font-black text-gray-800">تعديل بيانات التاجر</h3>
              <button onClick={() => setEditUser(null)} className="p-2 hover:bg-gray-100 rounded-xl">
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* معلومات القراءة فقط */}
              <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
                {[
                  { icon: User,      label: 'ID',        value: editUser.merchantId },
                  { icon: ShoppingBag, label: 'طلبات',  value: `${editUser.ordersCount || 0} طلب` },
                  { icon: Wallet,    label: 'الرصيد',    value: `${(editUser.balance || 0).toLocaleString()} د.ع` },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center justify-between flex-row-reverse">
                    <div className="flex items-center gap-2 flex-row-reverse text-gray-500 text-xs">
                      <Icon size={14} /><span>{label}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-700">{value}</span>
                  </div>
                ))}
              </div>

              {/* حقول التعديل */}
              {[
                { label: 'اسم المتجر *', key: 'storeName', icon: User,   placeholder: 'اسم المتجر' },
                { label: 'رقم الهاتف',  key: 'phone',     icon: Phone,  placeholder: '07XXXXXXXXX' },
                { label: 'العنوان',      key: 'address',   icon: MapPin, placeholder: 'العنوان' },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="block text-sm font-semibold text-gray-600 mb-1.5 text-right">{label}</label>
                  <input value={editForm[key]} onChange={e => setEditForm((f: any) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder} dir="rtl"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-primary text-sm text-right" />
                </div>
              ))}

              {/* الرصيد */}
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1.5 text-right">الرصيد (د.ع)</label>
                <input type="number" value={editForm.balance} onChange={e => setEditForm((f: any) => ({ ...f, balance: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-primary text-sm text-right" />
              </div>

              {/* كلمة مرور جديدة */}
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1.5 text-right">كلمة مرور جديدة (اختياري)</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'}
                    value={editForm.password}
                    onChange={e => setEditForm((f: any) => ({ ...f, password: e.target.value }))}
                    placeholder="اتركه فارغاً إذا لا تريد تغييره" dir="rtl"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-primary text-sm text-right pl-10" />
                  <button onClick={() => setShowPass(!showPass)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button onClick={handleSave} disabled={updateUser.isPending}
                className="w-full bg-primary text-white py-3 rounded-xl font-bold text-sm hover:bg-primary-dark disabled:opacity-60 transition-colors">
                {updateUser.isPending ? 'جاري الحفظ...' : 'حفظ التعديلات'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
