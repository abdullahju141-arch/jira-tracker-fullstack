'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCorners, useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { restoreUser, logout, selectUser, selectCanEdit } from '../../../features/auth/authSlice';
import { fetchProjectsThunk, selectProjectById } from '../../../features/projects/projectsSlice';
import {
  fetchIssuesThunk, updateIssueThunk, deleteIssueThunk, createIssueThunk,
  selectFilteredIssues, selectIssuesLoading, selectFilters,
  setSearch, setFilterLabels, setFilterAssignee, setFilterStatus, setFilterPriority,
  clearFilters, setActiveProject, wsIssueUpdated, wsIssueDeleted,
} from '../../../features/issues/issuesSlice';
import { fetchCommentsThunk, addCommentThunk, wsCommentAdded, selectCommentsByIssue } from '../../../features/comments/commentsSlice';
import { fetchUsersThunk, selectAllUsers } from '../../../features/users/usersSlice';
import { socketClient } from '../../../services/socketClient';
import type { Issue, Status, Priority } from '../../../lib/mockData';
import { PRIORITY_CONFIG, LABEL_CONFIG, STATUS_CONFIG, ALL_LABELS } from '../../../lib/mockData';

const COLUMNS: { id: Status; label: string; color: string }[] = [
  { id: 'backlog',      label: 'Backlog',      color: '#6366f1' },
  { id: 'in-progress',  label: 'In Progress',  color: '#f59e0b' },
  { id: 'done',         label: 'Done',         color: '#22c55e' },
];

