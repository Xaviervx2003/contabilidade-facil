import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './themeContext'
import DefaultLayout from './layout/DefaultLayout'
import LoginPage from './pages/LoginPage'
import './App.scss'

function App() {
    return (
        <ThemeProvider>
            <Router>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/*" element={<DefaultLayout />} />
                </Routes>
            </Router>
        </ThemeProvider>
    )
}

export default App