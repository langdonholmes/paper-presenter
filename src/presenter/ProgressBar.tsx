interface Props {
  current: number;
  total: number;
}

export default function ProgressBar({ current, total }: Props) {
  const pct = total > 0 ? ((current + 1) / total) * 100 : 0;

  return (
    <div className="presenter-progress">
      <div className="presenter-progress-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}
