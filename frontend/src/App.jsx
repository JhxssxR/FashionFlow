import { useState, useEffect } from 'react'
import Header from './components/Header'
import Hero from './components/Hero'
import NewArrivals from './components/NewArrivals'
import BannerCTA from './components/BannerCTA'
import Footer from './components/Footer'
import Login from './components/Login'
import DashboardRouter from './components/dashboard/DashboardRouter'
import './App.css'
import './Dashboard.css'

// The app scrolls itself (hash-driven category jumps in the product section),
// so the browser's scroll restoration must not fight it on reloads.
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual'
}

function App() {
  const [view, setView] = useState('store')
  const [dashRole, setDashRole] = useState('admin')

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash
      if (hash === '#login') {
        setView('login')
      } else if (hash.startsWith('#dashboard/')) {
        setDashRole(hash.replace('#dashboard/', ''))
        setView('dashboard')
      } else {
        setView('store')
      }
    }

    // Check initial hash on mount
    handleHashChange()

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  // Scroll reveal animation observer
  useEffect(() => {
    if (view !== 'store') return

    const observerCallback = (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible')
          // Once revealed, unobserve to keep it visible
          observer.unobserve(entry.target)
        }
      })
    }

    const observer = new IntersectionObserver(observerCallback, {
      root: null,
      threshold: 0.12,
      rootMargin: '0px 0px -40px 0px'
    })

    const elements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale, .reveal-fade')
    elements.forEach((el) => observer.observe(el))

    return () => {
      elements.forEach((el) => observer.unobserve(el))
    }
  }, [view])

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

  if (view === 'dashboard') {
    return <DashboardRouter role={dashRole} />
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
