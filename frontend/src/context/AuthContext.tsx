import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { fetchLogin } from "../mock/auth";
import type { LoginCredentials, User } from "../types/auth";

const STORAGE_KEY = "shipyard-ops.user";

interface AuthContextValue {
  user: User | null;
  initializing: boolean;
  loggingIn: boolean;
  loginError: string;
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => void;
  updateUser: (patch: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw) as User);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setInitializing(false);
  }, []);

  const login = async (credentials: LoginCredentials) => {
    setLoggingIn(true);
    setLoginError("");
    try {
      const loggedInUser = await fetchLogin(credentials);
      setUser(loggedInUser);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(loggedInUser));
      return true;
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "로그인에 실패했습니다.");
      return false;
    } finally {
      setLoggingIn(false);
    }
  };

  const logout = () => {
    setUser(null);
    window.localStorage.removeItem(STORAGE_KEY);
  };

  const updateUser = (patch: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const value = useMemo(
    () => ({ user, initializing, loggingIn, loginError, login, logout, updateUser }),
    [user, initializing, loggingIn, loginError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
