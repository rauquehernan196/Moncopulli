import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { cerrarSesion, iniciarSesion, usuarioActual } from '../api/services'
import { getToken, setToken } from '../api/client'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)

  const login = useCallback(async (rut, contrasena) => {
    const res = await iniciarSesion(rut, contrasena)
    if (res.token) setToken(res.token)
    setUsuario(res.usuario)
    return res.usuario
  }, [])

  const logout = useCallback(async () => {
    try {
      if (getToken()) await cerrarSesion()
    } finally {
      setToken(null)
      setUsuario(null)
    }
  }, [])

  const actualizarUsuario = useCallback((cambios) => {
    setUsuario((u) => ({ ...u, ...cambios }))
  }, [])

  useEffect(() => {
    let cancelado = false
    const validar = () => {
      const token = getToken()
      if (!token) return
      usuarioActual()
        .then((real) => { if (!cancelado && getToken() === token) setUsuario(real) })
        .catch((error) => {
          if (!cancelado && error.status === 401 && getToken() === token) {
            setToken(null)
            setUsuario(null)
          }
        })
    }
    const expirada = () => {
      setToken(null)
      setUsuario(null)
    }
    validar()
    window.addEventListener('moncopulli:session-expired', expirada)
    window.addEventListener('online', validar)
    return () => {
      cancelado = true
      window.removeEventListener('moncopulli:session-expired', expirada)
      window.removeEventListener('online', validar)
    }
  }, [])

  const value = useMemo(() => ({ usuario, login, logout, actualizarUsuario }), [usuario, login, logout, actualizarUsuario])
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export const useAuth = () => useContext(AuthCtx)
