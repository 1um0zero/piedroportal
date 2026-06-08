// One-off generator: builds NL translations for every distinct color_basic value
// and emits an upsert SQL block for the `translations` table (category 'colour').
const colours = ["Beige","Beige, Black","Beige, Grey","Beige, Multi Colour","Beige, Off White","Beige, Red","Beige, Silver","Beige, Taupe","Black","Black Black","Black Dark Brown","Black, Anthracite","Black, Blue, Anthracite","Black, Bronze","Black, Green","Black, Grey","Black, Grey, Red","Black, Multi Colour","Black, Off White","Black, Red","Black, White","Black, White, Blue","Blue","Blue Blue","Blue Grey","Blue, Beige","Blue, Black","Blue, Cognac","Blue, Grey","Blue, Multi Colour","Blue, Off White","Blue, Off White, Grey","Blue, Off White, Red","Blue, Pink","Blue, Silver","Bordeaux","Bordeaux Brown","Brown","Brown, Black, Blue","Brown, Black, Grey","Brown, Cognac","Brown, Cognac, Blue","Brown, Green","Brown, Grey","Brown, Multi Colour","Cobalt Blue","Cognac","Cognac, Black","Cognac, Brown","Cognac, Red","Dark Brown Black","Green","Green, Beige, Orange","Green, Black","Green, Blue, White","Green, Multi Colour","Green, Olive","Green, White","Grey","Grey Black","Grey, Black","Grey, Blue","Grey, Blue, Beige","Grey, Multi Colour","Grey, Off White","Grey, Off White, Beige","Grey, Pink","Grey, Silver","Grey, White","Kaki Brown","Light Blue","Lila","Navy","Navy, Beige","Off White","Off White, Beige","Off White, Brown","Off White, Grey","Off White, Light Green","Off White, Red, Black","Off White, Taupe, Green","Pink","Pink, Beige, Multi Colour","Pink, Multi Colour","Pink, Off-White","Pink, Silver","Purple","Purple, Beige","Red","Red, Bordeaux","Red, Silver","Taupe","Taupe Black","Taupe Cognac","White","White, Beige, Multi Colour","White, Black","White, Multi Colour","White, Silver","Yellow"];

// English -> NL, longest phrases first, matched case-sensitively on word boundaries
const pairs = [
  ["Multi Colour","Multikleur"],
  ["Off-White","Gebroken Wit"],
  ["Off White","Gebroken Wit"],
  ["Cobalt Blue","Kobaltblauw"],
  ["Light Blue","Lichtblauw"],
  ["Light Green","Lichtgroen"],
  ["Dark Brown","Donkerbruin"],
  ["Beige","Beige"],["Black","Zwart"],["Blue","Blauw"],["Brown","Bruin"],
  ["Cognac","Cognac"],["Green","Groen"],["Grey","Grijs"],["Navy","Marineblauw"],
  ["Pink","Roze"],["Purple","Paars"],["Red","Rood"],["Taupe","Taupe"],
  ["White","Wit"],["Yellow","Geel"],["Bordeaux","Bordeaux"],["Lila","Lila"],
  ["Anthracite","Antraciet"],["Bronze","Brons"],["Silver","Zilver"],
  ["Olive","Olijf"],["Orange","Oranje"],["Kaki","Kaki"],
];

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function tr(v) {
  // tokenise on the comma separator, translate each part, rejoin
  return v.split(",").map(part => {
    let out = part.trim();
    for (const [en, nl] of pairs) {
      out = out.replace(new RegExp("(?<![A-Za-z])" + esc(en) + "(?![A-Za-z])", "g"), nl);
    }
    return out;
  }).join(", ");
}
const q = (s) => "'" + s.replace(/'/g, "''") + "'";

import { writeFileSync } from "node:fs";

const rows = colours.map((c) => `  (${q(c)}, ${q(c)}, ${q(tr(c))}, 'colour')`);

const sql = `-- ============================================================================
-- Gallery filter translations (NL) — closure / type / construction / colour
-- Run in the Supabase SQL Editor. Idempotent (UPDATE + upsert).
-- ============================================================================

-- 1. Closure / Type / Construction — align NL wording with the client's list.
--    (rows already exist; we only adjust the Dutch label.)
UPDATE translations SET nl = 'Veter'      WHERE key = 'LACE';            -- Lace
UPDATE translations SET nl = 'Boot'       WHERE key = 'Boot';            -- Boot (keep "Boot", not "Laars")
UPDATE translations SET nl = 'Orthese'    WHERE key = 'AFO';             -- AFO
UPDATE translations SET nl = 'Anti-Varus' WHERE key = 'Reverse Lasted';  -- Reverse Lasted
UPDATE translations SET nl = 'Korset'     WHERE key = 'Stability';       -- Stability
-- Gesp / Klittenband / Sandaal / Schoen / Revalidatie already match — no change.
-- Note: 'AGO' (construction) and 'TWIST LOCK SYSTEM' (closure) have no NL yet
-- and will fall back to English until you supply translations.

-- 2. Colour filter values (color_basic) — new 'colour' category rows.
INSERT INTO translations (key, en, nl, category) VALUES
${rows.join(",\n")}
ON CONFLICT (key) DO UPDATE
  SET nl = EXCLUDED.nl, en = EXCLUDED.en, category = EXCLUDED.category;
`;

writeFileSync(new URL("../supabase-filter-translations-nl.sql", import.meta.url), sql);
console.error("Wrote supabase-filter-translations-nl.sql with", colours.length, "colour rows");
