import { create } from "zustand";
import { persist } from "zustand/middleware";

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,

      login: (user, token) => {
        set({ user, token });
      },

      clearAuth: () => {
        set({ user: null, token: null });
      },
    }),
    {
      name: "auth-storage",
    }
  )
);

export default useAuthStore;