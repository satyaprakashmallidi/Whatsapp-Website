import Sidebar from './Sidebar'
import MobileNav from './MobileNav'

const Layout = ({ children }) => {
  return (
    <div className="flex flex-col lg:flex-row h-screen h-[100dvh] overflow-hidden bg-[#F5F5F5]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-16 lg:pb-0 flex flex-col">
        {children}
      </main>
      <MobileNav />
    </div>
  )
}

export default Layout
