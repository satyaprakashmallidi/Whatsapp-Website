import { Link } from 'react-router-dom'

const ArrowRight = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
)

const MessageCircle = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
)

const BarChart3 = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
)

const Users = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
)

const Zap = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
)

const Landing = () => {
    return (
        <div className="min-h-screen bg-white font-sans overflow-x-hidden">
            {/* Navigation */}
            <nav className="fixed w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-amber-400 rounded-lg flex items-center justify-center">
                                <MessageCircle className="w-5 h-5 text-gray-900" />
                            </div>
                            <span className="font-bold text-xl text-gray-900 tracking-tight">City Campaign</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <Link to="/signin" className="text-gray-600 hover:text-gray-900 font-medium text-sm transition-colors">
                                Log in
                            </Link>
                            <Link to="/signup" className="bg-gray-900 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-gray-800 transition-colors">
                                Sign up
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="pt-32 pb-16 sm:pt-40 sm:pb-24 lg:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative">
                {/* Background decorative elements */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-amber-400/20 blur-[120px] rounded-full -z-10 pointer-events-none"></div>

                <div className="text-center max-w-4xl mx-auto">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100/50 text-amber-800 text-sm font-medium mb-8 border border-amber-200/50">
                        <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                        </span>
                        Powered by WhatsApp Business API
                    </div>

                    <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-gray-900 tracking-tight leading-[1.1] mb-8">
                        Connect with citizens via <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-400">WhatsApp</span>
                    </h1>

                    <p className="text-xl sm:text-2xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
                        Send development updates, announcements, and reports directly to your citizens' most used messaging app.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link to="/signup" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-amber-400 text-gray-900 px-8 py-4 rounded-xl font-bold text-lg hover:bg-amber-300 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-amber-400/20">
                            Start Free Trial
                            <ArrowRight className="w-5 h-5" />
                        </Link>
                        <Link to="/signin" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-gray-700 px-8 py-4 rounded-xl font-bold text-lg border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all hover:shadow-sm">
                            Sign In to Dashboard
                        </Link>
                    </div>
                    <p className="mt-6 text-sm text-gray-500">No credit card required. Free 14-day trial.</p>
                </div>

                {/* Feature Highlights */}
                <div className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto text-left">
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-6">
                            <Users className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-3">Audience Management</h3>
                        <p className="text-gray-600 leading-relaxed">Organize your citizens into targeted groups based on wards, interests, or demographics for precise messaging.</p>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative">
                        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-6">
                            <Zap className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-3">Rich Templates</h3>
                        <p className="text-gray-600 leading-relaxed">Create engaging messages with images, documents, call-to-action buttons, and interactive carousels.</p>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-6">
                            <BarChart3 className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-3">Analytics & Reports</h3>
                        <p className="text-gray-600 leading-relaxed">Track campaign performance in real-time. See delivery rates, read receipts, and citizen engagement metrics.</p>
                    </div>
                </div>
            </main>

            {/* Footer minimal */}
            <footer className="border-t border-gray-100 py-8 text-center text-gray-500 text-sm mt-auto">
                <p>&copy; {new Date().getFullYear()} City Campaign Manager. All rights reserved.</p>
            </footer>
        </div>
    )
}

export default Landing
