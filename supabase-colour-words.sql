-- ============================================================================
-- Colour-word dictionary + manual-override flag
-- Run in the Supabase SQL Editor (once). Then use /admin/translations → "Colour
-- words" + "Recompose" to (re)generate the basic-colour translations.
-- ============================================================================

ALTER TABLE translations ADD COLUMN IF NOT EXISTS manual boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN translations.manual IS 'When true, the value was edited by hand and is never overwritten by auto-composition.';

INSERT INTO translations (key, en, nl, fr, de, category) VALUES
  ('word:Multi Colour', 'Multi Colour', 'Multikleur', 'Multicolore', 'Mehrfarbig', 'colour_word'),
  ('word:Multi colour', 'Multi colour', 'Multikleur', 'Multicolore', 'Mehrfarbig', 'colour_word'),
  ('word:Off-White', 'Off-White', 'Gebroken Wit', 'Blanc Cassé', 'Gebrochenes Weiß', 'colour_word'),
  ('word:Off White', 'Off White', 'Gebroken Wit', 'Blanc Cassé', 'Gebrochenes Weiß', 'colour_word'),
  ('word:Cobalt Blue', 'Cobalt Blue', 'Kobaltblauw', 'Bleu Cobalt', 'Kobaltblau', 'colour_word'),
  ('word:Light Blue', 'Light Blue', 'Lichtblauw', 'Bleu Clair', 'Hellblau', 'colour_word'),
  ('word:Light Green', 'Light Green', 'Lichtgroen', 'Vert Clair', 'Hellgrün', 'colour_word'),
  ('word:Dark Brown', 'Dark Brown', 'Donkerbruin', 'Marron Foncé', 'Dunkelbraun', 'colour_word'),
  ('word:Beige', 'Beige', 'Beige', 'Beige', 'Beige', 'colour_word'),
  ('word:Black', 'Black', 'Zwart', 'Noir', 'Schwarz', 'colour_word'),
  ('word:Blue', 'Blue', 'Blauw', 'Bleu', 'Blau', 'colour_word'),
  ('word:Bordeaux', 'Bordeaux', 'Bordeaux', 'Bordeaux', 'Bordeaux', 'colour_word'),
  ('word:Bronze', 'Bronze', 'Brons', 'Bronze', 'Bronze', 'colour_word'),
  ('word:Brown', 'Brown', 'Bruin', 'Marron', 'Braun', 'colour_word'),
  ('word:Cognac', 'Cognac', 'Cognac', 'Cognac', 'Cognac', 'colour_word'),
  ('word:Fuchsia', 'Fuchsia', 'Fuchsia', 'Fuchsia', 'Fuchsie', 'colour_word'),
  ('word:Green', 'Green', 'Groen', 'Vert', 'Grün', 'colour_word'),
  ('word:Grey', 'Grey', 'Grijs', 'Gris', 'Grau', 'colour_word'),
  ('word:Kaki', 'Kaki', 'Kaki', 'Kaki', 'Khaki', 'colour_word'),
  ('word:Lila', 'Lila', 'Lila', 'Lilas', 'Lila', 'colour_word'),
  ('word:Navy', 'Navy', 'Marineblauw', 'Marine', 'Marineblau', 'colour_word'),
  ('word:Olive', 'Olive', 'Olijf', 'Olive', 'Oliv', 'colour_word'),
  ('word:Orange', 'Orange', 'Oranje', 'Orange', 'Orange', 'colour_word'),
  ('word:Pink', 'Pink', 'Roze', 'Rose', 'Rosa', 'colour_word'),
  ('word:Purple', 'Purple', 'Paars', 'Violet', 'Violett', 'colour_word'),
  ('word:Red', 'Red', 'Rood', 'Rouge', 'Rot', 'colour_word'),
  ('word:Silver', 'Silver', 'Zilver', 'Argent', 'Silber', 'colour_word'),
  ('word:Taupe', 'Taupe', 'Taupe', 'Taupe', 'Taupe', 'colour_word'),
  ('word:White', 'White', 'Wit', 'Blanc', 'Weiß', 'colour_word'),
  ('word:Yellow', 'Yellow', 'Geel', 'Jaune', 'Gelb', 'colour_word'),
  ('word:Anthracite', 'Anthracite', 'Antraciet', 'Anthracite', 'Anthrazit', 'colour_word')
ON CONFLICT (key) DO UPDATE
  SET en = EXCLUDED.en, nl = EXCLUDED.nl, fr = EXCLUDED.fr, de = EXCLUDED.de, category = EXCLUDED.category;
