import { Award, Briefcase, Star, X } from "lucide-react";
import { GRADE_COLOR, GRADE_LABEL, getGrade, getGradeScore } from "../../lib/grading";
import type { Worker } from "../../types/worker";

export default function WorkerDetailPanel({
  worker,
  onClose,
}: {
  worker: Worker;
  onClose: () => void;
}) {
  const grade = getGrade(worker);
  const gradeScore = getGradeScore(worker);
  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-black/30"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside className="flex h-full w-full max-w-sm flex-col overflow-y-auto bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <p className="text-sm font-semibold text-gray-800">인원 상세 정보</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col items-center gap-2 border-b border-gray-100 px-5 py-6">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-50 text-xl font-bold text-accent-700">
            {worker.name.slice(0, 1)}
          </span>
          <p className="text-base font-bold text-gray-900">{worker.name}</p>
          <p className="text-sm text-gray-500">{worker.jobType}</p>
          <div className="flex items-center gap-1.5">
            <span
              className={[
                "rounded-full px-2.5 py-0.5 text-xs font-medium",
                worker.available
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-gray-100 text-gray-500",
              ].join(" ")}
            >
              {worker.available ? "투입 가능" : "투입 불가"}
            </span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${GRADE_COLOR[grade]}`}>
              {GRADE_LABEL[grade]} · {gradeScore}점
            </span>
          </div>
        </div>

        <div className="space-y-6 px-5 py-5">
          <section>
            <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-800">
              <Star size={15} className="text-accent-500" />
              숙련도 및 경력
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>숙련도 점수</span>
              <span className="font-semibold text-gray-900">
                {worker.skillLevel} / 100
              </span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-accent-500"
                style={{ width: `${worker.skillLevel}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-gray-600">
              경력 <b className="text-gray-900">{worker.careerYears}년</b>
            </p>
          </section>

          <section>
            <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-800">
              <Award size={15} className="text-accent-500" />
              보유 자격증
            </div>
            {worker.certifications.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {worker.certifications.map((c) => (
                  <span
                    key={c}
                    className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600"
                  >
                    {c}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">등록된 자격증이 없습니다.</p>
            )}
          </section>

          <section>
            <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-800">
              <Briefcase size={15} className="text-accent-500" />
              경력 사항
            </div>
            <ul className="space-y-1.5">
              {worker.careerHistory.map((item) => (
                <li key={item} className="flex gap-2 text-sm text-gray-600">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gray-300" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <div className="mb-2 text-sm font-semibold text-gray-800">
              특기 공정
            </div>
            <div className="flex flex-wrap gap-1.5">
              {worker.specialties.map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-accent-50 px-2.5 py-1 text-xs font-medium text-accent-700"
                >
                  {s}
                </span>
              ))}
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}
