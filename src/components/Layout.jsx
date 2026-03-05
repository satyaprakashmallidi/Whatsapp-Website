import Sidebar from './Sidebar'
import MobileNav from './MobileNav'

const Layout = ({ children }) => {
  return (
    <div className="flex flex-col lg:flex-row h-screen overflow-hidden bg-[#F5F5F5]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
        {children}
      </main>
      <MobileNav />
    </div>
  )
}

export default Layout
