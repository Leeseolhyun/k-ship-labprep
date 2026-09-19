import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LoaderCircle, Sparkles } from "lucide-react";
import RequirementList from "../components/compliance/RequirementList";
import DrawingUploader from "../components/compliance/DrawingUploader";
import ComplianceResultView from "../components/compliance/ComplianceResultView";
import { useBanner } from "../context/BannerContext";
import { useFactoryContext } from "../context/FactoryContext";
import { fetchComplianceResult } from "../api/complianceApi";
import type {
  ComplianceResult,
  DrawingImage,
  OwnerRequirement,
} from "../types/compliance";

export default function CompliancePage() {
  const [requirements, setRequirements] = useState<OwnerRequirement[]>([
    { id: "req-1", text: "" },
  ]);
  const [images, setImages] = useState<DrawingImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ComplianceResult | null>(null);
  const [error, setError] = useState("");
  const { pushBanner } = useBanner();
  const { operationStarted, startOperations } = useFactoryContext();
  const navigate = useNavigate();

  const hasContent = requirements.some((r) => r.text.trim().length > 0);

  const handleSubmit = async () => {
    if (!hasContent) {
      setError("요청사항을 하나 이상 입력해 주세요.");
      return;
    }
    if (images.length === 0) {
      setError("도면 이미지를 하나 이상 업로드해 주세요.");
      return;
    }
    setError("");
    setLoading(true);
    setResult(null);
    try {
      const data = await fetchComplianceResult(
        requirements.filter((r) => r.text.trim()),
        images
      );
      setResult(data);
      pushBanner({
        type: "compliance",
        title: "도면 분석 완료",
        message: "실행계획용 JSON이 생성되었습니다.",
        link: "/compliance",
      });
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "AI 판정 요청에 실패했습니다. 백엔드 서버가 실행 중인지 확인해 주세요."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleStartOperations = () => {
    if (!result?.optimizationInput) return;
    try {
      startOperations(result.optimizationInput);
      pushBanner({
        type: "compliance",
        title: "도면 기반 작업 시작",
        message: "최적화 JSON을 고정 섹터별 실행계획으로 변환했습니다.",
        link: "/process-balancing",
      });
      navigate("/process-balancing");
    } catch (e) {
      setError(e instanceof Error ? e.message : "실행계획을 시작하지 못했습니다.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">도면 분석 · 실행계획 생성</h1>
        <p className="mt-1 text-sm text-gray-500">
          도면을 넣고 실행계획을 생성하세요.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-6 rounded-xl border border-gray-200 bg-white p-5">
          <div>
            <h2 className="mb-3 text-sm font-semibold text-gray-800">
              요청사항
            </h2>
            <RequirementList
              requirements={requirements}
              onChange={setRequirements}
            />
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold text-gray-800">
              도면 이미지 업로드
            </h2>
            <DrawingUploader images={images} onChange={setImages} />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          {result?.analysisMode === "DEMO" && (
            <p className="rounded-lg bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-800">
              현재는 시연용 실행계획입니다. Gemini 분석 서버를 연결하면 실제 분석 결과로 자동 전환됩니다.
            </p>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <LoaderCircle size={16} className="animate-spin" />
            ) : (
              <Sparkles size={16} />
            )}
            {loading ? "실행계획 생성 중..." : "실행계획 생성"}
          </button>
        </section>

        <section>
          {!result && !loading && (
            <div className="flex h-full min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 p-8 text-center">
              <p className="text-sm font-medium text-gray-500">
                도면과 요청사항을 등록하세요.
              </p>
            </div>
          )}
          {loading && (
            <div className="flex h-full min-h-64 flex-col items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white p-8 text-center">
              <LoaderCircle size={22} className="animate-spin text-accent-500" />
              <p className="text-sm text-gray-500">작업 계획을 만들고 있습니다...</p>
            </div>
          )}
          {result && !loading && <ComplianceResultView result={result} started={operationStarted} onStartOperations={handleStartOperations} />}
        </section>
      </div>
    </div>
  );
}
