import { createSlice, createAsyncThunk, createEntityAdapter, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../../store';
import type { Comment } from '../../lib/mockData';
import { apiClient } from '../../services/apiClient';

type ApiSuccess<T> = { success: true; message: string; data: T };

const commentsAdapter = createEntityAdapter<Comment>();

export const fetchCommentsThunk = createAsyncThunk(
  'comments/fetchByIssue',
  async (issueId: string, { rejectWithValue }) => {
    try {
      const res = await apiClient.get<ApiSuccess<{ comments: Comment[] }>>(`/api/issues/${issueId}/comments`);
      return res.data.comments;
    } catch (err: unknown) { return rejectWithValue((err as Error).message); }
  }
);

export const addCommentThunk = createAsyncThunk(
  'comments/add',
  async ({ issueId, message }: { issueId: string; userId: string; message: string }, { rejectWithValue }) => {
    try {
      const res = await apiClient.post<ApiSuccess<{ comment: Comment }>>(`/api/issues/${issueId}/comments`, { message });
      return res.data.comment;
    } catch (err: unknown) { return rejectWithValue((err as Error).message); }
  }
);

const commentsSlice = createSlice({
  name: 'comments',
  initialState: commentsAdapter.getInitialState<{ loading: boolean; error: string | null }>({ loading: false, error: null }),
  reducers: {
    wsCommentAdded(state, action: PayloadAction<Comment>) {
      commentsAdapter.addOne(state, action.payload);
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchCommentsThunk.pending,   s => { s.loading = true; })
      .addCase(fetchCommentsThunk.fulfilled, (s, a) => { s.loading = false; commentsAdapter.upsertMany(s, a.payload); })
      .addCase(fetchCommentsThunk.rejected,  (s, a) => { s.loading = false; s.error = a.payload as string; })
      .addCase(addCommentThunk.fulfilled,    (s, a) => { commentsAdapter.addOne(s, a.payload); });
  },
});

export const { wsCommentAdded } = commentsSlice.actions;
export default commentsSlice.reducer;

const commentsSelectors = commentsAdapter.getSelectors<RootState>(s => s.comments);
export const selectCommentsByIssue = (issueId: string) => (s: RootState) =>
  commentsSelectors.selectAll(s).filter(c => c.issueId === issueId);
