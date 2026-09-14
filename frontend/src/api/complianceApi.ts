import type {
  ComplianceResult,
  DrawingImage,
  OwnerRequirement,
} from "../types/compliance";

const API_URL =
  import.meta.env.VITE_COMPLIANCE_API_URL ||
  "http://127.0.0.1:8000/api/compliance-review";

export async function fetchComplianceResult(
  requirements: OwnerRequirement[],
  images: DrawingImage[]
): Promise<ComplianceResult> {
  const formData = new FormData();
  requirements
    .map((r) => r.text.trim())
    .filter(Boolean)
    .forEach((text) => formData.append("requirements", text));
  images.forEach((img) => formData.append("drawings", img.file));

  const res = await fetch(API_URL, { method: "POST", body: formData });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail || `서버 오류 (${res.status})`);
  }
  return (await res.json()) as ComplianceResult;
}
