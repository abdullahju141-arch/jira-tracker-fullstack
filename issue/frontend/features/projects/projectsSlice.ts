/**
 * features/projects/projectsSlice.ts
 * Normalized project state with createEntityAdapter
 */
import { createSlice, createAsyncThunk, createEntityAdapter, createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../../store';
import type { Project } from '../../lib/mockData';
import { apiClient } from '../../services/apiClient';

type ApiSuccess<T> = { success: true; message: string; data: T };

// ── Entity Adapter ─────────────────────────────────────────────────────────────
const projectsAdapter = createEntityAdapter<Project>();

// ── Thunks ─────────────────────────────────────────────────────────────────────
export const fetchProjectsThunk = createAsyncThunk(
  'projects/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiClient.get<ApiSuccess<{ projects: Project[] }>>('/api/projects');
      return res.data.projects;
    } catch (err: unknown) {
      return rejectWithValue((err as Error).message);
    }
  }
);

export const createProjectThunk = createAsyncThunk(
  'projects/create',
  async (data: { name: string; description: string }, { rejectWithValue }) => {
    try {
      const res = await apiClient.post<ApiSuccess<{ project: Project }>>('/api/projects', data);
      return res.data.project;
    } catch (err: unknown) {
      return rejectWithValue((err as Error).message);
    }
  }
);

// ── Slice ──────────────────────────────────────────────────────────────────────
interface ProjectsExtraState {
  loading: boolean;
  error: string | null;
}

const projectsSlice = createSlice({
  name: 'projects',
  initialState: projectsAdapter.getInitialState<ProjectsExtraState>({ loading: false, error: null }),
  reducers: {
    updateProject: projectsAdapter.updateOne,
    removeProject: projectsAdapter.removeOne,
  },
  extraReducers: builder => {
    builder
      .addCase(fetchProjectsThunk.pending,   s => { s.loading = true;  s.error = null; })
      .addCase(fetchProjectsThunk.fulfilled, (s, a) => { s.loading = false; projectsAdapter.setAll(s, a.payload); })
      .addCase(fetchProjectsThunk.rejected,  (s, a) => { s.loading = false; s.error = a.payload as string; })
      .addCase(createProjectThunk.fulfilled, (s, a) => { projectsAdapter.addOne(s, a.payload); });
  },
});

export const { updateProject, removeProject } = projectsSlice.actions;
export default projectsSlice.reducer;

// ── Selectors ──────────────────────────────────────────────────────────────────
const projectsSelectors = projectsAdapter.getSelectors<RootState>(s => s.projects);
export const selectAllProjects   = projectsSelectors.selectAll;
export const selectProjectById   = projectsSelectors.selectById;
export const selectProjectsLoading = (s: RootState) => s.projects.loading;
