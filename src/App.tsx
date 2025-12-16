import { HashRouter, Routes, Route, Link } from 'react-router-dom'
import Main from './pages/Main'
import Settings from './pages/Settings'

function App() {
  return (
    <HashRouter>
      <div className="app">
        <nav className="nav">
          <Link to="/" className="nav-link">メイン</Link>
          <Link to="/settings" className="nav-link">設定</Link>
        </nav>
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Main />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  )
}

export default App
