-- Add carousel template support to Templates table

-- Add template_type column to distinguish standard vs carousel templates
ALTER TABLE "Templates" 
ADD COLUMN IF NOT EXISTS template_type TEXT DEFAULT 'standard' 
CHECK (template_type IN ('standard', 'carousel'));

-- Add carousel_data column to store carousel-specific configuration
ALTER TABLE "Templates"
ADD COLUMN IF NOT EXISTS carousel_data JSONB;

-- Create index for faster template_type queries
CREATE INDEX IF NOT EXISTS idx_templates_type ON "Templates"(template_type);

-- Add comment for documentation
COMMENT ON COLUMN "Templates".template_type IS 'Type of template: standard or carousel';
COMMENT ON COLUMN "Templates".carousel_data IS 'JSON structure storing carousel cards data including images, body text, and buttons';

/*
carousel_data JSON structure:
{
  "mainBody": "Main body text shared across all cards",
  "cards": [
    {
      "headerHandle": "whatsapp_image_handle",
      "bodyText": "Card-specific body text",
      "buttons": [
        {
          "type": "quick_reply|url|phone_number",
          "text": "Button label",
          "url": "https://example.com",  // only for url type
          "phone_number": "+1234567890"  // only for phone_number type
        }
      ]
    }
  ]
}
*/
