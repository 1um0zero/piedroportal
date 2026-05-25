-- ============================================
-- MIGRATION: i18n Complete Structure
-- ============================================

-- 1. Add locale fields to existing tables
-- ============================================

-- profiles: user's preferred locale
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_locale TEXT DEFAULT 'en';
COMMENT ON COLUMN profiles.preferred_locale IS 'User preferred language: en, nl, fr, de';

-- companies: company default locale
ALTER TABLE companies ADD COLUMN IF NOT EXISTS default_locale TEXT DEFAULT 'en';
COMMENT ON COLUMN companies.default_locale IS 'Company default language for orders and communications';

-- orders: order locale (for PDF/email generation)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'en';
COMMENT ON COLUMN orders.locale IS 'Language used for this order (PDF, emails)';

-- products: color translations (JSONB)
ALTER TABLE products ADD COLUMN IF NOT EXISTS color_name_i18n JSONB;
COMMENT ON COLUMN products.color_name_i18n IS 'Color name translations: {"nl": "...", "fr": "...", "de": "..."}';


-- 2. Create translations table (UI labels, buttons, messages)
-- ============================================

CREATE TABLE IF NOT EXISTS translations (
  key TEXT PRIMARY KEY,
  en TEXT NOT NULL,
  nl TEXT,
  fr TEXT,
  de TEXT,
  category TEXT, -- 'order_form', 'gallery', 'auth', 'admin', etc.
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE translations IS 'UI translations for labels, buttons, messages - editable in backoffice';
COMMENT ON COLUMN translations.key IS 'Translation key (e.g., "order.customer", "button.save")';
COMMENT ON COLUMN translations.category IS 'Category for organization (order_form, gallery, auth, etc.)';

CREATE INDEX IF NOT EXISTS idx_translations_category ON translations(category);


-- 3. Create addition_options table (dropdown options)
-- ============================================

CREATE TABLE IF NOT EXISTS addition_options (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL, -- 'lining_leather', 'closure_eyelets', etc.
  category TEXT NOT NULL, -- 'lining', 'closure_laces', 'stiffener_hardness', etc.
  value TEXT NOT NULL, -- EN (base value)
  value_nl TEXT,
  value_fr TEXT,
  value_de TEXT,
  sort_order INT DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE addition_options IS 'Addition field dropdown options with translations - editable in backoffice';
COMMENT ON COLUMN addition_options.key IS 'Unique key for this option';
COMMENT ON COLUMN addition_options.category IS 'Field category (lining, closure_laces, stiffener_hardness, etc.)';
COMMENT ON COLUMN addition_options.sort_order IS 'Display order in dropdown';

CREATE INDEX IF NOT EXISTS idx_addition_options_category ON addition_options(category, sort_order);
CREATE INDEX IF NOT EXISTS idx_addition_options_active ON addition_options(active);


-- 4. Populate color_name_i18n with existing translations
-- ============================================
-- This will be populated via a separate script after we map color_name to the translation array


-- 5. Create updated_at trigger function
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_translations_updated_at
  BEFORE UPDATE ON translations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_addition_options_updated_at
  BEFORE UPDATE ON addition_options
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- 6. Add RLS policies
-- ============================================

-- translations: admin can edit, everyone can read
ALTER TABLE translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read translations"
  ON translations FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage translations"
  ON translations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'piedro_admin'
    )
  );

-- addition_options: admin can edit, everyone can read active options
ALTER TABLE addition_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active addition options"
  ON addition_options FOR SELECT
  USING (active = true);

CREATE POLICY "Admins can manage addition options"
  ON addition_options FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'piedro_admin'
    )
  );
