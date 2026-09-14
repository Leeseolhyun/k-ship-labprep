import { useState } from "react";
import { LoaderCircle, Sparkles } from "lucide-react";
import RequirementList from "../components/compliance/RequirementList";
import DrawingUploader from "../components/compliance/DrawingUploader";
import ComplianceResultView from "../components/compliance/ComplianceResultView";
import { useBanner } from "../context/BannerContext";
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

  const hasContent = requirements.some((r) => r.text.trim().length > 0);

  const handleSubmit = async () => {
    if (!hasContent) {
      setError("선주 요구사항을 하나 이상 입력해 주세요.");
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
        title: "도면 규정 검토 결과 도착",
        message: `${data.status === "적합" ? "적합 판정" : `부적합 ${data.violatedRules.length}건 확인`} - ${data.summary}`,
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">규정 적합성 판단</h1>
        <p className="mt-1 text-sm text-gray-500">
          선주 요구사항과 도면을 등록하면 관련 규정 적합 여부를 검토합니다.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-6 rounded-xl border border-gray-200 bg-white p-5">
          <div>
            <h2 className="mb-3 text-sm font-semibold text-gray-800">
              선주 요구사항
            </h2>
            <RequirementList
              requirements={requirements}
              onChange={setRequirements}
            />
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold text-gray-800">
              도면 이미지
            </h2>
            <DrawingUploader images={images} onChange={setImages} />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

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
            {loading ? "판단 중..." : "판단 요청"}
          </button>
        </section>

        <section>
          {!result && !loading && (
            <div className="flex h-full min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 p-8 text-center">
              <p className="text-sm font-medium text-gray-500">
                요구사항과 도면을 입력한 뒤 판단 요청을 눌러주세요.
              </p>
              <p className="mt-1 text-xs text-gray-400">
                결과가 이 영역에 표시됩니다.
              </p>
            </div>
          )}
          {loading && (
            <div className="flex h-full min-h-64 flex-col items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white p-8 text-center">
              <LoaderCircle size={22} className="animate-spin text-accent-500" />
              <p className="text-sm text-gray-500">규정 검토 중입니다...</p>
            </div>
          )}
          {result && !loading && <ComplianceResultView result={result} />}
        </section>
      </div>
    </div>
  );
}
