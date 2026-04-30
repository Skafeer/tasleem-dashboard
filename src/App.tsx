import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './hooks/useAuth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Home from './pages/Home';
import Products from './pages/Products';
import Orders from './pages/Orders';
import Merchants from './pages/Merchants';
import Withdrawals from './pages/Withdrawals';
import Categories from './pages/Categories';

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } });

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<Layout />}>
              <Route path="/"         element={<Home />} />
              <Route path="/products" element={<Products />} />
              {/* صفحات قادمة */}
              <Route path="/orders"        element={<Orders />} />
              <Route path="/merchants"     element={<Merchants />} />
              <Route path="/withdrawals"   element={<Withdrawals />} />
              <Route path="/categories"    element={<Categories />} />
              <Route path="/promos"        element={<div className="p-8 text-gray-400 text-center mt-20">قادمًا — صفحة الأكواد</div>} />
              <Route path="/banners"       element={<div className="p-8 text-gray-400 text-center mt-20">قادمًا — صفحة البنرات</div>} />
              <Route path="/notifications" element={<div className="p-8 text-gray-400 text-center mt-20">قادمًا — صفحة الإشعارات</div>} />
              <Route path="/support"       element={<div className="p-8 text-gray-400 text-center mt-20">قادمًا — صفحة الدعم</div>} />
              <Route path="/stats"         element={<div className="p-8 text-gray-400 text-center mt-20">قادمًا — صفحة الإحصائيات</div>} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-center" toastOptions={{ style: { fontFamily: 'Tajawal', direction: 'rtl' } }} />
      </AuthProvider>
    </QueryClientProvider>
  );
}
