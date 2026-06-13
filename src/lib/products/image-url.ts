// Single source of truth for product image URLs and their cache-busting version.
//
// Product images live in the public `products` bucket under a STABLE object name
// (`<colour_id>.<NN>.png`), so when an image is re-processed it keeps the same
// URL — browsers and the Supabase CDN would otherwise serve the stale copy.
// Bumping PRODUCT_IMG_VERSION changes the query string and forces a fresh fetch.
//
// ⚠ Bump this whenever product images are re-processed in bulk, e.g. after
//   running `node scripts/normalize-product-images.mjs`.
export const PRODUCT_IMG_VERSION = '3'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

export const productImageUrl = (name: string) =>
  `${SUPABASE_URL}/storage/v1/object/public/products/${name}?v=${PRODUCT_IMG_VERSION}`
