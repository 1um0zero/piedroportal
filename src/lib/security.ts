/**
 * Camada de segurança canónica UmZero — partilhada por todos os portais.
 *
 * Objetivo: parar bots de reconhecimento (scanners que sondam ficheiros de
 * config/segredos inexistentes) ANTES de tocarem em qualquer auth/BD, e fechar
 * superfícies de abuso por defeito. Cada pedido de lixo que chega ao middleware
 * é uma invocação serverless + (potencialmente) uma ligação ao pooler — por isso
 * cortamos cedo, com custo zero de I/O.
 *
 * Lei pétria: o que aqui está deve ser idêntico em todos os projetos. Se for
 * preciso afinar, afina-se aqui e replica-se — não se diverge por projeto.
 */

/**
 * Paths que NENHUM portal legítimo serve, mas que os scanners sondam em massa.
 * Inclui dotfiles sensíveis, painéis de admin de outras stacks (WordPress, PHP),
 * e endpoints de metadados/control-plane.
 */
const BLOCKED_PATH = /(?:^|\/)(?:\.git|\.svn|\.hg|\.env|\.aws|\.ssh|\.vscode|\.idea|\.docker|\.terraform|wp-admin|wp-login|wp-content|wp-includes|xmlrpc|phpmyadmin|pma|adminer|administrator|server-status|server-info|actuator|jenkins|\.well-known\/(?!acme-challenge|security\.txt))/i

/**
 * Extensões que um portal Next.js nunca serve dinamicamente. Servir um destes
 * só pode significar um ficheiro mal colocado ou uma sondagem.
 */
const BLOCKED_EXT = /\.(?:env|ya?ml|properties|ini|conf|cfg|toml|bak|backup|old|orig|swp|save|sql|sqlite3?|db|mdb|dump|sh|bash|zsh|ps1|pem|key|crt|cer|p12|pfx|jks|keystore|asc|gpg|php\d?|phtml|phps|asp|aspx|ashx|jsp|jspx|do|action|cgi|pl|py|rb|htaccess|htpasswd|tfstate|tfvars|war|ear|class|inc|log|git|svn)$/i

/**
 * Ficheiros de chave/segredo nus (sem extensão) que um portal nunca serve.
 * Estes podem ser bloqueados como segmento nu — não colidem com rotas legítimas.
 */
const BLOCKED_SECRET_FILE = /(?:^|\/)(?:id_rsa|id_dsa|id_ecdsa|known_hosts|wp-config|docker-compose|dockerfile)\b/i

/**
 * Nomes clássicos de ficheiros de config/segredos sondados como .json/.xml/etc.
 * (ex.: /config/secrets.json, /server/credentials.json, /app/parameters.yml).
 * EXIGE uma extensão de config a seguir ao nome — palavras genéricas como
 * "settings"/"application" são também rotas LEGÍTIMAS da app (ex.: /admin/settings),
 * por isso só bloqueamos quando vêm como NOME DE FICHEIRO de config.
 * Não apanha estáticos legítimos como manifest.json, robots.txt ou sitemap.xml.
 */
const BLOCKED_CONFIG_NAME = /(?:^|\/)(?:secrets?|credentials?|passwords?|secret[_-]?key|api[_-]?keys?|parameters?|appsettings|application|databases?|connection(?:strings?)?|settings|configuration|composer|package-lock|yarn|web)(?:[._-][a-z0-9]+)*\.(?:json|ya?ml|xml|ini|conf|cfg|config|properties|toml|env|lock|bak|old|sql|pem|key|php)\b/i

/**
 * Devolve true se o path for inequivocamente uma sondagem hostil/inútil.
 * Conservador por design: na dúvida, NÃO bloqueia (evita falsos positivos em
 * rotas legítimas). Os falsos negativos apenas mantêm o comportamento atual.
 */
export function isBlockedPath(pathname: string): boolean {
  // Normaliza encoding para apanhar sondas com %2e%2e, %00, etc.
  let p = pathname
  try {
    p = decodeURIComponent(pathname)
  } catch {
    // URL malformada → trata como hostil
    return true
  }

  // Path traversal / null byte → sempre hostil
  if (p.includes('..') || p.includes('\0') || p.includes('\\')) return true

  if (BLOCKED_PATH.test(p)) return true
  if (BLOCKED_EXT.test(p)) return true
  if (BLOCKED_SECRET_FILE.test(p)) return true
  if (BLOCKED_CONFIG_NAME.test(p)) return true

  return false
}

/**
 * Prefixos do Supabase que o proxy transparente (/api/sp/) pode reencaminhar.
 * Tudo o resto é recusado — o proxy deixa de ser um proxy ABERTO (que podia ser
 * abusado para enumeração/SSRF-lite contra o Supabase) e passa a expor apenas a
 * API pública que a app realmente usa.
 */
export const SUPABASE_ALLOWED_PREFIXES = new Set([
  'auth',      // auth/v1/...
  'rest',      // rest/v1/...
  'storage',   // storage/v1/...
  'realtime',  // realtime/v1/...
  'functions', // functions/v1/...
])

export function isAllowedSupabasePath(path: string[]): boolean {
  const first = path[0]
  return !!first && SUPABASE_ALLOWED_PREFIXES.has(first)
}
