interface Props {
  color: string;
}

export function StreamingIndicator({ color }: Props) {
  return (
    <div className="flex items-center gap-1.5 py-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-1.5 h-1.5 rounded-full animate-bounce"
          style={{
            backgroundColor: color,
            animationDelay: `${i * 0.15}s`,
            animationDuration: "0.8s",
          }}
        />
      ))}
    </div>
  );
}
