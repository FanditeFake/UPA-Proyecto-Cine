import { useEffect, useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import Lightfall from "../components/Lightfall";
import DecryptedText from "../components/DecryptedText";
import styles from "./Login.module.css";

export function Login() {
  const [modo, setModo] = useState<"login" | "registro">("login");
  const [brandKey, setBrandKey] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setBrandKey((k) => k + 1), 4500);
    return () => clearInterval(id);
  }, []);
  const navigate = useNavigate();
  const { iniciarSesion } = useAuth();

  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  function redirigir(rol: string) {
    navigate(rol === "administrador" ? "/admin" : "/cliente", { replace: true });
  }

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const { usuario, token } = await api.login(correo, password);
      iniciarSesion(usuario, token);
      redirigir(usuario.rol);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo iniciar sesión.");
    } finally {
      setCargando(false);
    }
  }

  async function handleRegistro(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setCargando(true);
    try {
      const { usuario, token } = await api.registrar(nombre, correo, password);
      iniciarSesion(usuario, token);
      redirigir(usuario.rol);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear la cuenta.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <motion.div
      className={styles.wrapper}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className={styles.lightfallBg}>
        <Lightfall
          colors={["#e3b23c", "#7d0f22", "#f0d48a"]}
          backgroundColor="#4a0812"
          speed={0.6}
          streakCount={6}
          density={0.5}
          glow={1}
          zoom={2.4}
          mouseInteraction
          mouseStrength={0.6}
        />
      </div>

      <motion.div
        className={styles.card}
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        <div className={styles.side}>
          <div className={styles.brand}>
            <h1 className={styles.brandTitle}>
              <DecryptedText
                key={brandKey}
                text="CINEMAX"
                animateOn="view"
                sequential
                revealDirection="start"
                speed={40}
                className={styles.brandRevealed}
                encryptedClassName={styles.brandEncrypted}
              />
            </h1>
          </div>

          <div className={`film-strip film-strip--on-dark ${styles.strip}`} />
        </div>

        <div className={styles.main}>
          <div className={styles.tabs}>
            <button
              type="button"
              className={`${styles.tab} ${modo === "login" ? styles.tabActive : ""}`}
              onClick={() => { setModo("login"); setError(null); }}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              className={`${styles.tab} ${modo === "registro" ? styles.tabActive : ""}`}
              onClick={() => { setModo("registro"); setError(null); }}
            >
              Crear cuenta
            </button>
          </div>

          <AnimatePresence mode="wait">
            {modo === "login" ? (
              <motion.form
                key="login"
                onSubmit={handleLogin}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.25 }}
              >
                <p className={styles.subtitle}>Ingresa tus credenciales para continuar.</p>
                {error && <div className={styles.error}>{error}</div>}

                <div className={styles.field}>
                  <label htmlFor="correo">Correo electrónico</label>
                  <input id="correo" type="email" required value={correo} onChange={(e) => setCorreo(e.target.value)} />
                </div>
                <div className={styles.field}>
                  <label htmlFor="password">Contraseña</label>
                  <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>

                <button type="submit" className={styles.submit} disabled={cargando}>
                  {cargando ? "Ingresando…" : "Entrar"}
                </button>
              </motion.form>
            ) : (
              <motion.form
                key="registro"
                onSubmit={handleRegistro}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.25 }}
              >
                <p className={styles.subtitle}>Crea tu cuenta para comprar boletos.</p>
                {error && <div className={styles.error}>{error}</div>}

                <div className={styles.field}>
                  <label htmlFor="nombre">Nombre completo</label>
                  <input id="nombre" type="text" required value={nombre} onChange={(e) => setNombre(e.target.value)} />
                </div>
                <div className={styles.field}>
                  <label htmlFor="regCorreo">Correo electrónico</label>
                  <input id="regCorreo" type="email" required value={correo} onChange={(e) => setCorreo(e.target.value)} />
                </div>
                <div className={styles.field}>
                  <label htmlFor="regPassword">Contraseña</label>
                  <input id="regPassword" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>

                <button type="submit" className={styles.submit} disabled={cargando}>
                  {cargando ? "Creando cuenta…" : "Crear cuenta"}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
