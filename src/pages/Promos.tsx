import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, X, Tag, Copy, ToggleLeft, ToggleRight } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api';

const copy = (text: string) => { navigator.clipboard.writeText(text); toast.success('تم نسخ الكود'); };

const EMPTY = {
  code: '', discountType: 'percent' as 'percent' | 'fixed',
  discountPercent: '', discountAmount: '',
  maxUses: '', expiresAt: '', minOrderAmount: '',
};

export default function Promos() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editPromo, setEditPromo] = useState<any>(null);
  const [form, setForm]           = useState({ ...EMPTY });

  const { data: promos = [], isLoading } = useQuery({
    queryKey: ['promo-codes'],
    queryFn: async () => { const { data } = await api.get('/api/promo-codes'); return data as any[]; },
  });

  const refetch = () => qc.invalidateQueries({ queryKey: ['promo-codes'] });

  const saveMut = useMutation({
    mutationFn: async (body: any) => {
      if (editPromo) { const { data } = await api.patch(`/api/promo-codes/${editPromo.id}`, body); return data; }
      const { data } = await api.post('/api/promo-codes', body); return data;
    },
    onSuccess: () => { refetch(); closeModal(); toast.success(editPromo ? 'تم تعديل الكود ✅' : 'تم إضافة الكود ✅'); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'فشل الحفظ'),
  });

  const toggleMut = useMutation({
    mutationFn: async ({ id, isActive }: any) => { const { data } = await api.patch(`/api/promo-codes/${id}`, { isActive }); return data; },
    onSuccess: (_, v) => { refetch(); toast.success(v.isActive ? 'تم تفعيل الكود' : 'تم تعطيل الكود'); },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: number) => api.delete(`/api/promo-codes/${id}`),
    onSuccess: () => { refetch(); toast.success('تم حذف الكود'); },
  });

  const openAdd = () => { setEditPromo(null); setForm({ ...EMPTY }); setShowModal(true); };

  const openEdit = (p: any) => {
    setEditPromo(p);
    setForm({
      code: p.code || '',
      discountType: p.discountAmount > 0 ? 'fixed' : 'percent',
      discountPercent: String(p.discountPercent || ''),
      discountAmount:  String(p.discountAmount  || ''),
      maxUses:         String(p.maxUses         || ''),
      expiresAt:       p.expiresAt ? p.expiresAt.substring(0, 10) : '',
      minOrderAmount:  String(p.minOrderAmount  || ''),
    });
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditPromo(null); setForm({ ...EMPTY }); };

  const handleSave = () => {
    if (!form.code.trim()) return toast.error('يرجى إدخال الكود');
    if (form.discountType === 'percent') {
      const pct = Number(form.discountPercent);
      if (!form.discountPercent || isNaN(pct) || pct <= 0 || pct > 100) return toast.error('نسبة الخصم يجب أن تكون بين 1 و 100');
    } else {
      const amt = Number(form.discountAmount);
      if (!form.discountAmount || isNaN(amt) || amt <= 0) return toast.error('مبلغ الخصم يجب أن يكون أكبر من 0');
    }
    saveMut.mutate({
      code:            form.code.trim().toUpperCase(),
      discountPercent: form.discountType === 'percent' ? Number(form.discountPercent) : 0,
      discountAmount:  form.discountType === 'fixed'   ? Number(form.discountAmount)  : 0,
      maxUses:         form.maxUses        ? Number(form.maxUses)        : null,
      minOrderAmount:  form.minOrderAmount ? Number(form.minOrderAmount) : 0,
      expiresAt:       form.expiresAt || null,
    });
  };

  const isExpired = (p: any) => p.expiresAt && new Date(p.expiresAt) < new Date();
  const isMaxed   = (p: any) => p.maxUses && p.usedCount >= p.maxUses;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between flex-row-reverse mb-6">
        <div className="text-right">
          <h1 className="text-2xl font-black text-gray-800">أكواد الخصم</h1>
          <p className="text-gray-500 text-sm mt-1">{(promos as any[]).length} كود</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 flex-row-reverse bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-dark transition-colors">
          <Plus size={18} /> إضافة كود
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(promos as any[]).map((p: any) => {
            const expired  = isExpired(p);
            const maxed    = isMaxed(p);
            const inactive = !p.isActive || expired || maxed;
            return (
              <div key={p.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${inactive ? 'opacity-60 border-gray-100' : 'border-gray-100 hover:shadow-md'}`}>
                <div className="p-5">
                  <div className="flex items-start justify-between flex-row-reverse mb-3">
                    <div className="flex items-center gap-2 flex-row-reverse">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${inactive ? 'bg-gray-100' : 'bg-amber-50'}`}>
                        <Tag size={20} className={inactive ? 'text-gray-400' : 'text-amber-500'} />
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2 flex-row-reverse">
                          <span className="font-black text-lg text-gray-800 font-mono tracking-wider">{p.code}</span>
                          <button onClick={() => copy(p.code)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-primary">
                            <Copy size={13} />
                          </button>
                        </div>
                        <span className={`text-sm font-bold ${inactive ? 'text-gray-400' : 'text-amber-600'}`}>
                          {p.discountAmount > 0
                            ? `خصم ${p.discountAmount.toLocaleString()} د.ع`
                            : `خصم ${p.discountPercent}%`}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => openEdit(p)} className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20"><Pencil size={14} /></button>
                      <button onClick={() => { if (confirm(`حذف "${p.code}"؟`)) deleteMut.mutate(p.id); }} className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100"><Trash2 size={14} /></button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center mb-3">
                    <div className="bg-gray-50 rounded-xl py-2">
                      <p className="text-xs text-gray-400">الاستخدام</p>
                      <p className="font-black text-gray-700 text-sm">{p.usedCount || 0}{p.maxUses ? `/${p.maxUses}` : ''}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl py-2">
                      <p className="text-xs text-gray-400">الحد الأدنى</p>
                      <p className="font-black text-gray-700 text-xs">{p.minOrderAmount > 0 ? `${Number(p.minOrderAmount).toLocaleString()}` : '—'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl py-2">
                      <p className="text-xs text-gray-400">الانتهاء</p>
                      <p className={`font-bold text-xs ${expired ? 'text-red-500' : 'text-gray-700'}`}>
                        {p.expiresAt ? new Date(p.expiresAt).toLocaleDateString('ar-IQ', { month: 'short', day: 'numeric' }) : 'دائم'}
                      </p>
                    </div>
                  </div>

                  {(expired || maxed) && (
                    <div className="flex gap-2 flex-row-reverse">
                      {expired && <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-bold rounded-lg">منتهي الصلاحية</span>}
                      {maxed   && <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-xs font-bold rounded-lg">وصل الحد الأقصى</span>}
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-50 px-5 py-3 flex items-center justify-between flex-row-reverse">
                  <span className={`text-xs font-bold ${p.isActive && !expired && !maxed ? 'text-green-600' : 'text-gray-400'}`}>
                    {p.isActive && !expired && !maxed ? '✅ فعال' : '❌ غير فعال'}
                  </span>
                  <button onClick={() => toggleMut.mutate({ id: p.id, isActive: !p.isActive })}>
                    {p.isActive ? <ToggleRight size={28} className="text-green-500" /> : <ToggleLeft size={28} className="text-gray-400" />}
                  </button>
                </div>
              </div>
            );
          })}
          {(promos as any[]).length === 0 && (
            <div className="col-span-full text-center py-16 text-gray-400">
              <Tag size={40} className="mx-auto mb-2 opacity-30" />
              <p className="font-semibold">لا توجد أكواد خصم</p>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between flex-row-reverse p-6 border-b border-gray-100 sticky top-0 bg-white">
              <h3 className="font-black text-gray-800">{editPromo ? 'تعديل كود الخصم' : 'إضافة كود خصم'}</h3>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-xl"><X size={18} className="text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-4">

              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1.5 text-right">الكود *</label>
                <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="SAVE10" dir="ltr"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-primary text-sm text-center font-mono tracking-widest uppercase" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2 text-right">نوع الخصم *</label>
                <div className="flex gap-2 flex-row-reverse">
                  {[{ key: 'percent', label: 'نسبة % خصم' }, { key: 'fixed', label: 'مبلغ ثابت د.ع' }].map(t => (
                    <button key={t.key} onClick={() => setForm(f => ({ ...f, discountType: t.key as any }))}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${form.discountType === t.key ? 'bg-primary text-white border-primary' : 'border-gray-200 text-gray-600 hover:border-primary'}`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {form.discountType === 'percent' ? (
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1.5 text-right">نسبة الخصم % *</label>
                  <input type="number" min="1" max="100" value={form.discountPercent}
                    onChange={e => setForm(f => ({ ...f, discountPercent: e.target.value }))}
                    placeholder="10" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-primary text-sm text-right" />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1.5 text-right">مبلغ الخصم (دينار عراقي) *</label>
                  <input type="number" min="1" value={form.discountAmount}
                    onChange={e => setForm(f => ({ ...f, discountAmount: e.target.value }))}
                    placeholder="5000" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-primary text-sm text-right" />
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1.5 text-right">الحد الأدنى للطلب (اختياري)</label>
                <input type="number" value={form.minOrderAmount} onChange={e => setForm(f => ({ ...f, minOrderAmount: e.target.value }))}
                  placeholder="مثال: 20000" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-primary text-sm text-right" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1.5 text-right">الحد الأقصى للاستخدام (اختياري)</label>
                <input type="number" value={form.maxUses} onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))}
                  placeholder="مثال: 100" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-primary text-sm text-right" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1.5 text-right">تاريخ الانتهاء (اختياري)</label>
                <input type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-primary text-sm text-right" />
              </div>

              <button onClick={handleSave} disabled={saveMut.isPending}
                className="w-full bg-primary text-white py-3 rounded-xl font-bold text-sm hover:bg-primary-dark disabled:opacity-60 transition-colors">
                {saveMut.isPending ? 'جاري الحفظ...' : editPromo ? 'حفظ التعديلات' : 'إضافة الكود'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}