interface Props {
  src: string;
}

export function VideoPlayer({ src }: Props) {
  return (
    <video
      controls
      className="max-w-full rounded-lg my-2 max-h-64 border border-[var(--color-border)]"
    >
      <source src={src} />
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[var(--color-accent)] underline"
      >
        查看视频
      </a>
    </video>
  );
}
