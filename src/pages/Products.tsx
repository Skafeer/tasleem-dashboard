// src/pages/Products.tsx
import { useState, useRef, ChangeEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Pencil, Trash2, Upload, Search, Eye, EyeOff, Image, X, FileUp,
  Star, StarOff, Link, ExternalLink, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import Papa from 'papaparse';
import api from '../api';

// ─── النموذج الفارغ ────────────────────────────────────────────
const EMPTY_FORM = {
  name: '',
  description: '',
  categories: [] as string[],
  companyWholesalePrice: '',
  wholesalePrice: '',
  suggestedPrice: '',
  sellingPriceMin: '',
  stock: '',
  discount: '',
  adLinks: [] as string[],
  images: [] as string[],
  isActive: true,
  isRenewable: false,
};

export default function Products() {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [uploadingImgs, setUploadingImgs] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'form' | 'csv'>('form');

  // ─── جلب البيانات ──────────────────────────────────────────────
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data } = await api.get('/api/products');
      return data as any[];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get('/api/categories');
      return data as any[];
    },
  });

  const refetch = () => qc.invalidateQueries({ queryKey: ['products'] });

  // ─── العمليات على المنتجات ────────────────────────────────────
  const saveMut = useMutation({
    mutationFn: async (body: any) => {
      const payload = {
        ...body,
        adLinks: body.adLinks.join(','),
      };
      if (editingId) {
        return api.put(`/api/products/${editingId}`, payload);
      }
      return api.post('/api/products', payload);
    },
    onSuccess: () => {
      refetch();
      closeModal();
      toast.success(editingId ? 'تم تحديث المنتج ✅' : 'تم إضافة المنتج ✅');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'حدث خطأ'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/api/products/${id}`),
    onSuccess: () => {
      refetch();
      toast.success('تم الحذف');
    },
    onError: () => toast.error('فشل الحذف'),
  });

  const toggleActiveMut = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      api.put(`/api/products/${id}`, { isActive }),
    onSuccess: () => refetch(),
    onError: () => toast.error('فشل تغيير الحالة'),
  });

  // ─── دوال النموذج ─────────────────────────────────────────────
  const openAdd = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setActiveTab('form');
    setShowModal(true);
  };

  const openEdit = (p: any) => {
    setEditingId(p.id);
    const adLinksArray = p.adLinks
      ? p.adLinks.split(',').filter(Boolean).map((link: string) => link.trim())
      : [];
    setForm({
      name: p.name || '',
      description: p.description || '',
      categories: p.category ? p.category.split(',').filter(Boolean) : [],
      companyWholesalePrice: String(p.companyWholesalePrice || ''),
      wholesalePrice: String(p.wholesalePrice || ''),
      suggestedPrice: String(p.suggestedPrice || ''),
      sellingPriceMin: String(p.sellingPriceMin || ''),
      stock: String(p.stock || ''),
      discount: String(p.discount || ''),
      adLinks: adLinksArray,
      images: p.images ? p.images.split(',').filter(Boolean) : [],
      isActive: p.isActive !== false,
      isRenewable: !!p.isRenewable,
    });
    setActiveTab('form');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
  };

  const handleSave = () => {
    if (!form.name.trim()) return toast.error('اسم المنتج مطلوب');
    if (!form.wholesalePrice || Number(form.wholesalePrice) <= 0)
      return toast.error('سعر الجملة مطلوب');
    if (!form.suggestedPrice || Number(form.suggestedPrice) <= 0)
      return toast.error('السعر المقترح مطلوب');
    if (!form.stock || Number(form.stock) < 0) return toast.error('المخزون مطلوب');

    const minPrice = form.sellingPriceMin.trim()
      ? Number(form.sellingPriceMin)
      : Number(form.wholesalePrice);

    saveMut.mutate({
      name: form.name.trim(),
      description: form.description,
      category: form.categories.join(',') || 'عام',
      companyWholesalePrice: Number(form.companyWholesalePrice) || 0,
      wholesalePrice: Number(form.wholesalePrice),
      suggestedPrice: Number(form.suggestedPrice),
      sellingPriceMin: minPrice,
      stock: Number(form.stock),
      discount: Number(form.discount) || 0,
      adLinks: form.adLinks,
      images: form.images.join(','),
      isActive: form.isActive,
      isRenewable: form.isRenewable,
    });
  };

  // ─── إدارة الروابط الإعلانية ──────────────────────────────────
  const addAdLink = () => {
    if (form.adLinks.length >= 10) {
      toast.error('الحد الأقصى 10 روابط');
      return;
    }
    setForm(prev => ({ ...prev, adLinks: [...prev.adLinks, ''] }));
  };

  const updateAdLink = (index: number, value: string) => {
    const newLinks = [...form.adLinks];
    newLinks[index] = value;
    setForm(prev => ({ ...prev, adLinks: newLinks }));
  };

  const removeAdLink = (index: number) => {
    if (form.adLinks.length <= 1) {
      toast.error('يجب أن يكون هناك رابط واحد على الأقل');
      return;
    }
    const newLinks = form.adLinks.filter((_, i) => i !== index);
    setForm(prev => ({ ...prev, adLinks: newLinks }));
  };

  // ─── رفع الصور ──────────────────────────────────────────────────
  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || form.images.length >= 10) {
      toast.error('الحد الأقصى 10 صور');
      return;
    }
    setUploadingImgs(true);
    const urls: string[] = [];
    for (const file of Array.from(files).slice(0, 10 - form.images.length)) {
      try {
        const base64 = await toBase64(file);
        const { data } = await api.post('/api/upload', {
          image: `data:${file.type};base64,${base64}`,
        });
        if (data?.url) urls.push(data.url);
      } catch {
        toast.error(`فشل رفع ${file.name}`);
      }
    }
    if (urls.length > 0) {
      setForm(f => ({ ...f, images: [...f.images, ...urls] }));
      toast.success(`تم رفع ${urls.length} صورة ✅`);
    }
    setUploadingImgs(false);
    e.target.value = '';
  };

  const toBase64 = (file: File): Promise<string> =>
    new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res((r.result as string).split(',')[1]);
      r.onerror = rej;
      r.readAsDataURL(file);
    });

  const setMainImage = (index: number) => {
    if (index === 0) return;
    const newImgs = [...form.images];
    const [img] = newImgs.splice(index, 1);
    newImgs.unshift(img);
    setForm(prev => ({ ...prev, images: newImgs }));
  };

  // ─── رفع CSV ────────────────────────────────────────────────────
  const handleCSV = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvLoading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];
        let success = 0,
          failed = 0;
        for (const row of rows) {
          try {
            await api.post('/api/products', {
              name: row.name || row.الاسم || '',
              description: row.description || row.الوصف || '',
              category: row.category || row.الفئة || 'عام',
              companyWholesalePrice: Number(row.companyWholesalePrice || row.سعر_الشركة || 0),
              wholesalePrice: Number(row.wholesalePrice || row.سعر_الجملة || 0),
              suggestedPrice: Number(row.suggestedPrice || row.السعر_المقترح || 0),
              sellingPriceMin: Number(row.sellingPriceMin || row.أدنى_سعر || 0),
              stock: Number(row.stock || row.المخزون || 0),
              discount: Number(row.discount || row.الخصم || 0),
              adLinks: row.adLinks || row.الروابط || '',
              images: row.images || row.الصور || '',
              isActive: true,
              isRenewable: row.isRenewable === 'true' || row.قابل_للتجديد === 'نعم' || false,
            });
            success++;
          } catch {
            failed++;
          }
        }
        toast.success(`تم رفع ${success} منتج${failed > 0 ? ` — فشل ${failed}` : ''}`);
        refetch();
        setCsvLoading(false);
        e.target.value = '';
      },
      error: () => {
        toast.error('فشل قراءة الملف');
        setCsvLoading(false);
      },
    });
  };

  // ─── الفلترة ────────────────────────────────────────────────────
  const filtered = (products as any[]).filter((p: any) => {
    const matchSearch =
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase()) ||
      (p.category || '').includes(search);
    const matchCategory =
      selectedCategory === 'الكل' ||
      (p.category && p.category.split(',').includes(selectedCategory));
    return matchSearch && matchCategory;
  });

  const categoryOptions = ['الكل', ...categories.map((c: any) => c.name)];

  return (
    <div className="p-8">
      {/* ─── الهيدر ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="text-right">
          <h1 className="text-2xl font-black text-gray-800">المنتجات</h1>
          <p className="text-gray-500 text-sm mt-1">
            {products.length} منتج
            {filtered.length !== products.length && (
              <span className="mr-2 text-primary">
                (تم عرض {filtered.length})
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-dark transition"
          >
            <Plus size={18} /> إضافة منتج
          </button>
          <button
            onClick={() => {
              setActiveTab('csv');
              setShowModal(true);
            }}
            className="flex items-center gap-2 bg-white border-2 border-primary text-primary px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary/5 transition"
          >
            <FileUp size={18} /> رفع CSV
          </button>
        </div>
      </div>

      {/* ─── البحث والفلترة ────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-4 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث عن منتج..."
            className="w-full pr-10 pl-4 py-3 rounded-xl border border-gray-200 bg-white text-right outline-none focus:border-primary text-sm"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categoryOptions.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ─── جدول المنتجات ────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 font-semibold border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3">الصورة</th>
                  <th className="px-4 py-3">الاسم</th>
                  <th className="px-4 py-3">الفئة</th>
                  <th className="px-4 py-3">سعر الجملة</th>
                  <th className="px-4 py-3">السعر المقترح</th>
                  <th className="px-4 py-3">المخزون</th>
                  <th className="px-4 py-3">قابل للتجديد</th>
                  <th className="px-4 py-3">الحالة</th>
                  <th className="px-4 py-3">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((p: any) => {
                  const imgs = p.images ? p.images.split(',').filter(Boolean) : [];
                  const cats = p.category ? p.category.split(',').filter(Boolean) : [];
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        {imgs[0] ? (
                          <img
                            src={imgs[0]}
                            alt={p.name}
                            className="w-12 h-12 rounded-xl object-cover border border-gray-100"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                            <Image size={18} className="text-gray-300" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-800 max-w-[200px] truncate">
                        {p.name}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-primary/10 text-primary rounded-lg text-xs font-semibold">
                          {cats[0] || '—'}
                        </span>
                        {cats.length > 1 && (
                          <span className="text-[10px] text-gray-400 mr-1">
                            +{cats.length - 1}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-700">
                        {p.wholesalePrice?.toLocaleString()} د.ع
                      </td>
                      <td className="px-4 py-3 font-bold text-primary">
                        {p.suggestedPrice?.toLocaleString()} د.ع
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded-lg text-xs font-bold ${
                            p.stock === 0
                              ? 'bg-red-100 text-red-600'
                              : p.stock < 10
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {p.stock}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {p.isRenewable ? (
                          <Star size={16} className="text-amber-500 fill-amber-500" />
                        ) : (
                          <StarOff size={16} className="text-gray-300" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() =>
                            toggleActiveMut.mutate({
                              id: p.id,
                              isActive: !p.isActive,
                            })
                          }
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                            p.isActive
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          {p.isActive ? <Eye size={13} /> : <EyeOff size={13} />}
                          {p.isActive ? 'نشط' : 'مخفي'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEdit(p)}
                            className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`حذف "${p.name}"؟`)) deleteMut.mutate(p.id);
                            }}
                            className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <p className="text-lg font-semibold">لا توجد منتجات</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── مودال الإضافة / التعديل ──────────────────────────── */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            {/* الهيدر */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-black text-gray-800">
                {activeTab === 'csv'
                  ? 'رفع منتجات من CSV'
                  : editingId
                  ? 'تعديل المنتج'
                  : 'إضافة منتج جديد'}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 rounded-xl hover:bg-gray-100 transition"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* تبويبات (إذا لم يكن تعديل) */}
            {!editingId && (
              <div className="flex gap-2 p-4 pb-0">
                <button
                  onClick={() => setActiveTab('form')}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold transition ${
                    activeTab === 'form'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  إضافة يدوي
                </button>
                <button
                  onClick={() => setActiveTab('csv')}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold transition ${
                    activeTab === 'csv'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  رفع CSV
                </button>
              </div>
            )}

            <div className="p-6">
              {/* ─── محتوى CSV ────────────────────────────────── */}
              {activeTab === 'csv' && (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center">
                    <FileUp size={40} className="mx-auto text-gray-300 mb-3" />
                    <p className="font-semibold text-gray-600 mb-1">ارفع ملف CSV</p>
                    <p className="text-xs text-gray-400 mb-4">
                      الحقول: name, wholesalePrice, suggestedPrice, stock, category,
                      description, adLinks, isRenewable
                    </p>
                    <input
                      ref={csvInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleCSV}
                      className="hidden"
                    />
                    <button
                      onClick={() => csvInputRef.current?.click()}
                      disabled={csvLoading}
                      className="bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-dark disabled:opacity-60"
                    >
                      {csvLoading ? 'جاري الرفع...' : 'اختر ملف CSV'}
                    </button>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 text-right">
                    <p className="text-xs font-bold text-gray-600 mb-2">
                      نموذج الحقول المدعومة:
                    </p>
                    <code className="text-xs text-primary block leading-6">
                      name, description, category, wholesalePrice, suggestedPrice,<br />
                      sellingPriceMin, stock, discount, adLinks, images, isRenewable
                    </code>
                  </div>
                </div>
              )}

              {/* ─── محتوى النموذج ────────────────────────────── */}
              {activeTab === 'form' && (
                <div className="space-y-6">
                  {/* حالة المنتج */}
                  <div className="flex flex-wrap gap-4 bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-gray-700">نشط</span>
                      <button
                        onClick={() =>
                          setForm((f) => ({ ...f, isActive: !f.isActive }))
                        }
                        className={`w-12 h-6 rounded-full transition-colors relative ${
                          form.isActive ? 'bg-primary' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                            form.isActive ? 'right-1' : 'right-7'
                          }`}
                        />
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-gray-700">قابل للتجديد</span>
                      <button
                        onClick={() =>
                          setForm((f) => ({ ...f, isRenewable: !f.isRenewable }))
                        }
                        className={`w-12 h-6 rounded-full transition-colors relative ${
                          form.isRenewable ? 'bg-amber-500' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                            form.isRenewable ? 'right-1' : 'right-7'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* الاسم */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1.5 text-right">
                      اسم المنتج *
                    </label>
                    <input
                      value={form.name}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, name: e.target.value }))
                      }
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-right outline-none focus:border-primary text-sm"
                      placeholder="مثال: سماعة Anker R50i"
                    />
                  </div>

                  {/* الوصف */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1.5 text-right">
                      الوصف
                    </label>
                    <textarea
                      value={form.description}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, description: e.target.value }))
                      }
                      rows={3}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-right outline-none focus:border-primary text-sm resize-none"
                      placeholder="وصف المنتج..."
                    />
                  </div>

                  {/* الفئات */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1.5 text-right">
                      الفئات (اختر واحداً أو أكثر)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {categories.map((cat: any) => (
                        <button
                          key={cat.id}
                          onClick={() =>
                            setForm((f) => ({
                              ...f,
                              categories: f.categories.includes(cat.name)
                                ? f.categories.filter((c) => c !== cat.name)
                                : [...f.categories, cat.name],
                            }))
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                            form.categories.includes(cat.name)
                              ? 'bg-primary text-white border-primary'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-primary'
                          }`}
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* الأسعار */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      {
                        label: 'سعر شركة التوصيل',
                        key: 'companyWholesalePrice',
                      },
                      { label: 'سعر الجملة *', key: 'wholesalePrice' },
                      { label: 'السعر المقترح *', key: 'suggestedPrice' },
                      { label: 'أدنى سعر بيع', key: 'sellingPriceMin' },
                    ].map(({ label, key }) => (
                      <div key={key}>
                        <label className="block text-xs font-semibold text-gray-500 mb-1 text-right">
                          {label}
                        </label>
                        <input
                          type="number"
                          value={(form as any)[key]}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, [key]: e.target.value }))
                          }
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-right outline-none focus:border-primary text-sm"
                        />
                      </div>
                    ))}
                  </div>

                  {/* المخزون والخصم */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1 text-right">
                        المخزون *
                      </label>
                      <input
                        type="number"
                        value={form.stock}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, stock: e.target.value }))
                        }
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-right outline-none focus:border-primary text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1 text-right">
                        الخصم %
                      </label>
                      <input
                        type="number"
                        value={form.discount}
                        min="0"
                        max="100"
                        onChange={(e) =>
                          setForm((f) => ({ ...f, discount: e.target.value }))
                        }
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-right outline-none focus:border-primary text-sm"
                      />
                    </div>
                  </div>

                  {/* الروابط الإعلانية */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-sm font-semibold text-gray-600 text-right">
                        الروابط الإعلانية ({form.adLinks.length}/10)
                      </label>
                      <button
                        onClick={addAdLink}
                        disabled={form.adLinks.length >= 10}
                        className="text-xs font-bold text-primary hover:underline disabled:opacity-50"
                      >
                        + إضافة رابط
                      </button>
                    </div>
                    {form.adLinks.map((link, idx) => (
                      <div key={idx} className="flex items-center gap-2 mb-2">
                        <input
                          type="url"
                          value={link}
                          onChange={(e) => updateAdLink(idx, e.target.value)}
                          placeholder={`رابط ${idx + 1}`}
                          className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-right outline-none focus:border-primary text-sm"
                        />
                        <button
                          onClick={() => removeAdLink(idx)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                    {form.adLinks.length === 0 && (
                      <p className="text-xs text-gray-400 text-right">
                        لا توجد روابط إعلانية
                      </p>
                    )}
                  </div>

                  {/* الصور */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1.5 text-right">
                      الصور ({form.images.length}/10)
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <div className="flex flex-wrap gap-3 mb-2">
                      {form.images.map((url, idx) => (
                        <div key={idx} className="relative group">
                          <img
                            src={url}
                            alt={`صورة ${idx + 1}`}
                            className={`w-20 h-20 rounded-xl object-cover border-2 transition ${
                              idx === 0 ? 'border-amber-500' : 'border-gray-200'
                            }`}
                          />
                          {idx === 0 && (
                            <span className="absolute top-0 left-0 bg-amber-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-br-lg rounded-tl-lg">
                              رئيسية
                            </span>
                          )}
                          <button
                            onClick={() => setMainImage(idx)}
                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center rounded-xl text-white text-xs font-bold"
                          >
                            تعيين رئيسية
                          </button>
                          <button
                            onClick={() =>
                              setForm((f) => ({
                                ...f,
                                images: f.images.filter((_, i) => i !== idx),
                              }))
                            }
                            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                      {form.images.length < 10 && (
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingImgs}
                          className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-primary hover:text-primary transition disabled:opacity-60"
                        >
                          {uploadingImgs ? (
                            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              <Upload size={18} />
                              <span className="text-xs mt-1">رفع</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* زر الحفظ */}
                  <button
                    onClick={handleSave}
                    disabled={saveMut.isPending}
                    className="w-full bg-primary text-white py-3 rounded-xl font-bold text-sm hover:bg-primary-dark disabled:opacity-60 transition"
                  >
                    {saveMut.isPending
                      ? 'جاري الحفظ...'
                      : editingId
                      ? 'حفظ التعديلات'
                      : 'إضافة المنتج'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}