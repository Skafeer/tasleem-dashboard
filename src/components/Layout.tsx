import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Sidebar from './Sidebar';

export default function Layout() {
  const { user, loading } = useAuth();

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-[#f2f6f9]">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                    );

                      if (!user) return <Navigate to="/login" replace />;

                        return (
                            <div className="flex min-h-screen bg-[#f2f6f9]">
                                  <Sidebar />
                                        <main className="flex-1 mr-64 min-h-screen overflow-y-auto">
                                                <Outlet />
                                                      </main>
                                                          </div>
                                                            );
                                                            }
                                                            