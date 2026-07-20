// src/components/Layout.tsx
import { Outlet, Navigate } from 'react-router-dom';
import { useState } from 'react';
import { Menu } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import Sidebar from './Sidebar';

export default function Layout() {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f2f6f9]">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="flex min-h-screen bg-[#f2f6f9]">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col md:mr-64">
        {/* هيدر مع زر البرجر (للموبايل فقط) */}
        <header className="bg-white border-b border-gray-100 p-4 flex items-center justify-between md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <Menu size={24} className="text-gray-700" />
          </button>
          <div className="flex items-center gap-2">
            <span className="font-bold text-primary text-lg">تسليم</span>
          </div>
          {/* يمكن إضافة أيقونة المستخدم أو إشعارات هنا */}
        </header>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}