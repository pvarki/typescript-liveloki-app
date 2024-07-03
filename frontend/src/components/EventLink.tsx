import { FilteredEvent } from "../types.ts";

function shortenUrl(url: string) {
  url = url.replace(/^https?:\/\/(www\.)*/, "");
  if (url.length > 50) url = url.slice(0, 50) + "…";
  return url;
}

export function EventLink({ event: { link } }: { event: FilteredEvent }) {
  return (
    <div>
      {link.startsWith("http") ? (
        <a href={link} title={link} target="_blank" rel="noreferrer" referrerPolicy="no-referrer">
          {shortenUrl(link)}
        </a>
      ) : (
        link
      )}
    </div>
  );
}
