import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, X, Eye, EyeOff, Grid } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api';

// Lucide icons mapping بديل عن Ionicons
const ICONS = [
  { key: 'grid-outline',            label: 'عام',         emoji: '📦' },
  { key: 'phone-portrait-outline',  label: 'إلكترونيات',  emoji: '📱' },
  { key: 'home-outline',            label: 'منزل',         emoji: '🏠' },
  { key: 'shirt-outline',           label: 'ملابس',        emoji: '👕' },
  { key: 'rose-outline',            label: 'اكسسوارات',   emoji: '💍' },
  { key: 'book-outline',            label: 'كتب',          emoji: '📚' },
  { key: 'bicycle-outline',         label: 'رياضة',        emoji: '🏋️' },
  { key: 'flower-outline',          label: 'عطور',         emoji: '🌸' },
  { key: 'nutrition-outline',       label: 'غذاء',         emoji: '🥗' },
  { key: 'construct-outline',       label: 'أدوات',        emoji: '🔧' },
  { key: 'sparkles-outline',        label: 'تجميل',        emoji: '✨' },
  { key: 'car-outline',             label: 'سيارات',       emoji: '🚗' },
  { key: 'game-controller-outline', label: 'ألعاب',        emoji: '🎮' },
  { key: 'paw-outline',             label: 'حيوانات',      emoji: '🐾' },
  { key: 'briefcase-outline',       label: 'مكتب',         emoji: '💼' },
  { key: 'laptop-outline',          label: 'كمبيوتر',      emoji: '💻' },
];

const getEmoji = (key: string) => ICONS.find(i => i.key === key)?.emoji || '📦';

export default function Categories() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem]   = useState<any>(null);
  const [form, setForm]           = useState({ name: '', icon: 'grid-outline', sortOrder: '0' });

  const { data: cats = [], isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => { const { data } = await api.get('/api/categories'); return data as any[]; },
  });

  const refetch = () => qc.invalidateQueries({ queryKey: ['admin-categories'] });

  const createMut = useMutation({
    mutationFn: async (body: any) => { const { data } = await api.post('/api/categories', body); return data; },
    onSuccess: () => { refetch(); closeModal(); toast.success('تمت الإضافة ✅'); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'حدث خطأ'),
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, body }: any) => { const { data } = await api.patch(`/api/categories/${id}`, body); return data; },
    onSuccess: () => { refetch(); closeModal(); toast.success('تم التحديث ✅'); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'حدث خطأ'),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: number) => api.delete(`/api/categories/${id}`),
    onSuccess: () => { refetch(); toast.success('تم الحذف'); },
    onError: () => toast.error('فشل الحذف'),
  });

  const openAdd = () => {
    setEditItem(null);
    setForm({ name: '', icon: 'grid-outline', sortOrder: String((cats as any[]).length) });
    setShowModal(true);
  };

  const openEdit = (cat: any) => {
    setEditItem(cat);
    setForm({ name: cat.name, icon: cat.icon, sortOrder: String(cat.sortOrder) });
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditItem(null); };

  const handleSave = () => {
    if (!form.name.trim()) return toast.error('اسم الفئة مطلوب');
    const body = { name: form.name.trim(), icon: form.icon, sortOrder: Number(form.sortOrder) };
    if (editItem) updateMut.mutate({ id: editItem.id, body });
    else createMut.mutate(body);
  };

  const toggleActive = (cat: any) => {
    updateMut.mutate({ id: cat.id, body: { isActive: !cat.isActive } });
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-row-reverse mb-6">
        <div className="text-right">
          <h1 className="text-2xl font-black text-gray-800">الفئات</h1>
          <p className="text-gray-500 text-sm mt-1">{(cats as any[]).length} فئة</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 flex-row-reverse bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-dark transition-colors">
          <Plus size={18} /> إضافة فئة
        </button>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {(cats as any[]).map((cat: any) => (
            <div key={cat.id}
              className={`bg-white rounded-2xl border p-5 shadow-sm transition-all ${cat.isActive ? 'border-gray-100' : 'border-gray-100 opacity-60'}`}>
              {/* Icon + Name */}
              <div className="flex items-center gap-3 flex-row-reverse mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${cat.isActive ? 'bg-primary/10' : 'bg-gray-100'}`}>
                  {getEmoji(cat.icon)}
                </div>
                <div className="text-right flex-1 min-w-0">
                  <p className={`font-bold text-base truncate ${cat.isActive ? 'text-gray-800' : 'text-gray-400'}`}>{cat.name}</p>
                  <p className="text-xs text-gray-400">ترتيب: {cat.sortOrder}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-row-reverse">
                <button onClick={() => toggleActive(cat)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-colors ${
                    cat.isActive ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                  {cat.isActive ? <Eye size={13} /> : <EyeOff size={13} />}
                  {cat.isActive ? 'نشط' : 'مخفي'}
                </button>
                <button onClick={() => openEdit(cat)}
                  className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                  <Pencil size={15} />
                </button>
                <button onClick={() => { if (confirm(`حذف "${cat.name}"؟`)) deleteMut.mutate(cat.id); }}
                  className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}

          {(cats as any[]).length === 0 && (
            <div className="col-span-4 text-center py-16 text-gray-400">
              <Grid size={48} className="mx-auto mb-2 opacity-30" />
              <p className="font-semibold">لا توجد فئات — أضف فئة جديدة</p>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between flex-row-reverse p-6 border-b border-gray-100 sticky top-0 bg-white">
              <h3 className="font-black text-gray-800">{editItem ? 'تعديل الفئة' : 'فئة جديدة'}</h3>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-xl">
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* الاسم */}
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1.5 text-right">اسم الفئة *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="مثال: إلكترونيات" dir="rtl"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-primary text-sm text-right" />
              </div>

              {/* الترتيب */}
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1.5 text-right">الترتيب</label>
                <input type="number" value={form.sortOrder}
                  onChange={e => setForm(f => ({ ...f, sortOrder: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-primary text-sm text-right" />
              </div>

              {/* الأيقونة */}
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2 text-right">الأيقونة</label>
                <div className="grid grid-cols-4 gap-2">
                  {ICONS.map(ico => (
                    <button key={ico.key} onClick={() => setForm(f => ({ ...f, icon: ico.key }))}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                        form.icon === ico.key
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-100 hover:border-gray-300'}`}>
                      <span className="text-2xl">{ico.emoji}</span>
                      <span className="text-xs text-gray-500">{ico.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={handleSave}
                disabled={createMut.isPending || updateMut.isPending}
                className="w-full bg-primary text-white py-3 rounded-xl font-bold text-sm hover:bg-primary-dark disabled:opacity-60 transition-colors">
                {createMut.isPending || updateMut.isPending ? 'جاري الحفظ...' : editItem ? 'حفظ التعديلات' : 'إضافة الفئة'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
