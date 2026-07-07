export interface ExternalPoster {
  title: string;
  posterURL: string;
}

let cache: ExternalPoster[] | null = null;
let inflight: Promise<ExternalPoster[]> | null = null;

export function fetchExternalPosters(): Promise<ExternalPoster[]> {
  if (cache) return Promise.resolve(cache);
  if (inflight) return inflight;

  inflight = fetch("https://api.sampleapis.com/movies/animation")
    .then((res) => (res.ok ? res.json() : []))
    .then((data: ExternalPoster[]) => {
      cache = Array.isArray(data) ? data.filter((m) => m.posterURL) : [];
      return cache;
    })
    .catch(() => {
      cache = [];
      return cache;
    });

  return inflight;
}

export function pickExternalPoster(list: ExternalPoster[], seed: number): string | null {
  if (!list.length) return null;
  return list[seed % list.length].posterURL;
}
