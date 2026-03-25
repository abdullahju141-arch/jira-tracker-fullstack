/**
 * features/issues/issuesSlice.ts
 * Normalized issue state with optimistic updates + rollback
 */
import {
  createSlice, createAsyncThunk, createEntityAdapter,
  createSelector, PayloadAction,
} from '@reduxjs/toolkit';
import type { RootState } from '../../store';
import type { Issue, Status, Priority } from '../../lib/mockData';
import { apiClient } from '../../services/apiClient';

type ApiSuccess<T> = { success: true; message: string; data: T };

// ── Entity Adapter ─────────────────────────────────────────────────────────────
const issuesAdapter = createEntityAdapter<Issue>();

// ── Thunks ─────────────────────────────────────────────────────────────────────
export const fetchIssuesThunk = createAsyncThunk(
  'issues/fetchByProject',
  async (projectId: string, { rejectWithValue }) => {
    try {
      const res = await apiClient.get<ApiSuccess<{ issues: Issue[] }>>(`/api/projects/${projectId}/issues`);
      return res.data.issues;
    } catch (err: unknown) {
      return rejectWithValue((err as Error).message);
    }
  }
);

export const createIssueThunk = createAsyncThunk(
  'issues/create',
  async (issue: Omit<Issue, 'id' | 'version' | 'createdAt' | 'updatedAt'>, { rejectWithValue }) => {
    try {
      const res = await apiClient.post<ApiSuccess<{ issue: Issue }>>('/api/issues', issue);
      return res.data.issue;
    } catch (err: unknown) {
      return rejectWithValue((err as Error).message);
    }
  }
);

export const updateIssueThunk = createAsyncThunk(
  'issues/update',
  async ({ id, changes }: { id: string; changes: Partial<Issue> }, { getState, rejectWithValue }) => {
    const state = getState() as RootState;
    const original = state.issues.entities[id];
    try {
      const res = await apiClient.patch<ApiSuccess<{ issue: Issue }>>(`/api/issues/${id}`, changes);
      return { id, changes: res.data.issue, original };
    } catch (err: unknown) {
      return rejectWithValue({ message: (err as Error).message, original });
    }
  }
);

export const deleteIssueThunk = createAsyncThunk(
  'issues/delete',
  async ({ id, original }: { id: string; original: Issue }, { rejectWithValue }) => {
    try {
      await apiClient.delete<ApiSuccess<null>>(`/api/issues/${id}`);
      return id;
    } catch (err: unknown) {
      return rejectWithValue({ message: (err as Error).message, original });
    }
  }
);

// ── Slice ──────────────────────────────────────────────────────────────────────
interface IssuesExtraState {
  loading: boolean;
  error: string | null;
  activeProjectId: string | null;
  searchQuery: string;
  filterLabels: string[];
  filterAssignee: string | null;
  filterStatus: Status | null;
  filterPriority: Priority | null;
}

