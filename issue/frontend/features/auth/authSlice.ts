/**
 * features/auth/authSlice.ts
 * Handles authentication state with real backend API
 */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from '../../store';
import type { User, Role } from '../../lib/mockData';
import { apiClient } from '../../services/apiClient';

type ApiSuccess<T> = { success: true; message: string; data: T };
type AuthPayload = { token: string; refreshToken: string; user: User };

interface AuthState {
  token: string | null;
  user: User | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
  user:  null,
  loading: false,
  error: null,
};

// ── Thunks ─────────────────────────────────────────────────────────────────────
export const loginThunk = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const res = await apiClient.post<ApiSuccess<AuthPayload>>('/api/auth/login', { email, password });
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      return { token, user };
    } catch (err: unknown) {
      return rejectWithValue((err as Error).message);
    }
  }
);

export const registerThunk = createAsyncThunk(
  'auth/register',
  async ({ name, email, password, role }: { name: string; email: string; password: string; role: Role }, { rejectWithValue }) => {
    try {
      const res = await apiClient.post<ApiSuccess<AuthPayload>>('/api/auth/register', {
        name,
        email,
        password,
        role,
      });
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      return { token, user };
    } catch (err: unknown) {
      return rejectWithValue((err as Error).message);
    }
  }
);

export const fetchMeThunk = createAsyncThunk(
  'auth/fetchMe',
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiClient.get<ApiSuccess<{ user: User }>>('/api/auth/me');
      localStorage.setItem('user', JSON.stringify(res.data.user));
      return res.data.user;
    } catch (err: unknown) {
      return rejectWithValue((err as Error).message);
    }
  }
);

// ── Slice ──────────────────────────────────────────────────────────────────────
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.token = null;
      state.user  = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
    restoreUser(state) {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      if (stored) state.user = JSON.parse(stored);
    },
    clearError(state) { state.error = null; },
  },
  extraReducers: builder => {
    builder
      .addCase(loginThunk.pending,    s => { s.loading = true;  s.error = null; })
      .addCase(loginThunk.fulfilled,  (s, a) => { s.loading = false; s.token = a.payload.token; s.user = a.payload.user; })
      .addCase(loginThunk.rejected,   (s, a) => { s.loading = false; s.error = a.payload as string; })
      .addCase(registerThunk.pending,   s => { s.loading = true;  s.error = null; })
      .addCase(registerThunk.fulfilled, (s, a) => { s.loading = false; s.token = a.payload.token; s.user = a.payload.user; })
      .addCase(registerThunk.rejected,  (s, a) => { s.loading = false; s.error = a.payload as string; })
      .addCase(fetchMeThunk.pending,    s => { s.loading = true; })
      .addCase(fetchMeThunk.fulfilled,  (s, a) => { s.loading = false; s.user = a.payload; })
      .addCase(fetchMeThunk.rejected,   (s, a) => {
        s.loading = false;
        s.error = a.payload as string;
        s.token = null;
        s.user = null;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      });
  },
});

export const { logout, restoreUser, clearError } = authSlice.actions;
export default authSlice.reducer;

// ── Selectors ──────────────────────────────────────────────────────────────────
export const selectAuth    = (s: RootState) => s.auth;
export const selectUser    = (s: RootState) => s.auth.user;
export const selectCanEdit = (s: RootState) => !!s.auth.user;
