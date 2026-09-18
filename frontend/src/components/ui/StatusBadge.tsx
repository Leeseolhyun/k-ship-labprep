import { CheckCircle2, XCircle } from "lucide-react";
import type { ComplianceStatus } from "../../types/compliance";

export default function StatusBadge({ status }: { status: ComplianceStatus }) {
  const isPass = status === "적합";
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold",
        isPass
          ? "bg-emerald-50 text-emerald-700"
          : "bg-red-50 text-red-700",
      ].join(" ")}
    >
      {isPass ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
      {status}
    </span>
  );
}
