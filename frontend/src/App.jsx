import { useState, useEffect } from 'react'
import Header from './components/Header'
import Hero from './components/Hero'
import NewArrivals from './components/NewArrivals'
import BannerCTA from './components/BannerCTA'
import Footer from './components/Footer'
import Login from './components/Login'
import CartDrawer from './components/CartDrawer'
import CheckoutPage from './components/CheckoutPage'
import DashboardRouter from './components/dashboard/DashboardRouter'
import { getAuth } from './api/client'
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
  const [authUser, setAuthUser] = useState(null)
  const [route, setRoute] = useState(window.location.hash)

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash
      // Always record the raw hash: sub-routes like #checkout/success/FF-10243
      // must re-render even though the top-level view stays 'checkout'.
      setRoute(hash)
      if (hash === '#login') {
        setView('login')
      } else if (hash.startsWith('#dashboard/')) {
        const role = hash.replace('#dashboard/', '')
        // Route guard: a dashboard is only reachable with a valid signed-in
        // user whose role matches the route (server-side RBAC also protects
        // every API call; this just avoids rendering the wrong shell).
        const auth = getAuth()
        if (!auth?.user || auth.user.dashboardKey !== role) {
          window.location.hash = 'login'
          return
        }
        setAuthUser(auth.user)
        setDashRole(role)
        setView('dashboard')
      } else if (hash.startsWith('#checkout')) {
        setView('checkout')
      } else {
        setView('store')
      }
    }

    // Check initial hash on mount
    handleHashChange()

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  // View swaps keep the old scroll offset (the storefront is very tall, so
  // e.g. CHECKOUT from the product grid lands on blank footer space) — snap
  // to the top. Section jumps inside the store (#offers, #women…) re-scroll
  // themselves in NewArrivals.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [view])

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
    return (
      <>
        <DashboardRouter role={dashRole} user={authUser} />
        <CartDrawer />
      </>
    )
  }

  if (view === 'checkout') {
    return (
      <div className="app-container">
        <Header onLoginClick={() => navigateTo('login')} />
        <main>
          <CheckoutPage route={route} />
        </main>
        <Footer />
        <CartDrawer />
      </div>
    )
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
      <CartDrawer />
    </div>
  )
}

export default App
