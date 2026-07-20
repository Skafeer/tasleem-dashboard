// src/pages/Home.tsx
import { useQuery } from '@tanstack/react-query';
import {
  Package, ShoppingBag, Users, Wallet, TrendingUp, Clock,
  CheckCircle, XCircle, AlertCircle, Truck, DollarSign,
  Percent, Calendar, BarChart3, Award, Store, CreditCard,
  Gift, HeartHandshake, LucideIcon
} from 'lucide-react';
import api from '../api';

// ── دالة تنسيق الأرقام ──
const fmt = (n: number) => Math.round(n).toLocaleString('ar-IQ');

// ── ألوان ثابتة ──
const COLORS = {
  primary: '#0c6679',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  purple: '#8b5cf6',
  secondary: '#f5a006',
};

// ── مكون بطاقة KPI ──
const KpiCard = ({
  icon: Icon,
  label,
  value,
  color,
  bg,
  sub,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  color: string;
  bg: string;
  sub?: string;
}) => (
  <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
    <div className="flex items-start justify-between flex-row-reverse">
      <div className={`w-11 h-11 ${bg} rounded-xl flex items-center justify-center`}>
        <Icon size={22} className={`text-${color}`} style={{ color }} />
      </div>
      <div className="text-right">
        <p className="text-2xl font-black text-gray-800">{value}</p>
        <p className="text-sm text-gray-500 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  </div>
);

// ── مكون شريط التقدم البسيط ──
const BarRow = ({
  label,
  count,
  max,
  color,
  sub,
}: {
  label: string;
  count: number;
  max: number;
  color: string;
  sub?: string | number;
}) => {
  const pct = max > 0 ? Math.min((count / max) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-4 mb-3">
      <span className="text-sm font-semibold text-gray-700 w-20 text-right">{label}</span>
      <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <div className="flex items-center gap-3 w-28 justify-end">
        <span className="text-sm font-bold text-gray-800">{count}</span>
        {sub && <span className="text-xs text-gray-400">{sub}</span>}
      </div>
    </div>
  );
};

