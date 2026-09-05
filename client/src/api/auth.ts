import { api } from './client';
import type { User } from './types';

export const authApi = {
  me: () => api.get<{ user: User }>('/auth/me'),
  register: (input: { email: string; password: string; name: string }) =>
    api.post<{ user: User }>('/auth/register', input),
  login: (input: { email: string; password: string }) =>
    api.post<{ user: User }>('/auth/login', input),
  logout: () => api.post<void>('/auth/logout'),
};
