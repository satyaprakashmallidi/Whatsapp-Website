-- Fix audience_id to support large timestamp IDs
ALTER TABLE "Campaigns" 
ALTER COLUMN audience_id TYPE BIGINT;
