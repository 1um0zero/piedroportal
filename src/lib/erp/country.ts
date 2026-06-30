// Normalise the messy free-text country that the ERP/Dataverse carries (NL,
// NEDERLAND, HOLANDA, "HOLANDA NLS 02", PORTUGAL, ALEMANHA, DUITSLAND…) into a
// canonical ISO-3166 alpha-2 code + English name. Fold to ASCII upper-case, then
// match an ordered token table; first matching substring wins; null when unmapped.
//
// NB: this MIRRORS the COUNTRY_RULES in scripts/import-accounts.mjs. Keep the two
// in sync — the script runs standalone (node .mjs) so it can't import this module.
const COUNTRY_RULES: Array<[RegExp, string, string]> = [
  [/NEDERLAND|NETHERLAND|HOLAND|HOLLAND|^NLS?\b|\bNL\b/, 'NL', 'Netherlands'],
  [/BELG|BELGIE|BELGIQUE/, 'BE', 'Belgium'],
  [/DUITSL|ALEMANH|GERMAN|DEUTSCHL|\bDE\b/, 'DE', 'Germany'],
  [/PORTUG|\bPT\b/, 'PT', 'Portugal'],
  [/FRANC|FRANKR|\bFR\b/, 'FR', 'France'],
  [/\bSPAIN|ESPAN|SPANJE|\bES\b/, 'ES', 'Spain'],
  [/ITAL|\bIT\b/, 'IT', 'Italy'],
  [/FINLAN|FINLAND|SUOMI/, 'FI', 'Finland'],
  [/POLEN|POLAND|POLONIA|POLSKA/, 'PL', 'Poland'],
  [/SUICA|SUISSE|SWITZERL|ZWITSERL|SCHWEIZ/, 'CH', 'Switzerland'],
  [/SUECIA|SWEDEN|SVERIGE|ZWEDEN/, 'SE', 'Sweden'],
  [/NOORWEG|NORWAY|NORGE/, 'NO', 'Norway'],
  [/DENMARK|DENEMARK|DANMARK/, 'DK', 'Denmark'],
  [/UNITED KINGD|ENGELAND|ENGLAND|BRITAIN|\bUK\b|\bGB\b/, 'GB', 'United Kingdom'],
  [/IRELAND|IERLAND/, 'IE', 'Ireland'],
  [/AUSTRIA|OOSTENR/, 'AT', 'Austria'],
  [/AUSTRALI/, 'AU', 'Australia'],
  [/\bUSA\b|UNITED STAT|AMERICA/, 'US', 'United States'],
  [/CANADA/, 'CA', 'Canada'],
  [/BRAZIL|BRASIL|BRAZILIE/, 'BR', 'Brazil'],
  [/JAPAN/, 'JP', 'Japan'],
  [/SINGAPOR/, 'SG', 'Singapore'],
  [/SOUTH.?KOREA|ZUID.?KOREA|KOREA/, 'KR', 'South Korea'],
  [/CYPRUS|CYPER/, 'CY', 'Cyprus'],
  [/ISRAEL/, 'IL', 'Israel'],
  [/TURKIJE|TURKEY|TURKIYE/, 'TR', 'Turkey'],
  [/CURACAO/, 'CW', 'Curaçao'],
  [/ARUBA/, 'AW', 'Aruba'],
]

export function normaliseCountry(raw: string | null | undefined): { code: string | null; name: string | null } {
  if (!raw) return { code: null, name: null }
  const folded = raw
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // strip accents
    .toUpperCase().trim()
  for (const [re, code, name] of COUNTRY_RULES) {
    if (re.test(folded)) return { code, name }
  }
  return { code: null, name: null }
}
