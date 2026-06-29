import { create } from "zustand"

interface AuthUser {
  id: string
  email: string
}

interface AuthStore {
  user: AuthUser | null
  accessToken: string | null
  setAuth: (user: AuthUser, token: string) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  accessToken: null,

  setAuth(user, token) {
    set({ user, accessToken: token })
  },

  clearAuth() {
    set({ user: null, accessToken: null })
  },
}))
