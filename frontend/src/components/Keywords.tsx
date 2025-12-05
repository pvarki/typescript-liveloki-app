export function Keywords({ keywords }: { keywords: string[] }) {
  if (keywords.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-0.5">
      {keywords.map((k, i) => (
        <span className="rounded-xs bg-gray-800 px-1 py-0.5 whitespace-nowrap" key={i}>
          {k}
        </span>
      ))}
    </div>
  );
}
