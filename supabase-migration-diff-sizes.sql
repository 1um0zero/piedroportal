-- Migration: Add diff_sizes_pairs column to orders table
-- Run this in Supabase SQL Editor

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS diff_sizes_pairs JSONB;

-- Add comment for documentation
COMMENT ON COLUMN orders.diff_sizes_pairs IS 'Array of {qty: number, size: number} for DIFF_SIZES unit type';
