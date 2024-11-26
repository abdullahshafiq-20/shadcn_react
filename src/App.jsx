import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import ChatPage from './pages/chat'
import Login from './pages/Login'
import Signup from './pages/Signup'

function App() {
  return (
    <div className="h-screen overflow-hidden">
      <Router>
        <Routes>
          <Route path="/" element={<ChatPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
        </Routes>
      </Router>
    </div>
  )
}

export default App