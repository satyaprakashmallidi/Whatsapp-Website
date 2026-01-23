import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Function to ensure user record exists in User_details table
  const ensureUserRecord = async (userEmail) => {
    if (!userEmail) return

    try {
      // Check if user record exists
      const { data: existingUser, error: fetchError } = await supabase
        .from('User_details')
        .select('email')
        .eq('email', userEmail)
        .maybeSingle()

      // If no record exists, create one
      if (!existingUser && !fetchError) {
        const { error: insertError } = await supabase
          .from('User_details')
          .insert([
            {
              email: userEmail,
              total_contacts: 0,
              campaigns: 0,
              templates: 0,
              messages_sent: 0,
              contacts: [],
              audiences: [],
              campaigns_data: [],
              templates_data: [],
              reports: []
            }
          ])

        if (insertError) {
          console.error('Error creating user record:', insertError)
        } else {
          console.log('User record created successfully for:', userEmail)
        }
      } else if (fetchError) {
        console.error('Error checking user record:', fetchError)
      }
    } catch (error) {
      console.error('Error ensuring user record:', error)
    }
  }

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user?.email) {
        ensureUserRecord(session.user.email).catch(err => {
          console.error('Failed to ensure user record on session check:', err)
        })
      }
      setLoading(false)
    })

    // Listen for changes on auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user?.email) {
        ensureUserRecord(session.user.email).catch(err => {
          console.error('Failed to ensure user record on auth change:', err)
        })
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        }
      }
    })
    
    // Create user record immediately after signup (non-blocking)
    if (data?.user?.email && !error) {
      ensureUserRecord(data.user.email).catch(err => {
        console.error('Failed to create user record:', err)
      })
    }
    
    return { data, error }
  }

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    // Ensure user record exists after signin (non-blocking)
    if (data?.user?.email && !error) {
      ensureUserRecord(data.user.email).catch(err => {
        console.error('Failed to ensure user record:', err)
      })
    }
    
    return { data, error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`
      }
    })
    return { data, error }
  }

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    signInWithGoogle,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
