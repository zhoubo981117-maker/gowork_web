import { createContext } from "react";
import type { User } from "../types";

interface AuthContextValue {
  token: string | null;
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue>(null!);
