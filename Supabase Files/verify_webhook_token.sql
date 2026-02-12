-- Check if webhook token exists in database
SELECT 
  email, 
  webhook_token,
  CASE 
    WHEN webhook_token IS NULL THEN '❌ No token generated'
    WHEN webhook_token = 'ced729873fd1b1c8281c85d2d0db3cd1988103addc53a1c277b546bae8097d0b' THEN '✅ Token matches!'
    ELSE '⚠️ Token mismatch'
  END as status
FROM "User_details"
WHERE email = 'mspreddy7891@gmail.com';
