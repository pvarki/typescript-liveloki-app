export function Keywords({ keywords }: { keywords: string[] }) {
  return (
    <>
      {keywords.map((k, i) => (
        <span className="rounded-sm bg-gray-800 p-1 m-0.5 inline whitespace-nowrap" key={i}>
          {k}
        </span>
      ))}
    </>
  );
}
