// src/pages/Categories.tsx
import { useState, useMemo } from 'react';
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
  Plus, Pencil, Trash2, X, Eye, EyeOff, Grid, GripVertical,
  RefreshCw, CheckCircle, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api';

// ─── أيقونات (مطابقة لنسخة التطبيق) ─────────────────────────────
const ICONS = [
  { key: 'grid-outline', label: 'عام', emoji: '📦' },
  { key: 'phone-portrait-outline', label: 'إلكترونيات', emoji: '📱' },
  { key: 'home-outline', label: 'منزل', emoji: '🏠' },
  { key: 'shirt-outline', label: 'ملابس', emoji: '👕' },
  { key: 'rose-outline', label: 'اكسسوارات', emoji: '💍' },
  { key: 'book-outline', label: 'كتب', emoji: '📚' },
  { key: 'bicycle-outline', label: 'رياضة', emoji: '🏋️' },
  { key: 'flower-outline', label: 'عطور', emoji: '🌸' },
  { key: 'nutrition-outline', label: 'غذاء', emoji: '🥗' },
  { key: 'construct-outline', label: 'أدوات', emoji: '🔧' },
  { key: 'sparkles-outline', label: 'تجميل', emoji: '✨' },
  { key: 'car-outline', label: 'سيارات', emoji: '🚗' },
  { key: 'game-controller-outline', label: 'ألعاب', emoji: '🎮' },
  { key: 'paw-outline', label: 'حيوانات', emoji: '🐾' },
  { key: 'briefcase-outline', label: 'مكتب', emoji: '💼' },
  { key: 'laptop-outline', label: 'كمبيوتر', emoji: '💻' },
];

const getEmoji = (key: string) => ICONS.find(i => i.key === key)?.emoji || '📦';

// ─── أنواع البيانات ──────────────────────────────────────────────
type Category = {
  id: number;
  name: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
};

// ─── مكون الفئة القابلة للسحب ────────────────────────────────────
interface SortableCategoryProps {
  category: Category;
  onEdit: (cat: Category) => void;
  onDelete: (cat: Category) => void;
  onToggle: (cat: Category) => void;
}

