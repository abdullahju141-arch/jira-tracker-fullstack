/**
 * store/index.ts
 * Redux store with all slices
 */
import { configureStore } from '@reduxjs/toolkit';
import authReducer     from '../features/auth/authSlice';
import projectsReducer from '../features/projects/projectsSlice';
import issuesReducer   from '../features/issues/issuesSlice';
import commentsReducer from '../features/comments/commentsSlice';
import usersReducer    from '../features/users/usersSlice';

export const store = configureStore({
  reducer: {
    auth:     authReducer,
    projects: projectsReducer,
    issues:   issuesReducer,
    comments: commentsReducer,
    users:    usersReducer,
  },
  middleware: getDefault => getDefault({ serializableCheck: false }),
});

export type RootState    = ReturnType<typeof store.getState>;
export type AppDispatch  = typeof store.dispatch;
