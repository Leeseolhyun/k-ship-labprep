import { useRef, useState } from "react";
import { ImageIcon, Trash2, UploadCloud } from "lucide-react";
import type { DrawingImage } from "../../types/compliance";

interface Props {
  images: DrawingImage[];
  onChange: (images: DrawingImage[]) => void;
}

function formatSize(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function DrawingUploader({ images, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const accepted = Array.from(list).filter((f) => f.type.startsWith("image/"));
    const next: DrawingImage[] = accepted.map((file, i) => ({
      id: `img-${Date.now()}-${i}`,
      file,
      previewUrl: URL.createObjectURL(file),
      name: file.name,
      sizeLabel: formatSize(file.size),
    }));
    onChange([...images, ...next]);
  };

  const removeImage = (id: string) => {
    const target = images.find((img) => img.id === id);
    if (target) URL.revokeObjectURL(target.previewUrl);
    onChange(images.filter((img) => img.id !== id));
  };

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => addFiles(e.target.files)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          addFiles(e.dataTransfer.files);
        }}
        className={[
          "flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors",
          isDragOver
            ? "border-accent-500 bg-accent-50"
            : "border-gray-300 hover:border-accent-400 hover:bg-gray-50",
        ].join(" ")}
      >
        <UploadCloud className="text-gray-400" size={26} />
        <p className="text-sm font-medium text-gray-700">
          도면 이미지를 이곳에 끌어다 놓으세요
        </p>
        <p className="text-xs text-gray-400">
          또는 클릭하여 파일 선택 · PNG, JPG · 여러 장 업로드 가능
        </p>
      </button>

      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((img) => (
            <div
              key={img.id}
              className="group relative overflow-hidden rounded-lg border border-gray-200 bg-white"
            >
              <img
                src={img.previewUrl}
                alt={img.name}
                className="h-28 w-full object-cover"
              />
              <div className="flex items-center gap-1.5 border-t border-gray-100 px-2 py-1.5">
                <ImageIcon size={13} className="shrink-0 text-gray-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-gray-700">
                    {img.name}
                  </p>
                  <p className="text-[11px] text-gray-400">{img.sizeLabel}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeImage(img.id)}
                aria-label={`${img.name} 삭제`}
                className="absolute right-1.5 top-1.5 rounded-md bg-white/90 p-1 text-gray-500 opacity-0 shadow-sm transition-opacity hover:text-red-500 group-hover:opacity-100"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
