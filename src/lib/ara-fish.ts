export type AraMapPoint = {
  id: number;
  lat: number;
  lng: number;
  name: string;
  species: string;
};

export type AraViewport = {
  south: number;
  west: number;
  north: number;
  east: number;
};

export async function fetchAraInBounds(
  v: AraViewport,
  opt: { bass: boolean; pike: boolean; walleye: boolean },
  signal?: AbortSignal,
): Promise<{ features: AraMapPoint[]; tooWide: boolean }> {
  const q = new URLSearchParams();
  q.set("south", String(v.south));
  q.set("west", String(v.west));
  q.set("north", String(v.north));
  q.set("east", String(v.east));
  q.set("bass", opt.bass ? "1" : "0");
  q.set("pike", opt.pike ? "1" : "0");
  q.set("walleye", opt.walleye ? "1" : "0");

  const res = await fetch(`/api/geohub/ara?${q.toString()}`, { signal });
  if (!res.ok) {
    throw new Error("ARA request failed");
  }
  const data = (await res.json()) as {
    features: AraMapPoint[];
    tooWide?: boolean;
  };
  return {
    features: data.features ?? [],
    tooWide: data.tooWide === true,
  };
}
