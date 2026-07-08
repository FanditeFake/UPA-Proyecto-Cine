import { Navigate, Route, Routes } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import { Login } from "./pages/Login";
import { Cliente } from "./pages/cliente/Cliente";
import { Admin } from "./pages/admin/Admin";
import { ProtectedRoute } from "./auth/ProtectedRoute";

export default function App() {
  const location = useLocation();

  return (
    // Sin mode="wait": la ruta entrante debe montarse de inmediato. Con
    // "wait", framer esperaba a que la ruta saliente (cliente, con componentes
    // WebGL) terminara su salida —que a veces no completaba— y dejaba la
    // pantalla en blanco al cerrar sesión.
    <AnimatePresence>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/cliente/*"
          element={
            <ProtectedRoute rol="cliente">
              <Cliente />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute rol="administrador">
              <Admin />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AnimatePresence>
  );
}