const SortableCategory = ({ category, onEdit, onDelete, onToggle }: SortableCategoryProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

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
      className={`bg-white rounded-2xl border p-4 shadow-sm transition-all ${
        !category.isActive ? 'opacity-60' : 'border-gray-100'
      } ${isDragging ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-md'}`}
    >
      <div className="flex items-center gap-3">
        {/* مقبض السحب */}
        <div
          {...attributes}
          {...listeners}
          className="p-1.5 rounded-lg hover:bg-gray-100 cursor-grab active:cursor-grabbing text-gray-400 transition flex-shrink-0"
        >
          <GripVertical size={18} />
        </div>

        {/* الأيقونة والاسم */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${
              category.isActive ? 'bg-primary/10' : 'bg-gray-100'
            }`}
          >
            {getEmoji(category.icon)}
          </div>
          <div className="text-right flex-1 min-w-0">
            <p className={`font-bold truncate ${category.isActive ? 'text-gray-800' : 'text-gray-400'}`}>
              {category.name}
            </p>
            <p className="text-xs text-gray-400">ترتيب: {category.sortOrder}</p>
          </div>
        </div>

        {/* الأزرار */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => onToggle(category)}
            className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition ${
              category.isActive
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {category.isActive ? <Eye size={12} /> : <EyeOff size={12} />}
            <span className="mr-1">{category.isActive ? 'نشط' : 'مخفي'}</span>
          </button>
          <button
            onClick={() => onEdit(category)}
            className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => onDelete(category)}
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
export default function Categories() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: '', icon: 'grid-outline' });
  const [localCategories, setLocalCategories] = useState<Category[]>([]);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  // ── جلب البيانات ──────────────────────────────────────────────
  const { data: categories = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const { data } = await api.get('/api/categories');
      const sorted = (data as Category[]).sort((a, b) => a.sortOrder - b.sortOrder);
      setLocalCategories(sorted);
      return sorted;
    },
    refetchInterval: 30000,
    staleTime: 10000,
  });

  // مزامنة localCategories مع البيانات القادمة
  useMemo(() => {
    if (categories.length > 0 && localCategories.length === 0) {
      setLocalCategories(categories as Category[]);
    }
  }, [categories]);

  // ─── السحب والإفلات ────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = localCategories.findIndex((c) => c.id === active.id);
    const newIndex = localCategories.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(localCategories, oldIndex, newIndex);
    setLocalCategories(newOrder);

    // حفظ الترتيب الجديد
    setIsSavingOrder(true);
    try {
      const reindexed = newOrder.map((c, i) => ({ ...c, sortOrder: i }));
      await Promise.all(
        reindexed.map((c) =>
          api.patch(`/api/categories/${c.id}`, {
            name: c.name,
            icon: c.icon || 'grid-outline',
            sortOrder: c.sortOrder,
            isActive: c.isActive,
          })
        )
      );
      qc.invalidateQueries({ queryKey: ['admin-categories'] });
      qc.invalidateQueries({ queryKey: ['categories'] });
      toast.success('تم تحديث الترتيب ✅');
    } catch {
      toast.error('فشل حفظ الترتيب');
      setLocalCategories(categories as Category[]);
    } finally {
      setIsSavingOrder(false);
    }
  };

  // ─── العمليات ──────────────────────────────────────────────────
  const createMut = useMutation({
    mutationFn: async (body: any) => {
      const { data } = await api.post('/api/categories', body);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-categories'] });
      qc.invalidateQueries({ queryKey: ['categories'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      closeModal();
      toast.success('تمت الإضافة ✅');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'حدث خطأ'),
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, body }: any) => {
      const { data } = await api.patch(`/api/categories/${id}`, body);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-categories'] });
      qc.invalidateQueries({ queryKey: ['categories'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      closeModal();
      toast.success('تم التحديث ✅');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'حدث خطأ'),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/categories/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-categories'] });
      qc.invalidateQueries({ queryKey: ['categories'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success('تم الحذف');
    },
    onError: () => toast.error('فشل الحذف'),
  });

  // ─── دوال المودال ──────────────────────────────────────────────
  const openAdd = () => {
    setEditItem(null);
    setForm({ name: '', icon: 'grid-outline' });
    setShowModal(true);
  };

  const openEdit = (cat: Category) => {
    setEditItem(cat);
    setForm({ name: cat.name, icon: cat.icon || 'grid-outline' });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditItem(null);
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error('اسم الفئة مطلوب');
      return;
    }
    const maxOrder = localCategories.length > 0
      ? Math.max(...localCategories.map((c) => c.sortOrder))
      : -1;
    const body = {
      name: form.name.trim(),
      icon: form.icon || 'grid-outline',
      sortOrder: editItem ? editItem.sortOrder : maxOrder + 1,
      isActive: editItem ? editItem.isActive : true,
    };
    if (editItem) {
      updateMut.mutate({ id: editItem.id, body });
    } else {
      createMut.mutate(body);
    }
  };

  const toggleActive = (cat: Category) => {
    updateMut.mutate({
      id: cat.id,
      body: {
        name: cat.name,
        icon: cat.icon || 'grid-outline',
        sortOrder: cat.sortOrder,
        isActive: !cat.isActive,
      },
    });
  };

  const confirmDelete = (cat: Category) => {
    if (window.confirm(`هل تريد حذف الفئة "${cat.name}" نهائياً؟`)) {
      deleteMut.mutate(cat.id);
    }
  };

  const displayList = localCategories.length > 0 ? localCategories : (categories as Category[]);

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
          <h1 className="text-2xl font-black text-gray-800">الفئات</h1>
          <p className="text-gray-500 text-sm mt-1">
            {displayList.length} فئة
            {isSavingOrder && (
              <span className="mr-2 text-primary text-xs">
                <span className="inline-block w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin mr-1" />
                جاري حفظ الترتيب...
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-50 transition"
          >
            <RefreshCw size={16} />
            تحديث
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-primary-dark transition"
          >
            <Plus size={18} /> إضافة فئة
          </button>
        </div>
      </div>

      {/* ─── تعليمة السحب ──────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-gray-500 text-sm mb-4 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
        <GripVertical size={16} className="text-primary" />
        <span>اسحب الفئات ☰ لإعادة ترتيبها</span>
      </div>

      {/* ─── قائمة الفئات القابلة للسحب ────────────────────────── */}
      {displayList.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Grid size={48} className="mx-auto mb-3 opacity-30" />
          <p className="font-semibold text-lg">لا توجد فئات</p>
          <p className="text-sm mt-1">أضف فئة جديدة بالضغط على الزر أعلاه</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={displayList.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {displayList.map((cat) => (
                <SortableCategory
                  key={cat.id}
                  category={cat}
                  onEdit={openEdit}
                  onDelete={confirmDelete}
                  onToggle={toggleActive}
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
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white z-10 border-b border-gray-100">
              <div className="flex items-center justify-between p-6">
                <h3 className="font-black text-gray-800 text-lg">
                  {editItem ? 'تعديل الفئة' : 'فئة جديدة'}
                </h3>
                <button
                  onClick={closeModal}
                  className="p-2 hover:bg-gray-100 rounded-xl transition"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* الاسم */}
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1.5 text-right">
                  اسم الفئة *
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="مثال: إلكترونيات"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-primary text-sm text-right"
                />
              </div>

              {/* الأيقونة */}
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2 text-right">
                  الأيقونة
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {ICONS.map((ico) => (
                    <button
                      key={ico.key}
                      onClick={() => setForm((f) => ({ ...f, icon: ico.key }))}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                        form.icon === ico.key
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-100 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-2xl">{ico.emoji}</span>
                      <span className="text-xs text-gray-500">{ico.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* تنبيه الترتيب عند الإضافة */}
              {!editItem && (
                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl border border-green-200">
                  <CheckCircle size={16} className="text-green-600" />
                  <span className="text-xs text-green-700">ستُضاف الفئة في آخر القائمة تلقائياً</span>
                </div>
              )}

              {/* الأزرار */}
              <button
                onClick={handleSave}
                disabled={createMut.isPending || updateMut.isPending}
                className="w-full bg-primary text-white py-3 rounded-xl font-bold text-sm hover:bg-primary-dark disabled:opacity-60 transition"
              >
                {createMut.isPending || updateMut.isPending
                  ? 'جاري الحفظ...'
                  : editItem
                  ? 'حفظ التعديلات'
                  : 'إضافة الفئة'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}