import Sidebar from './Sidebar'

const Layout = ({ children }) => {
  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F5F5]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}

export default Layout
