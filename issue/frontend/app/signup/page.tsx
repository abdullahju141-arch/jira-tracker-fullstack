'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { registerThunk, clearError, selectAuth } from '../../features/auth/authSlice';
// Roles are simplified: every newly registered user can do everything.

function getStrength(p: string) {
  if (!p) return 0;
  let s = 0;
  if (p.length >= 6)  s++;
  if (p.length >= 10) s++;
  if (/[A-Z]/.test(p) && /[0-9]/.test(p)) s++;
  if (/[^a-zA-Z0-9]/.test(p)) s++;
  return s;
}
const STRENGTH_META = [null,
  { label: 'Weak',      color: '#ef4444' },
  { label: 'Fair',      color: '#f59e0b' },
  { label: 'Good',      color: '#3b82f6' },
  { label: 'Strong 💪', color: '#22c55e' },
];

export default function SignupPage() {
  const router   = useRouter();
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector(selectAuth);

  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [errs,     setErrs]     = useState<Record<string, string>>({});
  const [success,  setSuccess]  = useState(false);

  const strength = getStrength(password);

  useEffect(() => {
    if (localStorage.getItem('token')) router.push('/projects');
  }, []);

  useEffect(() => {
    if (error) { toast.error(error); dispatch(clearError()); }
  }, [error]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim() || name.trim().length < 2) e.name = 'At least 2 characters.';
    if (!/\S+@\S+\.\S+/.test(email))            e.email = 'Enter a valid email.';
    if (password.length < 6)                     e.password = 'Minimum 6 characters.';
    if (password !== confirm)                    e.confirm = 'Passwords do not match.';
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrs(errs); return; }
    setErrs({});
    const res = await dispatch(registerThunk({ name, email, password, role: 'member' }));
    if (registerThunk.fulfilled.match(res)) {
      setSuccess(true);
      toast.success('Account created! Welcome 🎉');
      setTimeout(() => router.push('/projects'), 1200);
    }
  };

  const set = (k: string, v: string) => {
    if (k === 'name')    setName(v);
    if (k === 'email')   setEmail(v);
    if (k === 'password') setPassword(v);
    if (k === 'confirm') setConfirm(v);
    setErrs(prev => ({ ...prev, [k]: '' }));
  };

  const fieldCls = (key: string) =>
    `w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm text-slate-800 bg-white placeholder-slate-400 font-medium input-focus transition-all ${
      errs[key] ? 'border-red-400' : 'border-slate-200'
    }`;

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
            Create an account to get started
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/90 backdrop-blur rounded-2xl shadow-xl shadow-slate-200/80 border border-slate-100 px-6 py-7 sm:p-8">
          {success ? (
            <div className="text-center py-10">
              <div className="w-14 h-14 rounded-full bg-emerald-500 mx-auto flex items-center justify-center mb-4 shadow-md shadow-emerald-500/40">
                <svg
                  width="26"
                  height="26"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="2.5"
                  viewBox="0 0 24 24"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-slate-900">
                Account created!
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Redirecting you to your projects…
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Full name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => set('name', e.target.value)}
                  placeholder="Alex Johnson"
                  className={fieldCls('name')}
                />
                {errs.name && (
                  <p className="text-red-500 text-[11px] mt-1 font-medium">
                    {errs.name}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => set('email', e.target.value)}
                  placeholder="you@example.com"
                  className={fieldCls('email')}
                />
                {errs.email && (
                  <p className="text-red-500 text-[11px] mt-1 font-medium">
                    {errs.email}
                  </p>
                )}
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
                    onChange={e => set('password', e.target.value)}
                    placeholder="Min. 6 characters"
                    className={`${fieldCls('password')} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    {showPw ? 'Hide' : 'Show'}
                  </button>
                </div>
                {password && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[1, 2, 3, 4].map(i => (
                        <div
                          key={i}
                          className="flex-1 h-1 rounded-full transition-all duration-300"
                          style={{
                            background:
                              i <= strength
                                ? STRENGTH_META[strength]?.color ?? '#e2e8f0'
                                : '#e2e8f0',
                          }}
                        />
                      ))}
                    </div>
                    {STRENGTH_META[strength] && (
                      <span
                        className="text-[11px] font-semibold"
                        style={{ color: STRENGTH_META[strength]!.color }}
                      >
                        {STRENGTH_META[strength]!.label}
                      </span>
                    )}
                  </div>
                )}
                {errs.password && (
                  <p className="text-red-500 text-[11px] mt-1 font-medium">
                    {errs.password}
                  </p>
                )}
              </div>

              {/* Confirm */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Confirm password
                </label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => set('confirm', e.target.value)}
                  placeholder="Re-enter password"
                  className={fieldCls('confirm')}
                />
                {errs.confirm && (
                  <p className="text-red-500 text-[11px] mt-1 font-medium">
                    {errs.confirm}
                  </p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/40 hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 focus:ring-offset-slate-50 disabled:bg-indigo-300 disabled:cursor-not-allowed transition"
              >
                {loading ? 'Creating account…' : 'Sign up'}
              </button>
            </form>
          )}
        </div>

        {/* Footer link */}
        <p className="mt-4 text-center text-xs text-slate-500">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-semibold text-indigo-600 hover:text-indigo-700"
          >
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
