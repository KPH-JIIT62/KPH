-- 027: Contest Event Gallery Images
-- Stores array of showcase/gallery images for contests:
-- [{ id: string, url: string, caption?: string, subtitle?: string, tag?: string, createdAt?: string }]

ALTER TABLE contests
  ADD COLUMN IF NOT EXISTS gallery JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS contests_gallery_idx ON contests USING gin (gallery);

