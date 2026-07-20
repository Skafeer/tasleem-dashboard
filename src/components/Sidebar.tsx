// src/components/Sidebar.tsx
import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  LayoutDashboard, Package, ShoppingBag, Users,
  Wallet, Tag, Bell, Image, MessageSquare, LogOut, Ticket, X
} from 'lucide-react';

const links = [
  { to: '/', label: 'الرئيسية', icon: LayoutDashboard },
  { to: '/products', label: 'المنتجات', icon: Package },
  { to: '/orders', label: 'الطلبات', icon: ShoppingBag },
  { to: '/merchants', label: 'التجار', icon: Users },
  { to: '/withdrawals', label: 'السحوبات', icon: Wallet },
  { to: '/categories', label: 'الفئات', icon: Tag },
  { to: '/promos', label: 'أكواد الخصم', icon: Ticket },
  { to: '/banners', label: 'البنرات', icon: Image },
  { to: '/notifications', label: 'الإشعارات', icon: Bell },
  { to: '/support', label: 'الدعم الفني', icon: MessageSquare },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuth();

  const handleLinkClick = () => {
    if (window.innerWidth < 768) onClose();
  };

  return (
    <>
      {/* الخلفية المعتمة (للموبايل) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* السلايدر نفسه */}
      <aside
        className={`
          fixed top-0 right-0 h-full w-64 bg-white border-l border-gray-100 shadow-xl z-50
          flex flex-col transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
          md:translate-x-0 md:shadow-none md:border-l
        `}
      >
        {/* رأس السلايدر (للموبايل: زر إغلاق، للشاشات الكبيرة: شعار) */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 md:justify-center">
          {/* زر الإغلاق (للموبايل) */}
          <button onClick={onClose} className="md:hidden p-1 hover:bg-gray-100 rounded-lg">
            <X size={24} className="text-gray-500" />
          </button>

          {/* الشعار - استخدم الصورة بدلاً من الحرف */}
          <div className="flex items-center gap-3 flex-row-reverse">
            <img
              src="bublic/Tasleem.png"
              alt="تسليم"
              className="w-10 h-10 rounded-xl object-contain"
            />
            <div className="text-right">
              <p className="font-black text-gray-800 text-lg leading-none">تسليم</p>
              <p className="text-xs text-gray-400 mt-0.5">لوحة الإدارة</p>
            </div>
          </div>

          {/* عنصر فارغ للحفاظ على التوسيط (للموبايل) */}
          <div className="w-8 md:hidden" />
        </div>

        {/* معلومات المستخدم */}
        <div className="px-4 py-3 mx-3 mt-3 bg-primary/5 rounded-2xl border border-primary/10">
          <p className="text-right text-sm font-bold text-gray-700 truncate">{user?.storeName}</p>
          <p className="text-right text-xs text-primary font-semibold">أدمن</p>
        </div>

        {/* الروابط (قابلة للتمرير داخلياً) */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={handleLinkClick}
              className={({ isActive }) =>
                `flex items-center gap-3 flex-row-reverse px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                }`
              }
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* تسجيل الخروج */}
        <div className="p-3 border-t border-gray-100">
          <button
            onClick={() => {
              if (window.innerWidth < 768) onClose();
              logout();
            }}
            className="w-full flex items-center gap-3 flex-row-reverse px-4 py-2.5 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 transition-all"
          >
            <LogOut size={18} />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>
    </>
  );
}