export default function Home() {
  // ── جلب البيانات ──
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const { data } = await api.get('/api/admin/stats-data');
      return data;
    },
    refetchInterval: 60000,
    retry: 2,
    staleTime: 30000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" style={{ borderColor: COLORS.primary }} />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <AlertCircle className="w-14 h-14 text-red-400" />
        <p className="text-lg font-bold text-gray-700 mt-4">تعذر تحميل الإحصائيات</p>
        <p className="text-sm text-gray-500">تحقق من الاتصال بالسيرفر</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-6 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:opacity-90 transition"
          style={{ backgroundColor: COLORS.primary }}
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  // ── استخراج البيانات ──
  const orders = stats.orders || [];
  const users = stats.users || [];
  const products = stats.products || [];
  const withdrawals = stats.withdrawals || [];

  // ── حسابات الطلبات ──
  const allOrders = orders;
  const delivered = allOrders.filter((o: any) => o.status === 'delivered');
  const cancelled = allOrders.filter((o: any) => o.status === 'cancelled');
  const returned = allOrders.filter((o: any) => o.status === 'returned');
  const postponed = allOrders.filter((o: any) => o.status === 'postponed');
  const activeOrders = allOrders.filter((o: any) =>
    ['processing', 'shipping'].includes(o.status)
  );
  const pendingOrders = allOrders.filter((o: any) =>
    ['pending', 'processing', 'preparing', 'shipping'].includes(o.status)
  ).length;

  const totalRevenue = delivered.reduce((s: number, o: any) => s + (o.totalAmount || 0), 0);
  const totalProfit = delivered.reduce((s: number, o: any) => s + (o.companyProfit || 0), 0);
  const totalShipping = delivered.reduce((s: number, o: any) => s + (o.shippingCost || 0), 0);
  const deliveryRate = allOrders.length > 0 ? Math.round((delivered.length / allOrders.length) * 100) : 0;

  // ── التجار ──
  const merchants = users.filter((u: any) => u.role === 'merchant');
  const totalBalances = merchants.reduce((s: number, u: any) => s + (u.balance || 0), 0);
  const totalPendingBalances = merchants.reduce((s: number, u: any) => s + (u.pendingBalance || 0), 0);

  // أكثر 5 تجار نشاطاً
  const merchantOrders: Record<number, { name: string; count: number; revenue: number; profit: number }> = {};
  allOrders.forEach((o: any) => {
    if (!o.merchantId) return;
    if (!merchantOrders[o.merchantId]) {
      const m = merchants.find((u: any) => u.id === o.merchantId);
      merchantOrders[o.merchantId] = {
        name: m?.storeName || `#${o.merchantId}`,
        count: 0,
        revenue: 0,
        profit: 0,
      };
    }
    merchantOrders[o.merchantId].count++;
    if (o.status === 'delivered') {
      merchantOrders[o.merchantId].revenue += (o.totalAmount || 0) - (o.shippingCost || 0);
      merchantOrders[o.merchantId].profit += (o.companyProfit || 0);
    }
  });
  const topMerchants = Object.values(merchantOrders)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const maxMerchantCount = topMerchants[0]?.count || 1;

  // ── المنتجات ──
  const activeProducts = products.filter((p: any) => p.stock > 0);
  const outOfStock = products.filter((p: any) => p.stock === 0);
  const lowStock = products.filter((p: any) => p.stock > 0 && p.stock <= 5);
  const totalStockValue = products.reduce(
    (s: number, p: any) => s + ((p.companyWholesalePrice || 0) * p.stock),
    0
  );
  const potentialRevenue = products.reduce(
    (s: number, p: any) => s + ((p.wholesalePrice || 0) * p.stock),
    0
  );
  const potentialProfit = potentialRevenue - totalStockValue;

  // أكثر 5 منتجات مبيعاً
  const productSales: Record<number, { name: string; count: number; revenue: number }> = {};
  allOrders.forEach((o: any) => {
    if (o.status !== 'delivered') return;
    (o.items || []).forEach((item: any) => {
      if (!productSales[item.productId]) {
        productSales[item.productId] = {
          name: item.product?.name || `#${item.productId}`,
          count: 0,
          revenue: 0,
        };
      }
      productSales[item.productId].count += item.quantity || 1;
      productSales[item.productId].revenue += (item.price || 0) * (item.quantity || 1);
    });
  });
  const topProducts = Object.values(productSales)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const maxProductCount = topProducts[0]?.count || 1;

  // ── السحوبات ──
  const pendingW = withdrawals.filter((w: any) => w.status === 'pending');
  const approvedW = withdrawals.filter((w: any) => w.status === 'approved');
  const paidW = withdrawals.filter((w: any) => w.status === 'paid');
  const rejectedW = withdrawals.filter((w: any) => w.status === 'rejected');
  const paidAmount = paidW.reduce((s: number, w: any) => s + (w.amount || 0), 0);
  const pendingAmount = [...pendingW, ...approvedW].reduce(
    (s: number, w: any) => s + (w.amount || 0),
    0
  );
  const totalWithdrawn = paidW.reduce((s: number, w: any) => s + (w.amount || 0), 0);

  // ── إحصائيات سريعة ──
  const quickStats = [
    {
      label: 'إجمالي الطلبات',
      value: allOrders.length,
      icon: ShoppingBag,
      color: COLORS.info,
      bg: 'bg-blue-50',
    },
    {
      label: 'طلبات نشطة',
      value: pendingOrders,
      icon: Clock,
      color: COLORS.warning,
      bg: 'bg-amber-50',
    },
    {
      label: 'نسبة التسليم',
      value: `${deliveryRate}%`,
      icon: CheckCircle,
      color: COLORS.success,
      bg: 'bg-green-50',
    },
    {
      label: 'التجار المسجلين',
      value: merchants.length,
      icon: Users,
      color: COLORS.purple,
      bg: 'bg-purple-50',
    },
    {
      label: 'المنتجات',
      value: products.length,
      icon: Package,
      color: COLORS.primary,
      bg: 'bg-teal-50',
    },
    {
      label: 'سحوبات معلقة',
      value: pendingW.length,
      icon: Wallet,
      color: COLORS.danger,
      bg: 'bg-red-50',
    },
  ];

  // ── بطاقات الإيرادات والأرباح ──
  const revenueCards = [
    {
      label: 'إجمالي الإيرادات',
      value: `${fmt(totalRevenue)} د.ع`,
      icon: DollarSign,
      color: COLORS.success,
      bg: 'bg-green-50',
    },
    {
      label: 'أرباح الشركة',
      value: `${fmt(totalProfit)} د.ع`,
      icon: TrendingUp,
      color: COLORS.primary,
      bg: 'bg-teal-50',
    },
    {
      label: 'رسوم التوصيل',
      value: `${fmt(totalShipping)} د.ع`,
      icon: Truck,
      color: COLORS.info,
      bg: 'bg-blue-50',
    },
    {
      label: 'هامش الربح',
      value: totalRevenue > 0 ? `${Math.round((totalProfit / totalRevenue) * 100)}%` : '0%',
      icon: Percent,
      color: COLORS.warning,
      bg: 'bg-amber-50',
    },
  ];

  // ── حالة الطلبات ──
  const orderStatuses = [
    { label: 'مسلّم', count: delivered.length, color: COLORS.success },
    { label: 'نشط', count: activeOrders.length, color: COLORS.info },
    { label: 'ملغي', count: cancelled.length, color: COLORS.danger },
    { label: 'مرتجع', count: returned.length, color: COLORS.warning },
    { label: 'مؤجل', count: postponed.length, color: COLORS.purple },
  ];
  const maxOrderStatus = Math.max(
    ...orderStatuses.map((s) => s.count),
    1
  );

  // ── إحصائيات المنتجات ──
  const productStats = [
    { label: 'إجمالي المنتجات', value: products.length, icon: Package, color: COLORS.primary, bg: 'bg-teal-50' },
    { label: 'متوفر بالمخزون', value: activeProducts.length, icon: CheckCircle, color: COLORS.success, bg: 'bg-green-50' },
    { label: 'مخزون منخفض (≤٥)', value: lowStock.length, icon: AlertCircle, color: COLORS.warning, bg: 'bg-amber-50' },
    { label: 'نفذ من المخزون', value: outOfStock.length, icon: XCircle, color: COLORS.danger, bg: 'bg-red-50' },
  ];

  // ── إحصائيات السحوبات ──
  const withdrawalStats = [
    { label: 'معلق', count: pendingW.length, amount: pendingW.reduce((s: number, w: any) => s + (w.amount || 0), 0), color: COLORS.warning, icon: Clock },
    { label: 'مقبول', count: approvedW.length, amount: approvedW.reduce((s: number, w: any) => s + (w.amount || 0), 0), color: COLORS.info, icon: CheckCircle },
    { label: 'مدفوع', count: paidW.length, amount: paidW.reduce((s: number, w: any) => s + (w.amount || 0), 0), color: COLORS.success, icon: DollarSign },
    { label: 'مرفوض', count: rejectedW.length, amount: rejectedW.reduce((s: number, w: any) => s + (w.amount || 0), 0), color: COLORS.danger, icon: XCircle },
  ];

  return (
    <div className="p-8 bg-gray-50 min-h-screen" dir="rtl">
      {/* العنوان */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-800">لوحة التحكم</h1>
        <p className="text-gray-500 mt-1 text-sm">نظرة عامة على أداء منصة تسليم</p>
      </div>

      {/* البطاقات السريعة */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
        {quickStats.map((stat) => (
          <KpiCard
            key={stat.label}
            icon={stat.icon}
            label={stat.label}
            value={stat.value}
            color={stat.color}
            bg={stat.bg}
          />
        ))}
      </div>

      {/* الإيرادات والأرباح */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2 justify-end">
          <DollarSign size={20} className="text-green-500" />
          الإيرادات والأرباح
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {revenueCards.map((card) => (
            <div
              key={card.label}
              className="bg-gray-50 rounded-xl p-4 text-center border border-gray-100"
            >
              <div className={`w-10 h-10 ${card.bg} rounded-xl flex items-center justify-center mx-auto mb-2`}>
                <card.icon size={20} style={{ color: card.color }} />
              </div>
              <p className="text-lg font-bold text-gray-800">{card.value}</p>
              <p className="text-xs text-gray-500">{card.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* توزيع الطلبات حسب الحالة */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2 justify-end">
          <BarChart3 size={20} className="text-blue-500" />
          توزيع الطلبات حسب الحالة
        </h2>
        <div className="space-y-2">
          {orderStatuses.map((status) => (
            <BarRow
              key={status.label}
              label={status.label}
              count={status.count}
              max={maxOrderStatus}
              color={status.color}
            />
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end items-center gap-2">
          <CheckCircle size={16} className="text-green-500" />
          <span className="text-sm text-gray-600">
            نسبة التسليم: <span className="font-bold text-green-600">{deliveryRate}%</span>
          </span>
        </div>
      </div>

      {/* أكثر التجار نشاطاً */}
      {topMerchants.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2 justify-end">
            <Award size={20} className="text-amber-500" />
            أكثر ٥ تجار نشاطاً
          </h2>
          {topMerchants.map((m, i) => {
            const colors = [COLORS.primary, COLORS.secondary, COLORS.purple, COLORS.success, COLORS.info];
            return (
              <div key={i} className="flex items-center gap-4 mb-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: colors[i] + '20', color: colors[i] }}>
                  #{i + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-800 text-right">{m.name}</p>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(m.count / maxMerchantCount) * 100}%`, backgroundColor: colors[i] }} />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-800">{m.count} طلب</p>
                  <p className="text-xs text-green-600">{fmt(m.revenue)} د.ع</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* إحصائيات المنتجات */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        {productStats.map((stat) => (
          <KpiCard
            key={stat.label}
            icon={stat.icon}
            label={stat.label}
            value={stat.value}
            color={stat.color}
            bg={stat.bg}
          />
        ))}
      </div>

      {/* قيمة المخزون والربح المحتمل */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between flex-row-reverse">
            <div className="w-11 h-11 bg-green-50 rounded-xl flex items-center justify-center">
              <Wallet size={22} className="text-green-500" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-gray-800">{fmt(totalStockValue)} د.ع</p>
              <p className="text-sm text-gray-500">قيمة المخزون (بسعر الشركة)</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between flex-row-reverse">
            <div className="w-11 h-11 bg-teal-50 rounded-xl flex items-center justify-center">
              <TrendingUp size={22} className="text-teal-600" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-gray-800">{fmt(potentialProfit)} د.ع</p>
              <p className="text-sm text-gray-500">الربح المحتمل (لو بيع كله)</p>
            </div>
          </div>
        </div>
      </div>

      {/* أكثر المنتجات مبيعاً */}
      {topProducts.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2 justify-end">
            <Gift size={20} className="text-red-500" />
            أكثر ٥ منتجات مبيعاً
          </h2>
          {topProducts.map((p, i) => {
            const colors = [COLORS.primary, COLORS.secondary, COLORS.purple, COLORS.success, COLORS.info];
            return (
              <BarRow
                key={i}
                label={p.name}
                count={p.count}
                max={maxProductCount}
                color={colors[i % colors.length]}
                sub={`${fmt(p.revenue)} د.ع`}
              />
            );
          })}
        </div>
      )}

      {/* إحصائيات التجار */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        <KpiCard icon={Users} label="إجمالي التجار" value={merchants.length} color={COLORS.purple} bg="bg-purple-50" />
        <KpiCard icon={Store} label="جدد هذا الشهر" value={merchants.filter((u: any) => {
          const d = new Date(u.createdAt);
          const now = new Date();
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }).length} color={COLORS.secondary} bg="bg-amber-50" />
        <KpiCard icon={Wallet} label="إجمالي الأرصدة" value={`${fmt(totalBalances)} د.ع`} color={COLORS.success} bg="bg-green-50" />
        <KpiCard icon={Clock} label="أرصدة معلقة" value={`${fmt(totalPendingBalances)} د.ع`} color={COLORS.warning} bg="bg-amber-50" />
      </div>

      {/* إحصائيات السحوبات */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2 justify-end">
          <CreditCard size={20} className="text-amber-500" />
          السحوبات
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {withdrawalStats.map((stat) => (
            <div
              key={stat.label}
              className="bg-gray-50 rounded-xl p-4 text-center border border-gray-100"
            >
              <div className="flex items-center justify-center gap-2">
                <stat.icon size={18} style={{ color: stat.color }} />
                <span className="text-sm font-bold text-gray-800">{stat.count}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
              <p className="text-xs font-semibold mt-1" style={{ color: stat.color }}>
                {fmt(stat.amount)} د.ع
              </p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap justify-center gap-8 pt-4 border-t border-gray-100">
          <div className="text-center">
            <p className="text-lg font-bold text-green-600">{fmt(paidAmount)} د.ع</p>
            <p className="text-xs text-gray-500">إجمالي المدفوع</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-amber-600">{fmt(pendingAmount)} د.ع</p>
            <p className="text-xs text-gray-500">قيد الانتظار</p>
          </div>
        </div>
      </div>
    </div>
  );
}