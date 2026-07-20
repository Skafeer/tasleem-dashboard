// src/pages/Banners.tsx
import { useState, useRef, ChangeEvent, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Pencil, Trash2, Copy, X, Eye, EyeOff, Image as ImageIcon,
  GripVertical, Upload, RefreshCw, AlertCircle, CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api';

// ─── الأنواع ──────────────────────────────────────────────────────
type Banner = {
  id: number;
  title?: string;
  imageUrl: string;
  link?: string;
  isActive: boolean;
  sortOrder: number;
};

type BannerForm = {
  title: string;
  imageUrl: string;
  link: string;
  isActive: boolean;
};

const EMPTY_FORM: BannerForm = {
  title: '',
  imageUrl: '',
  link: '',
  isActive: true,
};

// ─── مكون البنر القابل للسحب ─────────────────────────────────────
interface SortableBannerProps {
  banner: Banner;
  onEdit: (b: Banner) => void;
  onDelete: (b: Banner) => void;
  onToggle: (b: Banner) => void;
}

const SortableBanner = ({ banner, onEdit, onDelete, onToggle }: SortableBannerProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: banner.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${
        !banner.isActive ? 'opacity-60' : ''
      } ${isDragging ? 'ring-2 ring-primary shadow-lg' : ''}`}
    >
      <div className="relative" style={{ aspectRatio: '16/9' }}>
        <img
          src={banner.imageUrl}
          alt={banner.title || 'Banner'}
          className="w-full h-full object-cover"
        />
        {!banner.isActive && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-white font-bold text-sm px-3 py-1 bg-black/50 rounded-full">معطل</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 p-3">
        {/* مقبض السحب */}
        <div
          {...attributes}
          {...listeners}
          className="p-1.5 rounded-lg hover:bg-gray-100 cursor-grab active:cursor-grabbing text-gray-400 transition"
        >
          <GripVertical size={18} />
        </div>

        {/* المعلومات */}
        <div className="flex-1 text-right min-w-0">
          <p className="font-bold text-gray-800 text-sm truncate">
            {banner.title || 'بدون عنوان'}
          </p>
          {banner.link && (
            <p className="text-xs text-gray-400 truncate">{banner.link}</p>
          )}
        </div>

        {/* الأزرار */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onToggle(banner)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
              banner.isActive
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {banner.isActive ? 'نشط' : 'مخفي'}
          </button>
          <button
            onClick={() => onEdit(banner)}
            className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => onDelete(banner)}
            className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── المكون الرئيسي ──────────────────────────────────────────────
export default function Banners() {
  const qc = useQueryClient();
  const [localBanners, setLocalBanners] = useState<Banner[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [form, setForm] = useState<BannerForm>(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── جلب البيانات ──────────────────────────────────────────────
  const { data: banners = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-banners'],
    queryFn: async () => {
      const { data } = await api.get('/api/banners');
      const sorted = (data as Banner[]).sort((a, b) => a.sortOrder - b.sortOrder);
      setLocalBanners(sorted);
      return sorted;
    },
    refetchInterval: 30000,
  });

  // مزامنة localBanners مع البيانات القادمة
  useEffect(() => {
    if (banners.length > 0 && localBanners.length === 0) {
      setLocalBanners(banners as Banner[]);
    }
  }, [banners, localBanners.length]);

  // ── السحب والإفلات ────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = localBanners.findIndex((b) => b.id === active.id);
    const newIndex = localBanners.findIndex((b) => b.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(localBanners, oldIndex, newIndex);
    setLocalBanners(newOrder);

    // حفظ الترتيب الجديد
    try {
      const reindexed = newOrder.map((b: Banner, i: number) => ({ ...b, sortOrder: i }));
      await Promise.all(
        reindexed.map((b: Banner) =>
          api.patch(`/api/banners/${b.id}`, {
            title: b.title,
            imageUrl: b.imageUrl,
            link: b.link,
            isActive: b.isActive,
            sortOrder: b.sortOrder,
          })
        )
      );
      qc.invalidateQueries({ queryKey: ['admin-banners'] });
      toast.success('تم تحديث الترتيب ✅');
    } catch {
      toast.error('فشل حفظ الترتيب');
      setLocalBanners(banners as Banner[]); // استعادة الترتيب القديم
    }
  };

  // ── العمليات ──────────────────────────────────────────────────
  const saveBanner = useMutation({
    mutationFn: async (data: any) => {
      if (editingBanner) {
        const { data: res } = await api.patch(`/api/banners/${editingBanner.id}`, data);
        return res;
      }
      const { data: res } = await api.post('/api/banners', data);
      return res;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-banners'] });
      toast.success(editingBanner ? 'تم تعديل البنر ✅' : 'تم إضافة البنر ✅');
      closeModal();
    },
    onError: () => toast.error('فشل الحفظ'),
  });

  const toggleBanner = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const { data } = await api.patch(`/api/banners/${id}`, { isActive });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-banners'] });
    },
    onError: () => toast.error('فشل التحديث'),
  });

  const deleteBanner = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/banners/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-banners'] });
      toast.success('تم حذف البنر');
    },
    onError: () => toast.error('فشل الحذف'),
  });

  // ── دوال المودال ──────────────────────────────────────────────
  const openAdd = () => {
    setEditingBanner(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (b: Banner) => {
    setEditingBanner(b);
    setForm({
      title: b.title || '',
      imageUrl: b.imageUrl,
      link: b.link || '',
      isActive: b.isActive,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingBanner(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = () => {
    if (!form.imageUrl) {
      toast.error('يرجى رفع صورة البنر');
      return;
    }
    saveBanner.mutate({
      title: form.title.trim(),
      imageUrl: form.imageUrl,
      link: form.link.trim(),
      isActive: form.isActive,
    });
  };

  const confirmDelete = (b: Banner) => {
    if (window.confirm(`هل تريد حذف البنر "${b.title || 'بدون عنوان'}" نهائياً؟`)) {
      deleteBanner.mutate(b.id);
    }
  };

  // ── رفع الصورة ──────────────────────────────────────────────────
  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // التحقق من الحجم (حد أقصى 5 ميجا)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم الصورة كبير جداً (الحد الأقصى 5 ميجا)');
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const base64 = ev.target?.result as string;
          const { data } = await api.post('/api/upload', { image: base64 });
          if (data?.url) {
            setForm((f) => ({ ...f, imageUrl: data.url }));
            toast.success('تم رفع الصورة ✅');
          } else {
            toast.error('لم يتم استلام رابط الصورة');
          }
        } catch {
          toast.error('فشل رفع الصورة');
        } finally {
          setUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error('حدث خطأ');
      setUploading(false);
    }
    e.target.value = ''; // إعادة تعيين الإدخال
  };

  // ─── الإحصائيات ────────────────────────────────────────────────
  const total = localBanners.length;
  const activeCount = localBanners.filter((b) => b.isActive).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8" dir="rtl">
      {/* ─── الهيدر ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="text-right">
          <h1 className="text-2xl font-black text-gray-800">البنرات</h1>
          <p className="text-gray-500 text-sm mt-1">
            {total} بنر{' '}
            <span className="text-primary">
              ({activeCount} نشط، {total - activeCount} معطل)
            </span>
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-dark transition"
        >
          <Plus size={18} /> إضافة بنر
        </button>
      </div>

      {/* ─── تعليمة السحب ──────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-gray-500 text-sm mb-4 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
        <GripVertical size={16} className="text-primary" />
        <span>اسحب البنرات ☰ لإعادة ترتيبها</span>
      </div>

      {/* ─── القائمة القابلة للسحب ────────────────────────────── */}
      {localBanners.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <ImageIcon size={48} className="mx-auto mb-3 opacity-30" />
          <p className="font-semibold text-lg">لا توجد بنرات</p>
          <p className="text-sm mt-1">أضف بنراً جديداً بالضغط على الزر أعلاه</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={localBanners.map((b) => b.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {localBanners.map((banner) => (
                <SortableBanner
                  key={banner.id}
                  banner={banner}
                  onEdit={openEdit}
                  onDelete={confirmDelete}
                  onToggle={(b) =>
                    toggleBanner.mutate({ id: b.id, isActive: !b.isActive })
                  }
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* ─── مودال الإضافة / التعديل ──────────────────────────── */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white z-10 border-b border-gray-100">
              <div className="flex items-center justify-between p-6">
                <h2 className="text-xl font-black text-gray-800">
                  {editingBanner ? 'تعديل البنر' : 'إضافة بنر جديد'}
                </h2>
                <button
                  onClick={closeModal}
                  className="p-2 hover:bg-gray-100 rounded-xl transition"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* رفع الصورة */}
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1.5 text-right">
                  صورة البنر * (نسبة 16:9)
                </label>
                <div
                  className={`relative border-2 border-dashed rounded-xl overflow-hidden ${
                    form.imageUrl ? 'border-primary/30' : 'border-gray-300'
                  }`}
                  style={{ aspectRatio: '16/9' }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : form.imageUrl ? (
                    <>
                      <img
                        src={form.imageUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition flex items-center justify-center">
                        <span className="text-white text-sm font-bold bg-black/60 px-4 py-2 rounded-full">
                          تغيير الصورة
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                      <Upload size={32} className="mb-2" />
                      <p className="text-sm font-semibold">اضغط لرفع الصورة</p>
                      <p className="text-xs">1920 × 1080 (16:9)</p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* العنوان */}
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1.5 text-right">
                  العنوان (اختياري)
                </label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="عنوان البنر"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-primary text-sm text-right"
                />
              </div>

              {/* الرابط */}
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1.5 text-right">
                  الرابط (اختياري)
                </label>
                <input
                  value={form.link}
                  onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
                  placeholder="https://example.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-primary text-sm text-right"
                />
              </div>

              {/* حالة التفعيل */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                <button
                  onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
                  className={`w-12 h-6 rounded-full transition-colors relative ${
                    form.isActive ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                      form.isActive ? 'right-1' : 'right-7'
                    }`}
                  />
                </button>
                <span className="text-sm font-semibold text-gray-700">
                  {form.isActive ? 'البنر فعال' : 'البنر معطل'}
                </span>
              </div>

              {/* الأزرار */}
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={closeModal}
                  className="flex-1 bg-gray-100 text-gray-600 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-200 transition"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSave}
                  disabled={saveBanner.isPending}
                  className="flex-1 bg-primary text-white py-2.5 rounded-xl font-bold text-sm hover:bg-primary-dark disabled:opacity-60 transition"
                >
                  {saveBanner.isPending
                    ? 'جاري الحفظ...'
                    : editingBanner
                    ? 'حفظ التعديلات'
                    : 'إضافة البنر'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}