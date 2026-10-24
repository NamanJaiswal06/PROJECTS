import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('cc_user')
    return stored ? JSON.parse(stored) : null
  })
  const [loading, setLoading] = useState(false)

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    const { user, token } = data.data
    localStorage.setItem('cc_token', token)
    localStorage.setItem('cc_user', JSON.stringify(user))
    setUser(user)
    return user
  }

  const register = async (name, email, password, role) => {
    const { data } = await api.post('/auth/register', { name, email, password, role })
    const { user, token } = data.data
    localStorage.setItem('cc_token', token)
    localStorage.setItem('cc_user', JSON.stringify(user))
    setUser(user)
    return user
  }

  const logout = () => {
    localStorage.removeItem('cc_token')
    localStorage.removeItem('cc_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
