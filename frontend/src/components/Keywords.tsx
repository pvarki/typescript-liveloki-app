export function Keywords({ keywords }: { keywords: string[] }) {
  return (
    <div className="flex flex-wrap gap-0.5">
      {keywords.map((k, i) => (
        <span className="rounded-sm bg-gray-800 px-1 py-0.5 whitespace-nowrap" key={i}>
          {k}
        </span>
      ))}
    </div>
  );
}
