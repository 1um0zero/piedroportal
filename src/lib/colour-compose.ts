/**
 * Compose a colour translation from a per-word dictionary.
 *
 * Colour values are combinations of individual words, either comma-separated
 * ("Black, Multi Colour") or space-separated ("Dark Brown Black"). We translate
 * each recognised word/phrase and re-join, preserving the separators. Multi-word
 * phrases (e.g. "Off White", "Multi Colour", "Dark Brown") are matched greedily
 * before single words.
 *
 * Word order follows the English source — which matches the convention already
 * used in the catalogue data (e.g. "Black Leather" → FR "Noir Cuir").
 */

export type WordDict = Map<string, string> // English word/phrase → translated word

export function composeColour(value: string, dict: WordDict): { text: string; missing: string[] } {
  const keys = [...dict.keys()].sort((a, b) => b.length - a.length) // longest first
  const missing: string[] = []

  const parts = value.split(',').map((s) => s.trim()).filter(Boolean)
  const translatedParts = parts.map((part) => {
    let rem = part
    const tokens: string[] = []
    while (rem.length) {
      const key = keys.find((k) => rem === k || rem.startsWith(k + ' '))
      if (key) {
        tokens.push(dict.get(key) || key)
        rem = rem.slice(key.length).trim()
      } else {
        // Unknown leading word — keep it verbatim and flag it.
        const sp = rem.indexOf(' ')
        const word = sp < 0 ? rem : rem.slice(0, sp)
        missing.push(word)
        tokens.push(word)
        rem = sp < 0 ? '' : rem.slice(sp).trim()
      }
    }
    return tokens.join(' ')
  })

  return { text: translatedParts.join(', '), missing: [...new Set(missing)] }
}
