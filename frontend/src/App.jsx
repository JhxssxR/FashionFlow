import { useState } from 'react'
import Header from './components/Header'
import Hero from './components/Hero'
import NewArrivals from './components/NewArrivals'
import BannerCTA from './components/BannerCTA'
import Footer from './components/Footer'
import './App.css'

function App() {
  return (
    <div className="app-container">
      <Header />
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
