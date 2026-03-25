'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch } from '../store/hooks';
import { restoreUser } from '../features/auth/authSlice';

export default function HomePage() {
  const router   = useRouter();
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(restoreUser());
    const storedToken = localStorage.getItem('token');
    if (storedToken) router.push('/projects');
    else             router.push('/login');
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center animate-bounce-in"
          style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}>
          <svg width="24" height="24" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <p className="text-slate-400 text-sm font-medium animate-fade-in">Loading…</p>
      </div>
    </div>
  );
}