// ── Main Board Page ────────────────────────────────────────────────────────────
export default function BoardPage() {
  const params   = useParams();
  const router   = useRouter();
  const dispatch = useAppDispatch();
  const projectId = params.id as string;

  const user    = useAppSelector(selectUser);
  const canEdit = useAppSelector(selectCanEdit);
  const project = useAppSelector(s => selectProjectById(s, projectId));
  const issues  = useAppSelector(selectFilteredIssues);
  const loading = useAppSelector(selectIssuesLoading);
  const filters = useAppSelector(selectFilters);
  const users   = useAppSelector(selectAllUsers);

  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [showNewIssue,  setShowNewIssue]  = useState(false);
  const [activeCard,    setActiveCard]    = useState<Issue | null>(null);
  const [menuOpen,      setMenuOpen]      = useState(false);
  const [wsStatus,      setWsStatus]      = useState<'connected' | 'disconnected'>('disconnected');

  useEffect(() => {
    dispatch(restoreUser());
    if (!localStorage.getItem('token')) { router.push('/login'); return; }
    dispatch(fetchProjectsThunk());
    dispatch(fetchUsersThunk());
    dispatch(fetchIssuesThunk(projectId));
    dispatch(setActiveProject(projectId));
  }, [projectId]);

  // WebSocket
  useEffect(() => {
    socketClient.connect(projectId);
    setWsStatus('connected');
    const unsub = socketClient.onMessage(msg => {
      if (msg.type === 'issue.updated') {
        dispatch(wsIssueUpdated(msg.payload as Issue));
        toast('🔄 Issue updated via WebSocket', { duration: 2500 });
      }
      if (msg.type === 'issue.deleted') {
        dispatch(wsIssueDeleted(msg.payload as { id: string }));
      }
      if (msg.type === 'comment.added') {
        dispatch(wsCommentAdded(msg.payload as any));
        toast('💬 New comment via WebSocket', { duration: 2500 });
      }
    });
    return () => { unsub(); socketClient.disconnect(); setWsStatus('disconnected'); };
  }, [projectId]);

  const handleLogout = () => { dispatch(logout()); router.push('/login'); };

  // dnd-kit
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragStart = (e: DragStartEvent) => {
    const issue = issues.find(i => i.id === e.active.id);
    if (issue) setActiveCard(issue);
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveCard(null);
    const { active, over } = e;
    if (!over || !canEdit) return;

    const issueId = active.id as string;
    const overId = over.id as string;

    // Determine target column: either dropped on a column itself,
    // or on another issue card (use that card's status).
    let newStatus: Status | null = null;

    const column = COLUMNS.find(c => c.id === overId);
    if (column) {
      newStatus = column.id;
    } else {
      const overIssue = issues.find(i => i.id === overId);
      if (overIssue) newStatus = overIssue.status;
    }

    if (!newStatus) return;

    const issue = issues.find(i => i.id === issueId);
    if (!issue || issue.status === newStatus) return;

    const res = await dispatch(updateIssueThunk({ id: issueId, changes: { status: newStatus } }));
    if (updateIssueThunk.rejected.match(res)) toast.error('Failed to move issue. Rolled back.');
    else toast.success(`Moved to ${STATUS_CONFIG[newStatus].label}`);
  };

  const colIssues = (status: Status) => issues.filter(i => i.status === status);
  const hasFilters = filters.search || filters.labels.length || filters.assignee || filters.status || filters.priority;

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      {/* ── Nav ── */}
      <nav className="sticky top-0 z-[200] h-[60px] bg-white border-b border-slate-100 flex items-center justify-between px-7 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/projects')}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm font-semibold transition-colors">
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
            Projects
          </button>
          <span className="text-slate-300">/</span>
          <span className="text-sm font-bold text-slate-800">{project?.name ?? 'Loading…'}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 border border-green-200">
            <span className={`w-[7px] h-[7px] rounded-full ${wsStatus === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
            <span className={`text-[12px] font-bold ${wsStatus === 'connected' ? 'text-green-700' : 'text-slate-500'}`}>
              {wsStatus === 'connected' ? 'Live' : 'Offline'}
            </span>
          </div>
          <div className="relative">
            <button onClick={() => setMenuOpen(v => !v)} className="focus:outline-none">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ background: user?.color || '#4f46e5' }}>{user?.initials || '?'}</div>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-10 bg-white border border-slate-200 rounded-xl shadow-modal py-1.5 min-w-[160px] z-[300] animate-fade-in">
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

      {/* ── Filters ── */}
      <div className="px-7 pt-5 pb-0">
        <div className="flex flex-wrap items-center gap-2.5 mb-5">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px] max-w-[340px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input value={filters.search} onChange={e => dispatch(setSearch(e.target.value))}
              placeholder="Search issues…"
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-[13px] text-slate-800 bg-white font-medium input-focus" />
          </div>
          {/* Status */}
          <SelectFilter value={filters.status ?? ''} onChange={v => dispatch(setFilterStatus((v || null) as Status|null))} placeholder="Status">
            {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </SelectFilter>
          {/* Priority */}
          <SelectFilter value={filters.priority ?? ''} onChange={v => dispatch(setFilterPriority((v || null) as Priority|null))} placeholder="Priority">
            {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </SelectFilter>
          {/* Assignee */}
          <SelectFilter value={filters.assignee ?? ''} onChange={v => dispatch(setFilterAssignee(v || null))} placeholder="Assignee">
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </SelectFilter>
          {/* Labels */}
          <SelectFilter value={filters.labels[0] ?? ''} onChange={v => dispatch(setFilterLabels(v ? [v] : []))} placeholder="Label">
            {ALL_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
          </SelectFilter>
          {/* Clear */}
          {hasFilters && (
            <button onClick={() => dispatch(clearFilters())}
              className="px-3 py-2 border border-red-200 bg-red-50 text-red-600 text-[13px] font-semibold rounded-xl hover:bg-red-100 transition-colors">
              Clear
            </button>
          )}
        </div>

        {/* ── Kanban ── */}
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-3 gap-4 pb-24 items-start">
            {COLUMNS.map(col => (
              <KanbanColumn
                key={col.id} col={col}
                issues={colIssues(col.id)}
                loading={loading}
                canEdit={canEdit}
                users={users}
                onCardClick={setSelectedIssue}
              />
            ))}
          </div>
          <DragOverlay>
            {activeCard && <IssueCard issue={activeCard} users={users} isDragging canEdit={false} onClick={() => {}} />}
          </DragOverlay>
        </DndContext>
      </div>

      {/* ── FAB ── */}
      {canEdit && (
        <button onClick={() => setShowNewIssue(true)}
          className="fixed bottom-8 right-8 flex items-center gap-2 px-5 py-3.5 rounded-[28px] text-sm font-bold text-white z-[300] transition-all hover:opacity-90 active:scale-[0.97]"
          style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', boxShadow: '0 8px 28px rgba(79,70,229,0.40)' }}>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Issue
        </button>
      )}

      {/* ── Issue Detail Modal ── */}
      {selectedIssue && (
        <IssueModal
          issue={selectedIssue}
          canEdit={canEdit}
          userId={user?.id ?? 'u1'}
          onClose={() => setSelectedIssue(null)}
          onSave={async (changes) => {
            const res = await dispatch(updateIssueThunk({ id: selectedIssue.id, changes }));
            if (updateIssueThunk.fulfilled.match(res)) {
              toast.success('Issue updated');
              setSelectedIssue(null);
            } else {
              toast.error((res as any).payload || 'Failed to update issue');
            }
          }}
          onDelete={async () => {
            const res = await dispatch(deleteIssueThunk({ id: selectedIssue.id, original: selectedIssue }));
            if (deleteIssueThunk.fulfilled.match(res)) {
              toast.success('Issue deleted');
              setSelectedIssue(null);
            } else {
              toast.error((res as any).payload || 'Failed to delete issue');
            }
          }}
        />
      )}

      {/* ── New Issue Modal ── */}
      {showNewIssue && (
        <NewIssueModal
          projectId={projectId}
          users={users}
          onClose={() => setShowNewIssue(false)}
          onSave={async (data) => {
            const res = await dispatch(createIssueThunk(data));
                if (createIssueThunk.fulfilled.match(res)) {
                  toast.success('Issue created 🎉');
                  setShowNewIssue(false);
                } else {
                  toast.error((res as any).payload || 'Failed to create issue');
                }
          }}
        />
      )}
    </div>
  );
}

// ── Select Filter helper ───────────────────────────────────────────────────────
function SelectFilter({ value, onChange, placeholder, children }: any) {
  return (
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)}
        className="pl-3.5 pr-8 py-2 border border-slate-200 rounded-xl text-[13px] font-medium text-slate-600 bg-white input-focus appearance-none cursor-pointer min-w-[120px]">
        <option value="">{placeholder}</option>
        {children}
      </select>
      <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"
        width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </div>
  );
}

// ── Kanban Column ──────────────────────────────────────────────────────────────
function KanbanColumn({ col, issues, loading, canEdit, users, onCardClick }: {
  col: { id: Status; label: string; color: string };
  issues: Issue[]; loading: boolean; canEdit: boolean; users: { id: string; name: string; color: string; initials: string }[];
  onCardClick: (i: Issue) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });

  return (
    <SortableContext id={col.id} items={issues.map(i => i.id)} strategy={verticalListSortingStrategy}>
      <div
        ref={setNodeRef}
        className={`rounded-[14px] p-4 min-h-[300px] transition-all duration-200 border-2 ${
          isOver ? 'border-primary-400 bg-primary-50/50' : 'border-transparent'
        }`}
        style={{ background: '#f1f5f9' }}
        id={col.id}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: col.color }} />
            <span className="text-[14px] font-bold text-slate-600">{col.label}</span>
          </div>
          <span className="bg-white border border-slate-200 text-slate-500 text-[12px] font-bold px-2 py-0.5 rounded-full">
            {issues.length}
          </span>
        </div>

        <div className="flex flex-col gap-2.5">
          {loading
            ? Array.from({ length: col.id === 'backlog' ? 3 : col.id === 'in-progress' ? 2 : 1 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-3.5 border border-slate-100">
                  <div className="h-3.5 w-3/4 bg-slate-200 animate-shimmer rounded mb-2" />
                  <div className="flex gap-1.5 mb-2.5"><div className="h-5 w-14 bg-slate-100 animate-shimmer rounded-full" /><div className="h-5 w-16 bg-slate-100 animate-shimmer rounded-full" /></div>
                  <div className="h-6 w-6 bg-slate-200 animate-shimmer rounded-full" />
                </div>
              ))
            : issues.length === 0
              ? (
                <div className="text-center py-10 text-slate-300">
                  <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="mx-auto mb-2">
                    <rect x="5" y="2" width="14" height="20" rx="2"/>
                    <line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="15" y2="11"/>
                  </svg>
                  <p className="text-[13px]">No issues</p>
                </div>
              )
              : issues.map(issue => (
                  <SortableIssueCard key={issue.id} issue={issue} users={users} canEdit={canEdit} onClick={() => onCardClick(issue)} />
                ))}
        </div>
      </div>
    </SortableContext>
  );
}

// ── Sortable Card wrapper ──────────────────────────────────────────────────────
function SortableIssueCard({ issue, users, canEdit, onClick }: { issue: Issue; users: { id: string; name: string; color: string; initials: string }[]; canEdit: boolean; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: issue.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}
      {...(canEdit ? { ...attributes, ...listeners } : {})}>
      <IssueCard issue={issue} users={users} isDragging={isDragging} canEdit={canEdit} onClick={onClick} />
    </div>
  );
}

// ── Issue Card ──────────────────────────────────────────────────────────────────
function IssueCard({ issue, users, isDragging, canEdit, onClick }: { issue: Issue; users: { id: string; name: string; color: string; initials: string }[]; isDragging: boolean; canEdit: boolean; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  const pcfg = PRIORITY_CONFIG[issue.priority];
  const assignee = users.find(u => u.id === issue.assigneeId) ?? null;

  return (
    <div onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      className="bg-white rounded-[11px] p-3.5 border border-slate-100 cursor-pointer transition-all duration-150"
      style={{
        boxShadow: isDragging ? '0 12px 40px rgba(79,70,229,0.2)' : hovered ? '0 6px 24px rgba(79,70,229,0.11)' : '0 1px 3px rgba(0,0,0,0.05)',
        transform: hovered && !isDragging ? 'translateY(-1px)' : 'translateY(0)',
        opacity: isDragging ? 0.5 : 1,
      }}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-[13px] font-semibold text-slate-800 leading-snug flex-1">{issue.title}</p>
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5" style={{ background: pcfg.dot }} />
      </div>
      {issue.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2.5">
          {issue.labels.map(l => {
            const lc = LABEL_CONFIG[l] || { bg: '#f3f4f6', text: '#374151' };
            return <span key={l} className="px-2 py-0.5 rounded-full text-[11px] font-bold" style={{ background: lc.bg, color: lc.text }}>{l}</span>;
          })}
        </div>
      )}
      <div className="flex items-center justify-between">
        {assignee
          ? <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: assignee.color }}>{assignee.initials}</div>
          : <div />}
        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: pcfg.bg, color: pcfg.color }}>{pcfg.label}</span>
      </div>
      {canEdit && <p className="text-[10px] text-slate-300 mt-1.5 font-mono">v{issue.version}</p>}
    </div>
  );
}

// ── Issue Modal ────────────────────────────────────────────────────────────────
function IssueModal({ issue, canEdit, userId, onClose, onSave, onDelete }: {
  issue: Issue; canEdit: boolean; userId: string;
  onClose: () => void; onSave: (c: Partial<Issue>) => void; onDelete: () => void;
}) {
  const dispatch = useAppDispatch();
  const [title,    setTitle]   = useState(issue.title);
  const [desc,     setDesc]    = useState(issue.description);
  const [priority, setPriority] = useState(issue.priority);
  const [assignee, setAssignee] = useState(issue.assigneeId ?? '');
  const [status,   setStatus]  = useState(issue.status);
  const [labels,   setLabels]  = useState<string[]>([...issue.labels]);
  const [newCmt,   setNewCmt]  = useState('');
  const users    = useAppSelector(selectAllUsers);
  const comments = useAppSelector(selectCommentsByIssue(issue.id));
  const endRef   = useRef<HTMLDivElement>(null);

  useEffect(() => { dispatch(fetchCommentsThunk(issue.id)); }, [issue.id]);

  const toggleLabel = (l: string) => setLabels(ls => ls.includes(l) ? ls.filter(x => x !== l) : [...ls, l]);
  const findUser = useCallback((id: string) => users.find(u => u.id === id) ?? null, [users]);

  const handleAddComment = async () => {
    if (!newCmt.trim()) return;
    await dispatch(addCommentThunk({ issueId: issue.id, userId, message: newCmt.trim() }));
    setNewCmt('');
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
    toast.success('Comment added');
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-5"
      style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-[18px] w-full max-w-[700px] max-h-[92vh] flex flex-col shadow-modal animate-fade-up">
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-slate-100">
          <div className="flex-1 mr-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Issue Details</span>
              <span className="text-[10px] font-mono text-slate-300">v{issue.version}</span>
              {!canEdit && <span className="text-[10px] font-bold bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">Read only</span>}
            </div>
            <input value={title} onChange={e => setTitle(e.target.value)} disabled={!canEdit}
              className="w-full text-[17px] font-bold text-slate-900 border-none outline-none bg-transparent font-sans leading-snug disabled:opacity-70" />
          </div>
          <div className="flex items-center gap-2">
            {canEdit && (
              <button onClick={() => { if (confirm('Delete this issue?')) onDelete(); }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Description */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} disabled={!canEdit}
              rows={4} placeholder="Add a description…"
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 bg-slate-50 font-medium resize-y input-focus leading-relaxed disabled:opacity-70" />
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Status</label>
              <div className="relative">
                <select value={status} onChange={e => setStatus(e.target.value as Status)} disabled={!canEdit}
                  className="w-full px-3.5 py-2.5 pr-8 border border-slate-200 rounded-xl text-sm font-bold bg-white input-focus appearance-none"
                  style={{ color: STATUS_CONFIG[status].color }}>
                  {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Priority</label>
              <div className="relative">
                <select value={priority} onChange={e => setPriority(e.target.value as Priority)} disabled={!canEdit}
                  className="w-full px-3.5 py-2.5 pr-8 border border-slate-200 rounded-xl text-sm font-bold bg-white input-focus appearance-none"
                  style={{ color: PRIORITY_CONFIG[priority].color }}>
                  {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
            </div>
            <div className="col-span-2">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Assignee</label>
              <div className="relative">
                <select value={assignee} onChange={e => setAssignee(e.target.value)} disabled={!canEdit}
                  className="w-full px-3.5 py-2.5 pr-8 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 bg-white input-focus appearance-none">
                  <option value="">Unassigned</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                </select>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
            </div>
          </div>

          {/* Labels */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Labels</label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_LABELS.map(l => {
                const active = labels.includes(l);
                const lc = LABEL_CONFIG[l] || { bg: '#f3f4f6', text: '#374151' };
                return (
                  <button key={l} type="button" onClick={() => canEdit && toggleLabel(l)} disabled={!canEdit}
                    className="px-2.5 py-0.5 rounded-full text-xs font-bold border-2 transition-all"
                    style={{
                      background: active ? lc.bg : '#fff',
                      color: active ? lc.text : '#94a3b8',
                      borderColor: active ? lc.text + '40' : '#e2e8f0',
                    }}>
                    {active ? '✓ ' : ''}{l}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Comments */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Activity &amp; Comments</label>
              <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{comments.length}</span>
            </div>
            {comments.length === 0
              ? <div className="text-center py-6 text-slate-300">
                  <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="mx-auto mb-2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  <p className="text-[13px]">No comments yet</p>
                </div>
              : <div className="space-y-3 mb-3">
                  {comments.map(c => {
                    const u = findUser(c.userId);
                    return (
                      <div key={c.id} className="flex gap-2.5">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ background: u?.color || '#4f46e5' }}>{u?.initials || '?'}</div>
                        <div className="flex-1">
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-[13px] font-bold text-slate-900">{u?.name || 'Unknown'}</span>
                            <span className="text-[11px] text-slate-400">{new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div className="bg-slate-50 rounded-[0_10px_10px_10px] px-3 py-2 text-[13px] text-slate-700 leading-relaxed">{c.message}</div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={endRef} />
                </div>}
            {/* Comment input */}
            <div className="flex gap-2.5 items-start pt-3 border-t border-slate-100">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                style={{ background: findUser(userId)?.color || '#4f46e5' }}>
                {findUser(userId)?.initials || '?'}
              </div>
              <div className="flex-1">
                <textarea value={newCmt} onChange={e => setNewCmt(e.target.value)}
                  onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleAddComment(); }}
                  placeholder="Write a comment… (Ctrl+Enter)" rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-[13px] text-slate-800 bg-white font-medium resize-none input-focus" />
                <button onClick={handleAddComment} disabled={!newCmt.trim()}
                  className="mt-1.5 px-4 py-1.5 rounded-lg text-[13px] font-bold text-white transition-all"
                  style={{ background: newCmt.trim() ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : '#a5b4fc', cursor: newCmt.trim() ? 'pointer' : 'not-allowed' }}>
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        {canEdit && (
          <div className="flex justify-end gap-2.5 px-6 py-4 border-t border-slate-100">
            <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors">Cancel</button>
            <button onClick={() => onSave({ title, description: desc, priority, assigneeId: assignee || null, status, labels })}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-all"
              style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}>
              Save Changes
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── New Issue Modal ────────────────────────────────────────────────────────────
function NewIssueModal({ projectId, users, onClose, onSave }: {
  projectId: string; users: any[];
  onClose: () => void; onSave: (d: any) => void;
}) {
  const [title,    setTitle]   = useState('');
  const [desc,     setDesc]    = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [status,   setStatus]  = useState<Status>('backlog');
  const [assignee, setAssignee] = useState('');
  const [label,    setLabel]   = useState('');

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-5"
      style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(3px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl p-8 w-full max-w-[480px] shadow-modal animate-fade-up">
        <h2 className="text-[20px] font-extrabold text-slate-900 mb-5">New Issue</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Title *</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} autoFocus placeholder="Issue title…"
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium input-focus" />
          </div>
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium resize-y input-focus" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label:'Status', val:status, set:setStatus, opts:COLUMNS.map(c => ({ v:c.id, l:c.label })) },
              { label:'Priority', val:priority, set:setPriority, opts:Object.entries(PRIORITY_CONFIG).map(([k,v]) => ({ v:k, l:v.label })) },
            ].map(f => (
              <div key={f.label}>
                <label className="block text-[13px] font-bold text-slate-700 mb-1.5">{f.label}</label>
                <div className="relative">
                  <select value={f.val} onChange={e => f.set(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 pr-8 border border-slate-200 rounded-xl text-sm font-medium bg-white input-focus appearance-none">
                    {f.opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                  </select>
                  <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
              </div>
            ))}
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Assignee</label>
              <div className="relative">
                <select value={assignee} onChange={e => setAssignee(e.target.value)}
                  className="w-full px-3.5 py-2.5 pr-8 border border-slate-200 rounded-xl text-sm font-medium bg-white input-focus appearance-none">
                  <option value="">Unassigned</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
                <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
            </div>
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Label</label>
              <div className="relative">
                <select value={label} onChange={e => setLabel(e.target.value)}
                  className="w-full px-3.5 py-2.5 pr-8 border border-slate-200 rounded-xl text-sm font-medium bg-white input-focus appearance-none">
                  <option value="">None</option>
                  {ALL_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2.5 mt-6">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={() => title.trim() && onSave({ title, description: desc, status, priority, assigneeId: assignee || null, labels: label ? [label] : [], projectId })}
            disabled={!title.trim()}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
            style={{ background: title.trim() ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : '#a5b4fc', cursor: title.trim() ? 'pointer' : 'not-allowed' }}>
            Create Issue
          </button>
        </div>
      </div>
    </div>
  );
}
