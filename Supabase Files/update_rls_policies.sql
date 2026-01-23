-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own data" ON "User_details";
DROP POLICY IF EXISTS "Users can insert their own data" ON "User_details";
DROP POLICY IF EXISTS "Users can update their own data" ON "User_details";
DROP POLICY IF EXISTS "Users can delete their own data" ON "User_details";

-- Create updated policies with correct syntax
CREATE POLICY "Users can view their own data" 
  ON "User_details" 
  FOR SELECT 
  USING (auth.email() = email);

CREATE POLICY "Users can insert their own data" 
  ON "User_details" 
  FOR INSERT 
  WITH CHECK (auth.email() = email);

CREATE POLICY "Users can update their own data" 
  ON "User_details" 
  FOR UPDATE 
  USING (auth.email() = email);

CREATE POLICY "Users can delete their own data" 
  ON "User_details" 
  FOR DELETE 
  USING (auth.email() = email);
