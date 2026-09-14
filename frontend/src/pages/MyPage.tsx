import { useState, type FormEvent } from "react";
import {
  Briefcase,
  Calendar,
  CheckCircle2,
  IdCard,
  Mail,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const RECENT_ACTIVITY = [
  { id: "a1", time: "오늘 09:12", text: "오션스타 8K LNGC 도면 규정 검토를 요청했습니다." },
  { id: "a2", time: "어제 16:40", text: "화물창 블록 취부 및 용접 작업 인력 배정을 완료했습니다." },
  { id: "a3", time: "2026-09-10", text: "핵심 인력 업무량 초과 알림을 확인했습니다." },
];

export default function MyPage() {
  const { user, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [saved, setSaved] = useState(false);

  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwMessage, setPwMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  if (!user) return null;

  const saveProfile = (e: FormEvent) => {
    e.preventDefault();
    updateUser({ name, phone });
    setEditing(false);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  };

  const changePassword = (e: FormEvent) => {
    e.preventDefault();
    if (pwForm.next.length < 8) {
      setPwMessage({ type: "error", text: "새 비밀번호는 8자 이상이어야 합니다." });
      return;
    }
    if (pwForm.next !== pwForm.confirm) {
      setPwMessage({ type: "error", text: "새 비밀번호가 일치하지 않습니다." });
      return;
    }
    setPwMessage({ type: "success", text: "비밀번호가 변경되었습니다. (데모)" });
    setPwForm({ current: "", next: "", confirm: "" });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">마이페이지</h1>
        <p className="mt-1 text-sm text-gray-500">계정 정보와 최근 활동을 확인합니다.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800">기본 정보</h2>
            {!editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-xs font-medium text-accent-600 hover:text-accent-700"
              >
                정보 수정
              </button>
            )}
          </div>

          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-100 text-2xl font-bold text-accent-700">
              {user.name.slice(0, 1)}
            </span>
            <div>
              <p className="text-base font-bold text-gray-900">{user.name}</p>
              <p className="text-sm text-gray-500">
                {user.department} · {user.position}
              </p>
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
                <ShieldCheck size={11} />
                {user.role}
              </span>
            </div>
          </div>

          {editing ? (
            <form onSubmit={saveProfile} className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-500">이름</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-500">연락처</span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
                />
              </label>
              <div className="flex gap-2 sm:col-span-2">
                <button
                  type="submit"
                  className="rounded-lg bg-accent-600 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-700"
                >
                  저장
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setName(user.name);
                    setPhone(user.phone);
                    setEditing(false);
                  }}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  취소
                </button>
              </div>
            </form>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoRow icon={Mail} label="이메일" value={user.email} />
              <InfoRow icon={Phone} label="연락처" value={user.phone} />
              <InfoRow icon={IdCard} label="사번" value={user.employeeId} />
              <InfoRow icon={Briefcase} label="소속" value={`${user.department} · ${user.position}`} />
              <InfoRow icon={Calendar} label="입사일" value={user.joinedAt} />
            </div>
          )}

          {saved && (
            <p className="flex items-center gap-1.5 text-sm text-emerald-600">
              <CheckCircle2 size={14} />
              변경사항이 저장되었습니다.
            </p>
          )}
        </section>

        <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-800">비밀번호 변경</h2>
          <form onSubmit={changePassword} className="space-y-2.5">
            <input
              type="password"
              required
              placeholder="현재 비밀번호"
              value={pwForm.current}
              onChange={(e) => setPwForm((p) => ({ ...p, current: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
            />
            <input
              type="password"
              required
              placeholder="새 비밀번호 (8자 이상)"
              value={pwForm.next}
              onChange={(e) => setPwForm((p) => ({ ...p, next: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
            />
            <input
              type="password"
              required
              placeholder="새 비밀번호 확인"
              value={pwForm.confirm}
              onChange={(e) => setPwForm((p) => ({ ...p, confirm: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
            />
            {pwMessage && (
              <p className={`text-xs ${pwMessage.type === "error" ? "text-red-500" : "text-emerald-600"}`}>
                {pwMessage.text}
              </p>
            )}
            <button
              type="submit"
              className="w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
            >
              비밀번호 변경
            </button>
          </form>
        </section>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-800">최근 활동</h2>
        <div className="space-y-3">
          {RECENT_ACTIVITY.map((a) => (
            <div key={a.id} className="flex gap-3 text-sm">
              <span className="w-24 shrink-0 text-xs text-gray-400">{a.time}</span>
              <p className="text-gray-600">{a.text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg bg-gray-50 px-3 py-2.5">
      <Icon size={15} className="text-gray-400" />
      <div>
        <p className="text-[11px] text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-800">{value}</p>
      </div>
    </div>
  );
}
