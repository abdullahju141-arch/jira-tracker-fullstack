'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { loginThunk, clearError, selectAuth } from '../../features/auth/authSlice';

export default function LoginPage() {
  const router   = useRouter();
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector(selectAuth);

  const [email,   setEmail]   = useState('alex@example.com');
  const [password, setPassword] = useState('password123');
  const [showPw,  setShowPw]  = useState(false);

  useEffect(() => {
    if (localStorage.getItem('token')) router.push('/projects');
  }, []);

  useEffect(() => {
    if (error) { toast.error(error); dispatch(clearError()); }
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await dispatch(loginThunk({ email, password }));
    if (loginThunk.fulfilled.match(res)) {
      toast.success('Welcome back! 👋');
      router.push('/projects');
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 font-sans"
      style={{
        background:
          'radial-gradient(circle at top left,#eef2ff 0,#e0f2fe 30%,#f9fafb 70%)',
      }}
    >
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-3">
            <svg
              width="24"
              height="24"
              fill="none"
              stroke="#fff"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-slate-900">
            Mini Issue Tracker
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Sign in to manage your projects
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/90 backdrop-blur rounded-2xl shadow-xl shadow-slate-200/80 border border-slate-100 px-6 py-7 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 pr-10 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 text-xs"
                >
                  {showPw ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/40 hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 focus:ring-offset-slate-50 disabled:bg-indigo-300 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Signing in…' : 'Login'}
            </button>
          </form>
        </div>

        {/* Footer link */}
        <p className="mt-4 text-center text-xs text-slate-500">
          Don&apos;t have an account?{' '}
          <Link
            href="/signup"
            className="font-semibold text-indigo-600 hover:text-indigo-700"
          >
            Sign up
          </Link>
        </p>

        {/* Demo hint */}
        <p className="mt-2 text-center text-[11px] text-slate-400">
          Demo user: <span className="font-medium">alex@example.com</span> / password123
        </p>
      </div>
    </div>
  );
}