const issuesSlice = createSlice({
  name: 'issues',
  initialState: issuesAdapter.getInitialState<IssuesExtraState>({
    loading: false, error: null, activeProjectId: null,
    searchQuery: '', filterLabels: [], filterAssignee: null,
    filterStatus: null, filterPriority: null,
  }),
  reducers: {
    // WebSocket merge
    wsIssueUpdated(state, action: PayloadAction<Issue>) {
      issuesAdapter.upsertOne(state, action.payload);
    },
    wsIssueDeleted(state, action: PayloadAction<{ id: string }>) {
      issuesAdapter.removeOne(state, action.payload.id);
    },
    setActiveProject(state, action: PayloadAction<string>) {
      state.activeProjectId = action.payload;
    },
    // Filters
    setSearch(state, a: PayloadAction<string>)           { state.searchQuery = a.payload; },
    setFilterLabels(state, a: PayloadAction<string[]>)   { state.filterLabels = a.payload; },
    setFilterAssignee(state, a: PayloadAction<string|null>) { state.filterAssignee = a.payload; },
    setFilterStatus(state, a: PayloadAction<Status|null>)   { state.filterStatus = a.payload; },
    setFilterPriority(state, a: PayloadAction<Priority|null>) { state.filterPriority = a.payload; },
    clearFilters(state) {
      state.searchQuery = ''; state.filterLabels = [];
      state.filterAssignee = null; state.filterStatus = null; state.filterPriority = null;
    },
  },
  extraReducers: builder => {
    builder
      // Fetch
      .addCase(fetchIssuesThunk.pending,   s => { s.loading = true; s.error = null; })
      .addCase(fetchIssuesThunk.fulfilled, (s, a) => { s.loading = false; issuesAdapter.setAll(s, a.payload); })
      .addCase(fetchIssuesThunk.rejected,  (s, a) => { s.loading = false; s.error = a.payload as string; })

      // Create — optimistic add, then replace with real or rollback
      .addCase(createIssueThunk.pending,   (s, a) => {
        const temp: Issue = {
          ...(a.meta.arg as Issue), id: `temp-${Date.now()}`,
          version: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        };
        issuesAdapter.addOne(s, temp);
      })
      .addCase(createIssueThunk.fulfilled, (s, a) => {
        // Remove temp, add real
        const tempId = Object.values(s.entities).find(i => i?.title === a.payload.title && i.id.startsWith('temp-'))?.id;
        if (tempId) issuesAdapter.removeOne(s, tempId);
        issuesAdapter.addOne(s, a.payload);
      })
      .addCase(createIssueThunk.rejected, (s, a) => {
        const tempId = Object.values(s.entities).find(i => i?.id.startsWith('temp-'))?.id;
        if (tempId) issuesAdapter.removeOne(s, tempId);
      })

      // Update — optimistic, rollback on fail
      .addCase(updateIssueThunk.pending, (s, a) => {
        issuesAdapter.updateOne(s, { id: a.meta.arg.id, changes: a.meta.arg.changes });
      })
      .addCase(updateIssueThunk.fulfilled, (s, a) => {
        issuesAdapter.updateOne(s, { id: a.payload.id, changes: a.payload.changes });
      })
      .addCase(updateIssueThunk.rejected, (s, a) => {
        const { original } = a.payload as { message: string; original: Issue };
        if (original) issuesAdapter.upsertOne(s, original);
      })

      // Delete — optimistic, rollback on fail
      .addCase(deleteIssueThunk.pending,   (s, a) => { issuesAdapter.removeOne(s, a.meta.arg.id); })
      .addCase(deleteIssueThunk.fulfilled, () => {})
      .addCase(deleteIssueThunk.rejected,  (s, a) => {
        const { original } = a.payload as { message: string; original: Issue };
        if (original) issuesAdapter.addOne(s, original);
      });
  },
});

export const {
  wsIssueUpdated, wsIssueDeleted, setActiveProject,
  setSearch, setFilterLabels, setFilterAssignee,
  setFilterStatus, setFilterPriority, clearFilters,
} = issuesSlice.actions;
export default issuesSlice.reducer;

// ── Selectors ──────────────────────────────────────────────────────────────────
const issuesSelectors = issuesAdapter.getSelectors<RootState>(s => s.issues);
export const selectAllIssues    = issuesSelectors.selectAll;
export const selectIssueById    = issuesSelectors.selectById;
export const selectIssuesLoading = (s: RootState) => s.issues.loading;

// Memoized filtered selector
export const selectFilteredIssues = createSelector(
  [
    issuesSelectors.selectAll,
    (s: RootState) => s.issues.searchQuery,
    (s: RootState) => s.issues.filterLabels,
    (s: RootState) => s.issues.filterAssignee,
    (s: RootState) => s.issues.filterStatus,
    (s: RootState) => s.issues.filterPriority,
    (s: RootState) => s.issues.activeProjectId,
  ],
  (issues, search, labels, assignee, status, priority, projectId) =>
    issues.filter(i => {
      if (projectId && i.projectId !== projectId) return false;
      if (search  && !i.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (labels.length && !labels.every(l => i.labels.includes(l))) return false;
      if (assignee && i.assigneeId !== assignee) return false;
      if (status   && i.status !== status)       return false;
      if (priority && i.priority !== priority)   return false;
      return true;
    })
);

// Memoized by-status selector
export const selectIssuesByStatus = createSelector(
  [selectFilteredIssues, (_: RootState, status: Status) => status],
  (issues, status) => issues.filter(i => i.status === status)
);

export const selectFilters = (s: RootState) => ({
  search: s.issues.searchQuery,
  labels: s.issues.filterLabels,
  assignee: s.issues.filterAssignee,
  status: s.issues.filterStatus,
  priority: s.issues.filterPriority,
});
