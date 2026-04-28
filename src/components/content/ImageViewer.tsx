import { useState } from "react";
import { X, ZoomIn } from "lucide-react";

interface Props {
  src: string;
  alt?: string;
}

export function ImageViewer({ src, alt }: Props) {
  const [lightbox, setLightbox] = useState(false);

  return (
    <>
      <div className="relative inline-block my-2 group">
        <img
          src={src}
          alt={alt ?? "image"}
          className="max-w-full max-h-72 rounded-lg cursor-zoom-in object-contain border border-[var(--color-border)]"
          onClick={() => setLightbox(true)}
        />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="bg-black/40 rounded-full p-1.5">
            <ZoomIn size={16} className="text-white" />
          </div>
        </div>
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center"
          onClick={() => setLightbox(false)}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 rounded-full p-2"
            onClick={() => setLightbox(false)}
          >
            <X size={20} />
          </button>
          <img
            src={src}
            alt={alt}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
