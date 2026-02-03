// Optional: Token Encryption Utility
// Use this if you want to encrypt tokens before storing in database
// 
// IMPORTANT: This requires you to set up a VITE_ENCRYPTION_KEY in your .env file
// The encryption key should be a 32-character random string
// Generate one with: openssl rand -hex 32

/**
 * Simple symmetric encryption for tokens
 * Note: This is a basic implementation. For production, consider using a KMS service.
 */

// Check if encryption is enabled
const isEncryptionEnabled = () => {
  return !!import.meta.env.VITE_ENCRYPTION_KEY
}

/**
 * Encrypt a token before storing in database
 * @param {string} plaintext - The token to encrypt
 * @returns {Promise<string>} - Encrypted token as base64 string
 */
export const encryptToken = async (plaintext) => {
  if (!isEncryptionEnabled()) {
    console.warn('Encryption key not set. Storing tokens in plain text.')
    return plaintext
  }

  try {
    const key = import.meta.env.VITE_ENCRYPTION_KEY
    
    // For browser compatibility, use a simple XOR-based encryption with base64
    // Note: For production, use Web Crypto API (crypto.subtle.encrypt)
    const encoder = new TextEncoder()
    const data = encoder.encode(plaintext)
    const keyData = encoder.encode(key)
    
    const encrypted = new Uint8Array(data.length)
    for (let i = 0; i < data.length; i++) {
      encrypted[i] = data[i] ^ keyData[i % keyData.length]
    }
    
    // Convert to base64
    return btoa(String.fromCharCode(...encrypted))
  } catch (error) {
    console.error('Encryption failed:', error)
    return plaintext // Fallback to plain text
  }
}

/**
 * Decrypt a token retrieved from database
 * @param {string} ciphertext - The encrypted token
 * @returns {Promise<string>} - Decrypted token
 */
export const decryptToken = async (ciphertext) => {
  if (!isEncryptionEnabled() || !ciphertext) {
    return ciphertext
  }

  try {
    const key = import.meta.env.VITE_ENCRYPTION_KEY
    
    // Decode from base64
    const encrypted = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0))
    
    const encoder = new TextEncoder()
    const keyData = encoder.encode(key)
    
    const decrypted = new Uint8Array(encrypted.length)
    for (let i = 0; i < encrypted.length; i++) {
      decrypted[i] = encrypted[i] ^ keyData[i % keyData.length]
    }
    
    const decoder = new TextDecoder()
    return decoder.decode(decrypted)
  } catch (error) {
    console.error('Decryption failed:', error)
    return ciphertext // Return as-is if decryption fails
  }
}

/**
 * Encrypt multiple tokens at once
 * @param {Object} tokens - Object with token fields
 * @returns {Promise<Object>} - Object with encrypted tokens
 */
export const encryptTokens = async (tokens) => {
  const encrypted = {}
  for (const [key, value] of Object.entries(tokens)) {
    encrypted[key] = value ? await encryptToken(value) : value
  }
  return encrypted
}

/**
 * Decrypt multiple tokens at once
 * @param {Object} tokens - Object with encrypted token fields
 * @returns {Promise<Object>} - Object with decrypted tokens
 */
export const decryptTokens = async (tokens) => {
  const decrypted = {}
  for (const [key, value] of Object.entries(tokens)) {
    decrypted[key] = value ? await decryptToken(value) : value
  }
  return decrypted
}

// Usage example (commented out):
/*
// In ProfileSettings.jsx:

import { encryptToken, decryptToken } from '../lib/encryption'

// When saving:
const handleSave = async () => {
  const encryptedToken = await encryptToken(settings.metaAccessToken)
  const { error } = await supabase
    .from('User_details')
    .update({ meta_access_token: encryptedToken })
    .eq('email', user.email)
}

// When loading:
const fetchSettings = async () => {
  const { data } = await supabase
    .from('User_details')
    .select('meta_access_token')
    .eq('email', user.email)
    .single()
  
  const decryptedToken = await decryptToken(data.meta_access_token)
  setSettings({ metaAccessToken: decryptedToken })
}
*/
