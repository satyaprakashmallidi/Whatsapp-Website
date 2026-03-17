import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { FaHome, FaBullhorn, FaLayerGroup, FaAddressBook, FaComments, FaUser, FaEllipsisH } from 'react-icons/fa'
import ProfileSettings from './ProfileSettings'

const MobileNav = () => {
    const location = useLocation()
    const [isProfileOpen, setIsProfileOpen] = useState(false)
    const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false)

    // Close more menu when navigating
    useEffect(() => {
        setIsMoreMenuOpen(false)
    }, [location.pathname])

    const mainNavItems = [
        { name: 'Home', path: '/dashboard', icon: <FaHome className="w-5 h-5" /> },
        { name: 'Campaigns', path: '/campaigns', icon: <FaBullhorn className="w-5 h-5" /> },
        { name: 'Templates', path: '/templates', icon: <FaLayerGroup className="w-5 h-5" /> },
        { name: 'Contacts', path: '/contacts', icon: <FaAddressBook className="w-5 h-5" /> },
        { name: 'Chats', path: '/chats', icon: <FaComments className="w-5 h-5" /> },
    ]

    const moreNavItems = [
        {
            name: 'Reports', path: '/reports', icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
            )
        },
        {
            name: 'Integrations', path: '/external-webhooks', icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
            )
        },
    ]

    return (
        <>
            {/* Overlay for More Menu */}
            {isMoreMenuOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/20 lg:hidden"
                    onClick={() => setIsMoreMenuOpen(false)}
                />
            )}

            {/* More Menu Popup */}
            {isMoreMenuOpen && (
                <div className="fixed bottom-16 right-2 z-50 w-48 bg-[#1F1F1F] border border-gray-800 rounded-xl shadow-xl overflow-hidden mb-2 lg:hidden">
                    <div className="py-2">
                        {moreNavItems.map((item) => {
                            const isActive = location.pathname === item.path
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`flex items-center space-x-3 px-4 py-3 transition-colors ${isActive ? 'bg-gray-800 text-[#FFC107]' : 'text-gray-300 hover:bg-gray-800'}`}
                                >
                                    {item.icon}
                                    <span className="text-sm font-medium">{item.name}</span>
                                </Link>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Bottom Nav Bar */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#1F1F1F] border-t border-gray-800 z-50">
                <div className="flex items-center justify-around h-16">
                    {mainNavItems.map((item) => {
                        const isActive = location.pathname === item.path
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex flex-col items-center justify-center space-y-1 w-full h-full transition-colors ${isActive ? 'text-[#FFC107]' : 'text-gray-400'}`}
                            >
                                {item.icon}
                                <span className="text-[10px] font-medium">{item.name}</span>
                            </Link>
                        )
                    })}

                    {/* Profile Button */}
                    <button
                        onClick={() => setIsProfileOpen(true)}
                        className={`flex flex-col items-center justify-center space-y-1 w-full h-full transition-colors ${isProfileOpen ? 'text-[#FFC107]' : 'text-gray-400 hover:text-white'}`}
                    >
                        <FaUser className="w-5 h-5" />
                        <span className="text-[10px] font-medium">Profile</span>
                    </button>

                    {/* More Button */}
                    <button
                        onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                        className={`flex flex-col items-center justify-center space-y-1 w-full h-full transition-colors ${isMoreMenuOpen ? 'text-[#FFC107]' : 'text-gray-400 hover:text-white'}`}
                    >
                        <FaEllipsisH className="w-5 h-5" />
                        <span className="text-[10px] font-medium">More</span>
                    </button>
                </div>
            </nav>

            <ProfileSettings
                isOpen={isProfileOpen}
                onClose={() => setIsProfileOpen(false)}
            />
        </>
    )
}

export default MobileNav
