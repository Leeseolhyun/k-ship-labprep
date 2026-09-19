import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { BadgeCheck, LoaderCircle, Lock, Ship, UserRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { DEMO_CREDENTIALS } from "../mock/auth";

export default function LoginPage() {
  const { user, login, loggingIn, loginError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");

  if (user) {
    const from = (location.state as { from?: string } | null)?.from ?? "/";
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const ok = await login({ employeeId, password });
    if (ok) navigate("/", { replace: true });
  };

  const fillDemo = () => {
    setEmployeeId(DEMO_CREDENTIALS.employeeId);
    setPassword(DEMO_CREDENTIALS.password);
  };

  return (
    <div className="relative flex min-h-screen items-center overflow-hidden bg-slate-950 px-4 py-10">
      <img
        src="/images/shipyard-hero.png"
        alt="항해 중인 선박과 조선소"
        className="absolute inset-0 h-full w-full object-cover opacity-60"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/75 to-slate-900/30" />
      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="hidden max-w-xl text-white lg:block">
          <p className="mb-4 text-xs font-bold tracking-[0.28em] text-orange-300">YARD OPS / DAILY PLAN</p>
          <h1 className="text-5xl font-black leading-[1.12]">현장의 제약을 읽고,<br />오늘의 공정을 다시 잇다.</h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-slate-200">고정 섹터별 익명 집계 생산능력, 정반 공간, 선행 공정을 함께 반영하는 조선 생산운영 플랫폼입니다.</p>
          <div className="mt-8 flex items-center gap-2 text-sm text-slate-200"><BadgeCheck size={18} className="text-orange-300" /> 개인 감시·등급화 없이 운영합니다.</div>
        </div>
        <div className="w-full max-w-sm justify-self-center lg:justify-self-end">
        <div className="mb-7 flex flex-col items-center gap-3 text-white lg:items-start">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500 text-white shadow-lg shadow-orange-500/20">
            <Ship size={24} />
          </span>
          <div className="text-center">
            <p className="text-lg font-bold">조선소 업무지원 시스템</p>
            <p className="text-sm text-slate-300">SHIPYARD OPS PLATFORM</p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-white/20 bg-white/95 p-6 shadow-2xl backdrop-blur"
        >
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              사원번호
            </span>
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 focus-within:border-accent-500 focus-within:ring-1 focus-within:ring-accent-500">
              <UserRound size={15} className="text-gray-400" />
              <input
                type="text"
                required
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="예: EMP-2019-0142"
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

        <p className="mt-4 text-center text-xs text-slate-200">
          사내 사원번호와 비밀번호로 접근합니다.
        </p>
        </div>
      </div>
    </div>
  );
}
