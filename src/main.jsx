import React from 'react'
import ReactDOM from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App/>
    <Toaster position="top-right" toastOptions={{
      duration: 4000,
      style: { fontFamily: '"DM Sans", sans-serif', fontSize: '14px', borderRadius: '12px', border: '1px solid #e5e7eb' },
      success: { iconTheme: { primary: '#2563eb', secondary: '#fff' } },
      error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
    }}/>
  </React.StrictMode>
)
