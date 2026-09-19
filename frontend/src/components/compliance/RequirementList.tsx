import { Plus, Trash2 } from "lucide-react";
import type { OwnerRequirement } from "../../types/compliance";

interface Props {
  requirements: OwnerRequirement[];
  onChange: (requirements: OwnerRequirement[]) => void;
}

export default function RequirementList({ requirements, onChange }: Props) {
  const addRequirement = () => {
    onChange([...requirements, { id: `req-${Date.now()}`, text: "" }]);
  };

  const updateRequirement = (id: string, text: string) => {
    onChange(requirements.map((r) => (r.id === id ? { ...r, text } : r)));
  };

  const removeRequirement = (id: string) => {
    onChange(requirements.filter((r) => r.id !== id));
  };

  return (
    <div className="space-y-2">
      {requirements.map((req, index) => (
        <div key={req.id} className="flex items-start gap-2">
          <span className="mt-2.5 text-xs font-medium text-gray-400">
            {index + 1}
          </span>
          <textarea
            value={req.text}
            onChange={(e) => updateRequirement(req.id, e.target.value)}
            placeholder="예: 블록 B-07 용접 공정 · 정반 P-02 · 선행 취부 완료 후 착수 · 납기 17:00"
            rows={2}
            className="flex-1 resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
          />
          <button
            type="button"
            onClick={() => removeRequirement(req.id)}
            aria-label="요구사항 삭제"
            className="mt-1 rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addRequirement}
        className="flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm font-medium text-gray-500 hover:border-accent-400 hover:text-accent-600"
      >
        <Plus size={15} />
        요청사항 추가
      </button>
    </div>
  );
}
