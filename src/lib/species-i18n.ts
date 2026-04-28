/**
 * Display names for MNRF / GeoHub stocking species (English source strings).
 * Unknown or new species fall back to the API string.
 */

const STOCKING_SPECIES_FR: Record<string, string> = {
  Unknown: "Inconnu",
  "Rainbow Trout": "Truite arc-en-ciel",
  Steelhead: "Truite arc-en-ciel (anadrome)",
  "Lake Trout": "Truite de lac",
  "Brook Trout": "Truite mouchetée",
  "Brown Trout": "Truite brune",
  Splake: "Splake",
  "Arctic Char": "Omble chevalier",
  "Chinook Salmon": "Saumon chinook",
  "Coho Salmon": "Saumon coho",
  "Atlantic Salmon": "Saumon atlantique",
  "Pink Salmon": "Saumon rose",
  "Lake Whitefish": "Grand corégone",
  Cisco: "Cisco",
  "Lake Herring": "Corégone alosa",
  "Round Whitefish": "Ménomini rond",
  Walleye: "Doré jaune",
  Sauger: "Sandre noir",
  "Yellow Perch": "Perche jaune",
  "Northern Pike": "Brochet",
  Muskellunge: "Maskinongé",
  "Tiger Muskellunge": "Maskinongé tigré",
  "Smallmouth Bass": "Achigan à petite bouche",
  "Largemouth Bass": "Achigan à grande bouche",
  "Rock Bass": "Crapet de roche",
  "Pumpkinseed": "Crapet-soleil",
  "Bluegill": "Crapet arlequin",
  "Black Crappie": "Marigane noire",
  "White Crappie": "Marigane blanche",
  "Channel Catfish": "Barbotte de rivière",
  "Brown Bullhead": "Barbotte brune",
  "Yellow Bullhead": "Barbotte jaune",
  "Lake Sturgeon": "Esturgeon jaune",
  "American Eel": "Anguille d'Amérique",
  "Rainbow Smelt": "Éperlan arc-en-ciel",
  Burbot: "Lotte",
  "Common Carp": "Carpe commune",
  "Grass Carp": "Carpe de roseau",
  "Silver Carp": "Carpe argentée",
  "Bighead Carp": "Carpe à grosse tête",
  "White Sucker": "Meunier rouge",
  "Creek Chub": "Mulet à cornes",
  "Golden Shiner": "Méné jaune",
  "Lake Chub": "Mulet à cornes du lac",
  "Emerald Shiner": "Méné émeraude",
  "Spottail Shiner": "Méné queue tachetée",
  "Fathead Minnow": "Méné à tête grasse",
  "Alewife": "Gaspereau",
  "Gizzard Shad": "Alose à gésier",
  "Threadfin Shad": "Alose à filaments",
  "Goldfish": "Poisson rouge",
  "Koi Carp": "Carpe koï",
  Tilapia: "Tilapia",
  "Lake Sturgeon (juvenile)": "Esturgeon jaune (juvénile)",
};

const frByLower = new Map<string, string>(
  Object.entries(STOCKING_SPECIES_FR).map(([k, v]) => [k.toLowerCase(), v]),
);

export function translateStockingSpecies(name: string, locale: string): string {
  if (locale !== "fr") return name;
  const trimmed = name.trim();
  if (!trimmed) return name;
  return (
    STOCKING_SPECIES_FR[trimmed] ??
    frByLower.get(trimmed.toLowerCase()) ??
    name
  );
}
