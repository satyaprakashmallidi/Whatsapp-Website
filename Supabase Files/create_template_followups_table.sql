-- Auto Follow-up Template Rules Table
-- Standard templates: one row per button (button_payload column used for lookup)
-- Carousel templates: one row per template (all button rules stored in JSONB rules column)

create table if not exists template_followups (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,

  -- The template that the user received (name used by Meta)
  source_template_name text not null,

  -- 'standard' or 'carousel'
  template_type text not null default 'standard',

  -- ── Standard template columns (null for carousel rows) ──

  -- The payload (ID) of the quick reply button that was clicked.
  -- Stored in compound format: "{source_template_name}__{original_payload}"
  button_payload text default null,

  -- Human-readable label of the button
  button_title text default null,

  -- For standard templates card_index is always NULL
  card_index int default null,

  -- The follow-up template to send (standard only)
  followup_template_name text default null,
  followup_template_language text default 'en_US',

  -- ── Carousel template column ──
  -- Array of rule objects: { button_payload, button_title, card_index, followup_template_name, followup_template_language }
  rules jsonb default null,

  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- ─── Migration SQL (run once in Supabase SQL Editor if table already exists) ─────
-- ALTER TABLE template_followups
--   ADD COLUMN IF NOT EXISTS template_type text NOT NULL DEFAULT 'standard',
--   ADD COLUMN IF NOT EXISTS rules jsonb DEFAULT NULL;
--
-- -- Make button_payload nullable (carousel rows won't have it)
-- ALTER TABLE template_followups
--   ALTER COLUMN button_payload DROP NOT NULL,
--   ALTER COLUMN button_title DROP NOT NULL,
--   ALTER COLUMN followup_template_name DROP NOT NULL;
--
-- -- Drop old unique constraint
-- ALTER TABLE template_followups
--   DROP CONSTRAINT IF EXISTS template_followups_user_email_source_template_name_button_paylo_key;
--
-- -- Unique: one carousel row per (user, template)
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_followups_carousel
--   ON template_followups (user_email, source_template_name)
--   WHERE template_type = 'carousel';
-- ──────────────────────────────────────────────────────────────────────────────────

-- Index for fast webhook lookups (standard rows)
create index if not exists idx_template_followups_standard
  on template_followups (user_email, button_payload)
  where template_type = 'standard';

-- Index for carousel rows
create index if not exists idx_template_followups_carousel
  on template_followups (user_email, source_template_name)
  where template_type = 'carousel';
