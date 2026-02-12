-- Create webhook_logs table to track all webhook events
CREATE TABLE IF NOT EXISTS webhook_logs (
  id BIGSERIAL PRIMARY KEY,
  user_email TEXT NOT NULL,
  webhook_token TEXT,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  processed BOOLEAN DEFAULT FALSE,
  error TEXT,
  
  -- Add index for faster queries
  CONSTRAINT fk_user_email FOREIGN KEY (user_email) 
    REFERENCES "User_details"(email) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_webhook_logs_user_email ON webhook_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_timestamp ON webhook_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_type ON webhook_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_processed ON webhook_logs(processed);

-- Add comment
COMMENT ON TABLE webhook_logs IS 'Stores all incoming webhook events from WhatsApp/Meta';
