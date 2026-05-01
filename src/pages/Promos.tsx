import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, X, Tag, Percent, DollarSign, Calendar, ShoppingBag, Hash, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api';

// أنواع الخصم
const DISCOUNT_TYPES = [
  { value: 'percentage', label: 'نسبة مئوية (%)', icon: Percent, color: '#f59e0b', bg: '#fffbeb' },
  { value: 'fixed', label: 'قيمة ثابتة (د.ع)', icon: DollarSign, color: '#10b981', bg: '#ecfdf5' },
];

const formatDate = (d: string) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ar-IQ', { year: 'numeric', month: 'short', day: 'numeric' });
};

const copyText = (text: string, label: string) => {
  navigator.clipboard.writeText(text);
  toast.success(`تم نسخ ${label}`);
};

export default function Promos() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editPromo, setEditPromo] = useState<any>(null);
  const [form, setForm] = useState({
    code: '',
    discountType: 'percentage',
    discountValue: '',
    minOrderAmount: '',
    maxUses: '',
    expiresAt: '',
  });

  // جلب الأكواد
  const { data: promos = [], isLoading } = useQuery({
    queryKey: ['promo-codes'],
    queryFn: async () => {
      const { data } = await api.get('/api/promo-codes');
      return data as any[];
    },
  });

  // حفظ (إضافة أو تعديل)
  const savePromo = useMutation({
    mutationFn: async (payload: any) => {
      if (editPromo) {
        const { data } = await api.patch(`/api/promo-codes/${editPromo.id}`, payload);
        return data;
      }
      const { data } = await api.post('/api/promo-codes', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['promo-codes'] });
      toast.success(editPromo ? 'تم تعديل الكود ✅' : 'تم إضافة الكود ✅');
      closeModal();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'فشل الحفظ'),
  });

  // تفعيل / تعطيل
  const togglePromo = useMutation({
    mutationFn: async ({ id, isActive }: any) => {
      const { data } = await api.patch(`/api/promo-codes/${id}`, { isActive });
      return data;
    },
    onSuccess: (_: any, vars: any) => {
      qc.invalidateQueries({ queryKey: ['promo-codes'] });
      toast.success(vars.isActive ? '✅ تم تفعيل الكود' : '❌ تم تعطيل الكود');
    },
    onError: () => toast.error('فشل تحديث الحالة'),
  });

  // حذف
  const deletePromo = useMutation({
    mutationFn: async (id: number) => api.delete(`/api/promo-codes/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['promo-codes'] });
      toast.success('تم حذف الكود');
    },
    onError: () => toast.error('فشل الحذف'),
  });

  const openAdd = () => {
    setEditPromo(null);
    setForm({
      code: '',
      discountType: 'percentage',
      discountValue: '',
      minOrderAmount: '',
      maxUses: '',
      expiresAt: '',
    });
    setShowModal(true);
  };

  const openEdit = (p: any) => {
    setEditPromo(p);
    setForm({
      code: p.code,
      discountType: p.discountType || 'percentage',
      discountValue: String(p.discountValue || ''),
      minOrderAmount: String(p.minOrderAmount || ''),
      maxUses: String(p.maxUses || ''),
      expiresAt: p.expiresAt ? p.expiresAt.slice(0, 16) : '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditPromo(null);
  };

  const handleSave = () => {
    if (!form.code.trim()) {
      toast.error('يرجى إدخال الكود');
      return;
    }
    if (!form.discountValue.trim()) {
      toast.error('يرجى إدخال قيمة الخصم');
      return;
    }

    const discountVal = Number(form.discountValue);
    if (isNaN(discountVal) || discountVal <= 0) {
      toast.error('قيمة الخصم يجب أن تكون أكبر من 0');
      return;
    }

    if (form.discountType === 'percentage' && discountVal > 100) {
      toast.error('نسبة الخصم لا يمكن أن تتجاوز 100%');
      return;
    }

    const payload: any = {
      code: form.code.toUpperCase(),
      discountType: form.discountType,
      discountValue: discountVal,
    };

    if (form.minOrderAmount) {
      const minVal = Number(form.minOrderAmount);
      if (!isNaN(minVal) && minVal > 0) payload.minOrderAmount = minVal;
    }

    if (form.maxUses) {
      const maxVal = Number(form.maxUses);
      if (!isNaN(maxVal) && maxVal > 0) payload.maxUses = maxVal;
    }

    if (form.expiresAt) {
      payload.expiresAt = new Date(form.expiresAt).toISOString();
    }

    savePromo.mutate(payload);
  };

  // التحقق من صلاحية الكود
  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  // معرفة أيقونة الخصم
  const getDiscountDisplay = (p: any) => {
    const type = p.discountType || 'percentage';
    const value = p.discountValue || 0;
    if (type === 'fixed') {
      return `${value.toLocaleString()} د.ع`;
    }
    return `${value}%`;
  };

  return (
    <div className="p-8" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-row-reverse mb-6">
        <div className="text-right">
          <h1 className="text-2xl font-black text-gray-800">أكواد الخصم</h1>
          <p className="text-gray-500 text-sm mt-1">{promos.length} كود خصم</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 flex-row-reverse bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-dark transition-colors"
        >
          <Plus size={18} /> إضافة كود خصم
        </button>
      </div>

      {/* القائمة */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {promos.map((p: any) => {
            const expired = isExpired(p.expiresAt);
            const isInactive = !p.isActive || expired;

            return (
              <div
                key={p.id}
                className={`bg-white rounded-2xl border p-5 shadow-sm transition-all ${
                  isInactive ? 'border-gray-100 opacity-60' : 'border-gray-100'
                }`}
              >
                {/* رأس الكارد - الكود ونوع الخصم */}
                <div className="flex items-center justify-between flex-row-reverse mb-4">
                  <div className="flex items-center gap-3 flex-row-reverse">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        p.isActive && !expired ? 'bg-amber-50' : 'bg-gray-100'
                      }`}
                    >
                      <Tag size={24} className={p.isActive && !expired ? 'text-amber-500' : 'text-gray-400'} />
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 flex-row-reverse">
                        <p className={`font-bold text-lg ${isInactive ? 'text-gray-400' : 'text-gray-800'}`}>
                          {p.code}
                        </p>
                        <button
                          onClick={() => copyText(p.code, 'الكود')}
                          className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-primary transition-colors"
                        >
                          <Copy size={13} />
                        </button>
                      </div>
                      <p className={`text-sm font-semibold ${p.discountType === 'fixed' ? 'text-green-600' : 'text-amber-600'}`}>
                        {p.discountType === 'fixed' ? '💰' : '🎯'} خصم: {getDiscountDisplay(p)}
                      </p>
                    </div>
                  </div>

                  {/* أزرار الإجراءات */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(p)}
                      className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`حذف كود "${p.code}"؟`)) deletePromo.mutate(p.id);
                      }}
                      className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* شروط الاستخدام */}
                <div className="space-y-2 mb-4 border-t border-gray-100 pt-3">
                  {p.minOrderAmount > 0 && (
                    <div className="flex items-center justify-between flex-row-reverse text-sm">
                      <span className="text-gray-500 flex items-center gap-1">
                        <ShoppingBag size={14} /> الحد الأدنى:
                      </span>
                      <span className="font-semibold text-gray-700">{p.minOrderAmount.toLocaleString()} د.ع</span>
                    </div>
                  )}
                  {p.maxUses > 0 && (
                    <div className="flex items-center justify-between flex-row-reverse text-sm">
                      <span className="text-gray-500 flex items-center gap-1">
                        <Hash size={14} /> عدد الاستخدامات:
                      </span>
                      <span className="font-semibold text-gray-700">{p.usedCount || 0} / {p.maxUses}</span>
                    </div>
                  )}
                  {p.expiresAt && (
                    <div className="flex items-center justify-between flex-row-reverse text-sm">
                      <span className="text-gray-500 flex items-center gap-1">
                        <Calendar size={14} /> ينتهي في:
                      </span>
                      <span className={`font-semibold ${expired ? 'text-red-500' : 'text-gray-700'}`}>
                        {formatDate(p.expiresAt)}
                        {expired && ' (منتهي)'}
                      </span>
                    </div>
                  )}
                </div>

                {/* زر التفعيل */}
                <button
                  onClick={() => togglePromo.mutate({ id: p.id, isActive: !p.isActive })}
                  disabled={expired}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                    p.isActive && !expired
                      ? 'bg-green-50 text-green-600 hover:bg-green-100'
                      : 'bg-gray-100 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {p.isActive && !expired ? '✅ نشط' : expired ? '⏰ منتهي الصلاحية' : '❌ معطل'}
                </button>
              </div>
            );
          })}

          {promos.length === 0 && (
            <div className="col-span-3 text-center py-16 text-gray-400">
              <Tag size={48} className="mx-auto mb-2 opacity-30" />
              <p className="font-semibold">لا توجد أكواد خصم — أضف كوداً جديداً</p>
            </div>
          )}
        </div>
      )}

      {/* Modal الإضافة / التعديل */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between flex-row-reverse p-6 border-b border-gray-100 sticky top-0 bg-white">
              <h3 className="font-black text-gray-800">{editPromo ? 'تعديل كود الخصم' : 'إضافة كود خصم'}</h3>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-xl">
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* الكود */}
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1.5 text-right">
                  كود الخصم *
                </label>
                <input
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="مثال: SAVE10"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-primary text-sm text-right font-mono"
                />
              </div>

              {/* نوع الخصم */}
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2 text-right">نوع الخصم</label>
                <div className="grid grid-cols-2 gap-3">
                  {DISCOUNT_TYPES.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setForm((f) => ({ ...f, discountType: type.value }))}
                      className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                        form.discountType === type.value
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <type.icon size={18} className={form.discountType === type.value ? 'text-primary' : 'text-gray-400'} />
                      <span className={`text-sm font-semibold ${form.discountType === type.value ? 'text-primary' : 'text-gray-600'}`}>
                        {type.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* قيمة الخصم */}
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1.5 text-right">
                  {form.discountType === 'percentage' ? 'نسبة الخصم % *' : 'قيمة الخصم (د.ع) *'}
                </label>
                <input
                  type="number"
                  value={form.discountValue}
                  onChange={(e) => setForm((f) => ({ ...f, discountValue: e.target.value }))}
                  placeholder={form.discountType === 'percentage' ? 'مثال: 15' : 'مثال: 5000'}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-primary text-sm text-right"
                />
              </div>

              {/* الحد الأدنى للطلب */}
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1.5 text-right">
                  الحد الأدنى للطلب (د.ع) - اختياري
                </label>
                <input
                  type="number"
                  value={form.minOrderAmount}
                  onChange={(e) => setForm((f) => ({ ...f, minOrderAmount: e.target.value }))}
                  placeholder="مثال: 20000"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-primary text-sm text-right"
                />
              </div>

              {/* عدد مرات الاستخدام */}
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1.5 text-right">
                  الحد الأقصى للاستخدام - اختياري
                </label>
                <input
                  type="number"
                  value={form.maxUses}
                  onChange={(e) => setForm((f) => ({ ...f, maxUses: e.target.value }))}
                  placeholder="مثال: 100"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-primary text-sm text-right"
                />
              </div>

              {/* تاريخ الانتهاء */}
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1.5 text-right">
                  تاريخ الانتهاء - اختياري
                </label>
                <input
                  type="datetime-local"
                  value={form.expiresAt}
                  onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-primary text-sm text-right"
                />
              </div>

              <button
                onClick={handleSave}
                disabled={savePromo.isPending}
                className="w-full bg-primary text-white py-3 rounded-xl font-bold text-sm hover:bg-primary-dark disabled:opacity-60 transition-colors"
              >
                {savePromo.isPending ? 'جاري الحفظ...' : editPromo ? 'حفظ التعديلات' : 'إضافة الكود'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}