'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchProjectsThunk, createProjectThunk, selectAllProjects, selectProjectsLoading } from '../../features/projects/projectsSlice';
import { fetchUsersThunk } from '../../features/users/usersSlice';
import { logout, selectUser, restoreUser } from '../../features/auth/authSlice';
import type { Project } from '../../lib/mockData';

export default function ProjectsPage() {
  const router   = useRouter();
  const dispatch = useAppDispatch();
  const user     = useAppSelector(selectUser);
  const projects = useAppSelector(selectAllProjects);
  const loading  = useAppSelector(selectProjectsLoading);

  const [showCreate, setShowCreate] = useState(false);
  const [newName,    setNewName]    = useState('');
  const [newDesc,    setNewDesc]    = useState('');
  const [creating,   setCreating]   = useState(false);
  const [menuOpen,   setMenuOpen]   = useState(false);

  useEffect(() => {
    dispatch(restoreUser());
    if (!localStorage.getItem('token')) { router.push('/login'); return; }
    dispatch(fetchProjectsThunk());
    dispatch(fetchUsersThunk());
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    toast.success('Logged out');
    router.push('/login');
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const res = await dispatch(createProjectThunk({ name: newName.trim(), description: newDesc.trim() }));
    setCreating(false);
    if (createProjectThunk.fulfilled.match(res)) {
      toast.success('Project created! 🎉');
      setShowCreate(false); setNewName(''); setNewDesc('');
    }
  };

  const COLOR_RING = ['#4f46e5','#7c3aed','#0891b2','#059669','#dc2626','#d97706','#be185d','#0d9488'];

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* ── Top Nav ── */}
      <nav className="sticky top-0 z-[100] h-[60px] bg-white border-b border-slate-100 flex items-center justify-between px-7">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[9px] flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}>
            <svg width="16" height="16" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <span className="font-extrabold text-primary-600 text-[15px]">Issue Tracker</span>
        </div>
        <div className="flex items-center gap-3.5">
          {/* Live indicator */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 border border-green-200">
            <span className="w-[7px] h-[7px] rounded-full bg-green-500 animate-pulse" />
            <span className="text-[12px] font-bold text-green-700">Live</span>
          </div>
          {/* Avatar + menu */}
          <div className="relative">
            <button onClick={() => setMenuOpen(v => !v)} className="focus:outline-none">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
                style={{ background: user?.color || '#4f46e5' }}>
                {user?.initials || '?'}
              </div>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-11 bg-white border border-slate-200 rounded-xl shadow-modal py-1.5 min-w-[180px] z-[300] animate-fade-in">
                <div className="px-4 py-2.5 border-b border-slate-100">
                  <p className="text-[13px] font-bold text-slate-800">{user?.name}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{user?.email}</p>
                </div>
                <button onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] font-semibold text-red-500 hover:bg-red-50 transition-colors text-left">
                  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
                  </svg>
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-[1280px] mx-auto px-8 py-10">
        <div className="flex items-start justify-between mb-9 animate-fade-up">
          <div>
            <h1 className="text-[30px] font-extrabold text-slate-900 mb-1.5">Projects</h1>
            <p className="text-slate-500 text-[15px]">Manage your issue tracking projects</p>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', boxShadow: '0 4px 16px rgba(79,70,229,0.30)' }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Create Project
          </button>
        </div>

        {/* Project grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={`bg-white rounded-[14px] p-6 border border-slate-100 animate-fade-up anim-${(i % 4) + 1}`}>
                  <div className="w-10 h-10 rounded-xl bg-slate-200 animate-shimmer mb-4" />
                  <div className="h-4 w-3/5 bg-slate-200 animate-shimmer rounded mb-2" />
                  <div className="h-3 w-4/5 bg-slate-100 animate-shimmer rounded mb-4" />
                  <div className="h-3 w-2/5 bg-slate-100 animate-shimmer rounded" />
                </div>
              ))
            : projects.map((p, i) => (
                <ProjectCard key={p.id} project={p} index={i} />
              ))}
        </div>
      </main>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-5 animate-fade-in"
          style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(3px)' }}
          onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="bg-white rounded-2xl p-8 w-full max-w-[440px] shadow-modal animate-fade-up">
            <h2 className="text-[20px] font-extrabold text-slate-900 mb-5">New Project</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Project name *</label>
                <input type="text" value={newName} onChange={e => setNewName(e.target.value)} autoFocus
                  placeholder="e.g. Website Redesign"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 bg-white font-medium input-focus" />
              </div>
              <div>
                <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Description</label>
                <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={3}
                  placeholder="What's this project about?"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 bg-white font-medium resize-y input-focus" />
              </div>
            </div>
            <div className="flex justify-end gap-2.5 mt-6">
              <button onClick={() => setShowCreate(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleCreate} disabled={!newName.trim() || creating}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all flex items-center gap-2"
                style={{ background: newName.trim() && !creating ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : '#a5b4fc', cursor: newName.trim() && !creating ? 'pointer' : 'not-allowed' }}>
                {creating && <svg className="animate-spin w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>}
                {creating ? 'Creating…' : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project, index }: { project: Project; index: number }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link href={`/projects/${project.id}`}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      className={`block bg-white rounded-[14px] p-6 border border-slate-100 transition-all duration-200 animate-fade-up anim-${(index % 4) + 1}`}
      style={{ boxShadow: hovered ? '0 8px 28px rgba(79,70,229,0.13)' : '0 1px 4px rgba(0,0,0,0.06)', transform: hovered ? 'translateY(-2px)' : 'translateY(0)' }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: `${project.color}18` }}>
        <svg width="19" height="19" fill="none" stroke={project.color} strokeWidth="2" viewBox="0 0 24 24">
          <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
          <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
        </svg>
      </div>
      <h3 className="text-[15px] font-bold text-slate-900 mb-1">{project.name}</h3>
      {project.description && <p className="text-[13px] text-slate-500 mb-3.5 leading-[1.55] line-clamp-2">{project.description}</p>}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: `${project.color}15`, color: project.color }}>
          {project.issueCount} issues
        </span>
        <span className="text-[11px] text-slate-400">Updated {project.updatedAt}</span>
      </div>
    </Link>
  );
}
