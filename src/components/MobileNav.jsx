import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { FaHome, FaBullhorn, FaLayerGroup, FaAddressBook, FaComments, FaUser } from 'react-icons/fa'
import ProfileSettings from './ProfileSettings'

const MobileNav = () => {
    const location = useLocation()
    const [isProfileOpen, setIsProfileOpen] = useState(false)

    const navItems = [
        { name: 'Home', path: '/dashboard', icon: <FaHome className="w-5 h-5" /> },
        { name: 'Campaigns', path: '/campaigns', icon: <FaBullhorn className="w-5 h-5" /> },
        { name: 'Templates', path: '/templates', icon: <FaLayerGroup className="w-5 h-5" /> },
        { name: 'Contacts', path: '/contacts', icon: <FaAddressBook className="w-5 h-5" /> },
        { name: 'Chats', path: '/chats', icon: <FaComments className="w-5 h-5" /> },
    ]

    return (
        <>
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#1F1F1F] border-t border-gray-800 z-50">
                <div className="flex items-center justify-around h-16 px-2">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex flex-col items-center justify-center space-y-1 w-full h-full transition-colors ${isActive ? 'text-[#FFC107]' : 'text-gray-400'
                                    }`}
                            >
                                {item.icon}
                                <span className="text-[10px] font-medium">{item.name}</span>
                            </Link>
                        )
                    })}
                    <button
                        onClick={() => setIsProfileOpen(true)}
                        className="flex flex-col items-center justify-center space-y-1 w-full h-full text-gray-400 transition-colors hover:text-[#FFC107]"
                    >
                        <FaUser className="w-5 h-5" />
                        <span className="text-[10px] font-medium">Profile</span>
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
