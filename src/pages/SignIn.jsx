import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const SignIn = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await signIn(email, password)
    
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex overflow-hidden">
      {/* Left Side - Yellow */}
      <div className="w-1/2 bg-[#FFC107] flex flex-col items-center justify-center p-12">
        <div className="mb-8">
          <div className="w-16 h-16 bg-black/10 rounded-lg flex items-center justify-center">
            <svg className="w-10 h-10 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
        </div>
        
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          City Campaign
        </h1>
        <h2 className="text-4xl font-bold text-gray-900 mb-6">
          Manager
        </h2>
        
        <p className="text-gray-700 text-center max-w-md mb-8">
          Send development updates and reports to your citizens via WhatsApp
        </p>
        
        <div className="flex items-center text-gray-700 text-sm">
          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
          </svg>
          Powered by WhatsApp Business API
        </div>
      </div>

      {/* Right Side - White */}
      <div className="w-1/2 bg-[#F5F5F5] flex items-center justify-center p-12 overflow-y-auto">
        <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md my-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            Welcome back
          </h2>
          <p className="text-gray-600 mb-6 text-sm">
            Sign in to manage your WhatsApp campaigns
          </p>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-900 font-medium mb-1.5 text-sm">
                Email
              </label>
              <input
                type="email"
                placeholder="you@city.gov"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-sm"
                required
              />
            </div>

            <div className="mb-5">
              <label className="block text-gray-900 font-medium mb-1.5 text-sm">
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-sm"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#FFC107] text-gray-900 font-semibold py-2.5 rounded-lg hover:bg-[#FFB300] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="text-center mt-6 text-gray-600 text-sm">
            Don't have an account?{' '}
            <Link to="/signup" className="text-[#FFC107] hover:text-[#FFB300] font-semibold">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default SignIn
