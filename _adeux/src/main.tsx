import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { registerSW } from './lib/pwa'

/** Suit la zone réellement visible (clavier iOS compris) pour que rien ne soit masqué. */
function trackViewport() {
  const root = document.documentElement
  const vv = window.visualViewport
  const apply = () => {
    root.style.setProperty('--vh', `${vv ? vv.height : window.innerHeight}px`)
    root.style.setProperty('--vtop', `${vv ? vv.offsetTop : 0}px`)
  }
  apply()
  vv?.addEventListener('resize', apply)
  vv?.addEventListener('scroll', apply)
  window.addEventListener('orientationchange', apply)
}
trackViewport()

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
registerSW()
