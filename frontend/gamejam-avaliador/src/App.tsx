import type { ReactNode } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Footer } from './components/Footer'
import { Navbar } from './components/Navbar'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AdminConfigPage } from './pages/admin/AdminConfigPage'
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage'
import { AdminLayout } from './pages/admin/AdminLayout'
import { AdminLoginPage } from './pages/admin/AdminLoginPage'
import { AdminTeamsPage } from './pages/admin/AdminTeamsPage'
import { AdminVotersPage } from './pages/admin/AdminVotersPage'
import { HomePage } from './pages/HomePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { ResultsPage } from './pages/ResultsPage'
import { TeamsPage } from './pages/TeamsPage'
import { VotePage } from './pages/vote/VotePage'

function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="app-main">{children}</main>
      <Footer />
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicLayout><HomePage /></PublicLayout>} />
      <Route path="/times" element={<PublicLayout><TeamsPage /></PublicLayout>} />
      <Route path="/votar" element={<PublicLayout><VotePage /></PublicLayout>} />
      <Route path="/resultados" element={<PublicLayout><ResultsPage /></PublicLayout>} />

      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboardPage />} />
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="times" element={<AdminTeamsPage />} />
        <Route path="eleitoras" element={<AdminVotersPage />} />
        <Route path="configuracoes" element={<AdminConfigPage />} />
      </Route>

      <Route path="*" element={<PublicLayout><NotFoundPage /></PublicLayout>} />
    </Routes>
  )
}

export default App
