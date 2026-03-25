import { createSlice, createAsyncThunk, createEntityAdapter } from '@reduxjs/toolkit';
import type { RootState } from '../../store';
import type { User } from '../../lib/mockData';
import { apiClient } from '../../services/apiClient';

type ApiSuccess<T> = { success: true; message: string; data: T };

const usersAdapter = createEntityAdapter<User>();

export const fetchUsersThunk = createAsyncThunk('users/fetchAll', async (_, { rejectWithValue }) => {
  try {
    const res = await apiClient.get<ApiSuccess<{ users: User[] }>>('/api/users');
    return res.data.users;
  } catch (err: unknown) {
    return rejectWithValue((err as Error).message);
  }
});

const usersSlice = createSlice({
  name: 'users',
  initialState: usersAdapter.getInitialState<{ loaded: boolean }>({ loaded: false }),
  reducers: {},
  extraReducers: b => {
    b.addCase(fetchUsersThunk.fulfilled, (s, a) => { s.loaded = true; usersAdapter.setAll(s, a.payload); });
  },
});

export default usersSlice.reducer;

const usersSelectors = usersAdapter.getSelectors<RootState>(s => s.users);
export const selectAllUsers  = usersSelectors.selectAll;
export const selectUserById  = usersSelectors.selectById;
