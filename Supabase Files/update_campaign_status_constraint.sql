-- Update Campaigns status constraint to include Processing
ALTER TABLE "Campaigns" 
DROP CONSTRAINT IF EXISTS campaigns_status_check;

ALTER TABLE "Campaigns" 
ADD CONSTRAINT campaigns_status_check 
CHECK (status IN ('Draft', 'Processing', 'Completed', 'Failed'));

-- Update any existing 'Sent' status to 'Completed' (if any exist)
UPDATE "Campaigns" 
SET status = 'Completed' 
WHERE status = 'Sent';
