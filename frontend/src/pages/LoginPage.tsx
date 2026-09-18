import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { LoaderCircle, Lock, Mail, Ship } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { DEMO_CREDENTIALS } from "../mock/auth";

export default function LoginPage() {
  const { user, login, loggingIn, loginError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  if (user) {
    const from = (location.state as { from?: string } | null)?.from ?? "/";
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const ok = await login({ email, password });
    if (ok) navigate("/", { replace: true });
  };

  const fillDemo = () => {
    setEmail(DEMO_CREDENTIALS.email);
    setPassword(DEMO_CREDENTIALS.password);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-600 text-white">
            <Ship size={24} />
          </span>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">조선소 업무지원 시스템</p>
            <p className="text-sm text-gray-400">SHIPYARD OPS PLATFORM</p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              이메일
            </span>
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 focus-within:border-accent-500 focus-within:ring-1 focus-within:ring-accent-500">
              <Mail size={15} className="text-gray-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@shipyard-ops.com"
                className="w-full text-sm text-gray-800 outline-none"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              비밀번호
            </span>
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 focus-within:border-accent-500 focus-within:ring-1 focus-within:ring-accent-500">
              <Lock size={15} className="text-gray-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full text-sm text-gray-800 outline-none"
              />
            </div>
          </label>

          {loginError && <p className="text-sm text-red-500">{loginError}</p>}

          <button
            type="submit"
            disabled={loggingIn}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loggingIn && <LoaderCircle size={16} className="animate-spin" />}
            {loggingIn ? "로그인 중..." : "로그인"}
          </button>

          <button
            type="button"
            onClick={fillDemo}
            className="w-full text-center text-xs font-medium text-gray-400 hover:text-accent-600"
          >
            데모 계정 정보 자동 입력
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-gray-400">
          본 시스템은 사내 인증 정보로만 접근할 수 있습니다.
        </p>
      </div>
    </div>
  );
}
