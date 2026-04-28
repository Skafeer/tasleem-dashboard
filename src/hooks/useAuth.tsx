import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../api';

interface User { id: number; storeName: string; role: string; phone: string; }
interface AuthCtx { user: User | null; login: (phone: string, password: string) => Promise<void>; logout: () => void; loading: boolean; }

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

      useEffect(() => {
          const token = localStorage.getItem('token');
              if (!token) { setLoading(false); return; }
                  api.get('/api/auth/me')
                        .then(({ data }) => { if (data.role !== 'admin') { logout(); } else setUser(data); })
                              .catch(() => logout())
                                    .finally(() => setLoading(false));
                                      }, []);

                                        const login = async (phone: string, password: string) => {
                                            const { data } = await api.post('/api/auth/login', { phone, password });
                                                if (data.role !== 'admin') throw new Error('ليس لديك صلاحية الوصول');
                                                    localStorage.setItem('token', data.token);
                                                        setUser(data);
                                                          };

                                                            const logout = () => {
                                                                localStorage.removeItem('token');
                                                                    setUser(null);
                                                                      };

                                                                        return <Ctx.Provider value={{ user, login, logout, loading }}>{children}</Ctx.Provider>;
                                                                        }

                                                                        export const useAuth = () => useContext(Ctx)!;
                                                                        