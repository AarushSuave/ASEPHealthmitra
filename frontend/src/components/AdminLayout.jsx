import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { Map, Users, Database, LogOut, Calendar } from 'lucide-react'

const adminNavItems = [
  { path: '/admin', icon: Map, label: 'Cluster Map' },
  { path: '/admin/appointments', icon: Calendar, label: 'Appointments' },
  { path: '/admin/villages', icon: Users, label: 'Village Stats' },
  { path: '/admin/patients', icon: Database, label: 'Patient Database' },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()

  return (
    <div className="admin-layout" style={{ display: 'flex', minHeight: '100vh', background: 'linear-gradient(135deg, #3f1d2e 0%, #7c2d12 45%, #1f2937 100%)', color: 'white' }}>
      <aside style={{ width: 260, borderRight: '1px solid rgba(255,255,255,0.1)', padding: '24px 16px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginBottom: 40, padding: '0 12px' }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>OurHealth Admin</h1>
          <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>Command Center</div>
        </div>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {adminNavItems.map(item => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/admin'}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  borderRadius: 12,
                  textDecoration: 'none',
                  color: 'white',
                  background: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
                  transition: 'background 0.2s'
                })}
              >
                <Icon size={20} />
                <span style={{ fontWeight: 500 }}>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 12px', marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
              A
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>{user?.name || 'Admin'}</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Administrator</div>
            </div>
          </div>
          <button 
            onClick={logout}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 12, background: 'rgba(239,68,68,0.2)', color: '#fca5a5', border: 'none', cursor: 'pointer' }}
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, padding: 32, overflowY: 'auto' }}>
        <Outlet />
      </main>
    </div>
  )
}
