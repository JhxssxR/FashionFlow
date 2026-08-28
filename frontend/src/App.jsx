import { useState, useEffect } from 'react'
import Header from './components/Header'
import Hero from './components/Hero'
import NewArrivals from './components/NewArrivals'
import BannerCTA from './components/BannerCTA'
import Footer from './components/Footer'
import Login from './components/Login'
import './App.css'

function App() {
  const [view, setView] = useState('store')

  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#login') {
        setView('login')
      } else {
        setView('store')
      }
    }

    // Check initial hash on mount
    handleHashChange()

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const navigateTo = (newView) => {
    if (newView === 'login') {
      window.location.hash = 'login'
    } else {
      window.location.hash = ''
    }
  }

  if (view === 'login') {
    return <Login onBack={() => navigateTo('store')} />
  }

  return (
    <div className="app-container">
      <Header onLoginClick={() => navigateTo('login')} />
      <main>
        <Hero />
        <NewArrivals />
        <BannerCTA />
      </main>
      <Footer />
    </div>
  )
}

export default App
