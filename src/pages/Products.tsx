import { useState, useRef, ChangeEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Upload, Search, Eye, EyeOff, Image, X, FileUp } from 'lucide-react';
import toast from 'react-hot-toast';
import Papa from 'papaparse';
import api from '../api';

const EMPTY_FORM = {
  name: '', description: '', categories: [] as string[],
  companyWholesalePrice: '', wholesalePrice: '', suggestedPrice: '',
  sellingPriceMin: '', stock: '', discount: '', adLinks: '',
  images: [] as string[], isActive: true,
};

export default function Products() {
  const qc = useQueryClient();
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const csvInputRef   = useRef<HTMLInputElement>(null);
  const [search, setSearch]               = useState('');
  const [showModal, setShowModal]         = useState(false);
  const [editingId, setEditingId]         = useState<number | null>(null);
  const [form, setForm]                   = useState({ ...EMPTY_FORM });
  const [uploadingImgs, setUploadingImgs] = useState(false);
  const [csvLoading, setCsvLoading]       = useState(false);
  const [activeTab, setActiveTab]         = useState<'form' | 'csv'>('form');

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => { const { data } = await api.get('/api/products'); return data as any[]; },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => { const { data } = await api.get('/api/categories'); return data as any[]; },
  });

  const refetch = () => qc.invalidateQueries({ queryKey: ['products'] });

  const saveMut = useMutation({
    mutationFn: async (body: any) => {
      if (editingId) return api.put(`/api/products/${editingId}`, body);
      return api.post('/api/products', body);
    },
    onSuccess: () => { refetch(); closeModal(); toast.success(editingId ? 'تم تحديث المنتج' : 'تم إضافة المنتج ✅'); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'حدث خطأ'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/api/products/${id}`),
    onSuccess: () => { refetch(); toast.success('تم الحذف'); },
    onError: () => toast.error('فشل الحذف'),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      api.put(`/api/products/${id}`, { isActive }),
    onSuccess: () => refetch(),
  });

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setActiveTab('form');
    setShowModal(true);
  };

  const openEdit = (p: any) => {
    setEditingId(p.id);
    setForm({
      name: p.name || '', description: p.description || '',
      categories: p.category ? p.category.split(',').filter(Boolean) : [],
      companyWholesalePrice: String(p.companyWholesalePrice || ''),
      wholesalePrice: String(p.wholesalePrice || ''),
      suggestedPrice: String(p.suggestedPrice || ''),
      sellingPriceMin: String(p.sellingPriceMin || ''),
      stock: String(p.stock || ''), discount: String(p.discount || ''),
      adLinks: p.adLinks || '',
      images: p.images ? p.images.split(',').filter(Boolean) : [],
      isActive: p.isActive !== false,
    });
    setActiveTab('form');
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditingId(null); setForm({ ...EMPTY_FORM }); };

  const handleSave = () => {
    if (!form.name.trim()) return toast.error('اسم المنتج مطلوب');
    if (!form.wholesalePrice || Number(form.wholesalePrice) <= 0) return toast.error('سعر الجملة مطلوب');
    if (!form.suggestedPrice || Number(form.suggestedPrice) <= 0) return toast.error('السعر المقترح مطلوب');
    if (!form.stock || Number(form.stock) < 0) return toast.error('المخزون مطلوب');

    saveMut.mutate({
      name: form.name.trim(),
      description: form.description,
      category: form.categories.join(',') || 'عام',
      companyWholesalePrice: Number(form.companyWholesalePrice) || 0,
      wholesalePrice: Number(form.wholesalePrice),
      suggestedPrice: Number(form.suggestedPrice),
      sellingPriceMin: Number(form.sellingPriceMin) || Number(form.wholesalePrice),
      stock: Number(form.stock),
      discount: Number(form.discount) || 0,
      adLinks: form.adLinks,
      images: form.images.join(','),
      isActive: form.isActive,
    });
  };

  // ── رفع صور ──
  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || form.images.length >= 10) return;
    setUploadingImgs(true);
    const urls: string[] = [];
    for (const file of Array.from(files).slice(0, 10 - form.images.length)) {
      try {
        const base64 = await toBase64(file);
        const { data } = await api.post('/api/upload', { image: `data:${file.type};base64,${base64}` });
        if (data?.url) urls.push(data.url);
      } catch { toast.error(`فشل رفع ${file.name}`); }
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

  // ── رفع CSV ──
  const handleCSV = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvLoading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];
        let success = 0, failed = 0;
        for (const row of rows) {
          try {
            await api.post('/api/products', {
              name:                 row.name        || row.الاسم        || '',
              description:          row.description || row.الوصف        || '',
              category:             row.category    || row.الفئة        || 'عام',
              companyWholesalePrice: Number(row.companyWholesalePrice || row.سعر_الشركة || 0),
              wholesalePrice:        Number(row.wholesalePrice || row.سعر_الجملة || 0),
              suggestedPrice:        Number(row.suggestedPrice || row.السعر_المقترح || 0),
              sellingPriceMin:       Number(row.sellingPriceMin || row.أدنى_سعر || 0),
              stock:                 Number(row.stock || row.المخزون || 0),
              discount:              Number(row.discount || row.الخصم || 0),
              images:               row.images || row.الصور || '',
              isActive: true,
            });
            success++;
          } catch { failed++; }
        }
        toast.success(`تم رفع ${success} منتج${failed > 0 ? ` — فشل ${failed}` : ''}`);
        refetch();
        setCsvLoading(false);
        e.target.value = '';
      },
      error: () => { toast.error('فشل قراءة الملف'); setCsvLoading(false); },
    });
  };

  const filtered = (products as any[]).filter((p: any) =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.includes(search)
  );

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-row-reverse mb-6">
        <div className="text-right">
          <h1 className="text-2xl font-black text-gray-800">المنتجات</h1>
          <p className="text-gray-500 text-sm mt-1">{(products as any[]).length} منتج</p>
        </div>
        <div className="flex gap-3 flex-row-reverse">
          <button onClick={openAdd} className="flex items-center gap-2 flex-row-reverse bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-dark transition-colors">
            <Plus size={18} /> إضافة منتج
          </button>
          <button onClick={() => { setActiveTab('csv'); setShowModal(true); }}
            className="flex items-center gap-2 flex-row-reverse bg-white border-2 border-primary text-primary px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary/5 transition-colors">
            <FileUp size={18} /> رفع CSV
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="ابحث عن منتج..."
          className="w-full pr-10 pl-4 py-3 rounded-xl border border-gray-200 bg-white text-right outline-none focus:border-primary text-sm"
        />
      </div>

      {/* Table */}
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
                  <th className="px-4 py-3">الحالة</th>
                  <th className="px-4 py-3">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((p: any) => {
                  const imgs = p.images ? p.images.split(',').filter(Boolean) : [];
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        {imgs[0]
                          ? <img src={imgs[0]} alt={p.name} className="w-12 h-12 rounded-xl object-cover border border-gray-100" />
                          : <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center"><Image size={18} className="text-gray-300" /></div>
                        }
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-800 max-w-[200px] truncate">{p.name}</td>
                      <td className="px-4 py-3"><span className="px-2 py-1 bg-primary/10 text-primary rounded-lg text-xs font-semibold">{p.category || '—'}</span></td>
                      <td className="px-4 py-3 font-bold text-gray-700">{p.wholesalePrice?.toLocaleString()} د.ع</td>
                      <td className="px-4 py-3 font-bold text-primary">{p.suggestedPrice?.toLocaleString()} د.ع</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-lg text-xs font-bold ${p.stock === 0 ? 'bg-red-100 text-red-600' : p.stock < 10 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                          {p.stock}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleMut.mutate({ id: p.id, isActive: !p.isActive })}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${p.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                          {p.isActive ? <Eye size={13} /> : <EyeOff size={13} />}
                          {p.isActive ? 'نشط' : 'مخفي'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 flex-row-reverse">
                          <button onClick={() => openEdit(p)} className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                            <Pencil size={15} />
                          </button>
                          <button onClick={() => { if (confirm(`حذف "${p.name}"؟`)) deleteMut.mutate(p.id); }}
                            className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between flex-row-reverse p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-black text-gray-800">
                {activeTab === 'csv' ? 'رفع منتجات من CSV' : editingId ? 'تعديل المنتج' : 'إضافة منتج جديد'}
              </h2>
              <button onClick={closeModal} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Tabs */}
            {!editingId && (
              <div className="flex flex-row-reverse gap-2 p-4 pb-0">
                <button onClick={() => setActiveTab('form')}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${activeTab === 'form' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}`}>
                  إضافة يدوي
                </button>
                <button onClick={() => setActiveTab('csv')}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${activeTab === 'csv' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}`}>
                  رفع CSV
                </button>
              </div>
            )}

            <div className="p-6">
              {/* CSV Tab */}
              {activeTab === 'csv' && (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center">
                    <FileUp size={40} className="mx-auto text-gray-300 mb-3" />
                    <p className="font-semibold text-gray-600 mb-1">ارفع ملف CSV</p>
                    <p className="text-xs text-gray-400 mb-4">الحقول: name, wholesalePrice, suggestedPrice, stock, category, description</p>
                    <input ref={csvInputRef} type="file" accept=".csv" onChange={handleCSV} className="hidden" />
                    <button onClick={() => csvInputRef.current?.click()}
                      disabled={csvLoading}
                      className="bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-dark disabled:opacity-60">
                      {csvLoading ? 'جاري الرفع...' : 'اختر ملف CSV'}
                    </button>
                  </div>

                  {/* نموذج CSV */}
                  <div className="bg-gray-50 rounded-xl p-4 text-right">
                    <p className="text-xs font-bold text-gray-600 mb-2">نموذج الحقول المدعومة:</p>
                    <code className="text-xs text-primary block leading-6">
                      name, description, category, wholesalePrice,<br />
                      suggestedPrice, sellingPriceMin, stock, discount, images
                    </code>
                  </div>
                </div>
              )}

              {/* Form Tab */}
              {activeTab === 'form' && (
                <div className="space-y-4">
                  {/* الاسم */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1.5 text-right">اسم المنتج *</label>
                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-right outline-none focus:border-primary text-sm"
                      placeholder="مثال: سماعة Anker R50i" />
                  </div>

                  {/* الوصف */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1.5 text-right">الوصف</label>
                    <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      rows={3} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-right outline-none focus:border-primary text-sm resize-none"
                      placeholder="وصف المنتج..." />
                  </div>

                  {/* الفئة */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1.5 text-right">الفئة</label>
                    <div className="flex flex-wrap gap-2 flex-row-reverse">
                      {(categories as any[]).map((cat: any) => (
                        <button key={cat.id} onClick={() => setForm(f => ({
                          ...f,
                          categories: f.categories.includes(cat.name)
                            ? f.categories.filter(c => c !== cat.name)
                            : [...f.categories, cat.name]
                        }))}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                            form.categories.includes(cat.name)
                              ? 'bg-primary text-white border-primary'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-primary'}`}>
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* الأسعار */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'سعر شركة التوصيل', key: 'companyWholesalePrice' },
                      { label: 'سعر الجملة *',      key: 'wholesalePrice' },
                      { label: 'السعر المقترح *',   key: 'suggestedPrice' },
                      { label: 'أدنى سعر بيع',      key: 'sellingPriceMin' },
                    ].map(({ label, key }) => (
                      <div key={key}>
                        <label className="block text-xs font-semibold text-gray-500 mb-1 text-right">{label}</label>
                        <input type="number" value={(form as any)[key]}
                          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-right outline-none focus:border-primary text-sm" />
                      </div>
                    ))}
                  </div>

                  {/* المخزون والخصم */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1 text-right">المخزون *</label>
                      <input type="number" value={form.stock}
                        onChange={e => setForm(f => ({ ...f, stock: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-right outline-none focus:border-primary text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1 text-right">الخصم %</label>
                      <input type="number" value={form.discount} min="0" max="100"
                        onChange={e => setForm(f => ({ ...f, discount: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-right outline-none focus:border-primary text-sm" />
                    </div>
                  </div>

                  {/* الصور */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1.5 text-right">
                      الصور ({form.images.length}/10)
                    </label>
                    <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                    <div className="flex flex-wrap gap-2 flex-row-reverse mb-2">
                      {form.images.map((url, i) => (
                        <div key={i} className="relative">
                          <img src={url} alt="" className="w-20 h-20 rounded-xl object-cover border border-gray-200" />
                          <button onClick={() => setForm(f => ({ ...f, images: f.images.filter((_, idx) => idx !== i) }))}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600">
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                      {form.images.length < 10 && (
                        <button onClick={() => fileInputRef.current?.click()} disabled={uploadingImgs}
                          className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-primary hover:text-primary transition-colors disabled:opacity-60">
                          {uploadingImgs ? <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : <><Upload size={18} /><span className="text-xs mt-1">رفع</span></>}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* الحالة */}
                  <div className="flex items-center justify-between flex-row-reverse bg-gray-50 rounded-xl px-4 py-3">
                    <span className="text-sm font-semibold text-gray-700">المنتج نشط</span>
                    <button onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                      className={`w-12 h-6 rounded-full transition-colors relative ${form.isActive ? 'bg-primary' : 'bg-gray-300'}`}>
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${form.isActive ? 'right-1' : 'right-7'}`} />
                    </button>
                  </div>

                  {/* أزرار */}
                  <button onClick={handleSave} disabled={saveMut.isPending}
                    className="w-full bg-primary text-white py-3 rounded-xl font-bold text-sm hover:bg-primary-dark disabled:opacity-60 transition-colors">
                    {saveMut.isPending ? 'جاري الحفظ...' : editingId ? 'حفظ التعديلات' : 'إضافة المنتج'}
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
