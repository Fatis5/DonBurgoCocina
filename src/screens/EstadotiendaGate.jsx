import React, { useEffect, useState } from "react";
import { doc, onSnapshot, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";

/**
 * Guarda el estado en: /config/tienda
 * Campo: estadoTienda (boolean)
 */
const EstadoTiendaGate = ({ children }) => {
  const [estadoTienda, setEstadoTienda] = useState(null); // null = cargando
  const [error, setError] = useState(null);

  const refTienda = doc(db, "config", "tienda");

  useEffect(() => {
    const unsub = onSnapshot(
      refTienda,
      (snap) => {
        if (!snap.exists()) {
          // Si no existe, la creamos abierta por defecto
          setDoc(
            refTienda,
            { estadoTienda: true, updatedAt: serverTimestamp() },
            { merge: true }
          ).catch(() => {});
          setEstadoTienda(true);
          return;
        }

        const data = snap.data() || {};
        // Default: true si no viene
        setEstadoTienda(typeof data.estadoTienda === "boolean" ? data.estadoTienda : true);
        setError(null);
      },
      (e) => {
        console.error("Error estado tienda:", e);
        setError("No se pudo leer el estado de la tienda.");
        setEstadoTienda(true); // fallback: no bloquear cocina
      }
    );

    return () => unsub();
  }, []);

  const cerrarTienda = async () => {
    try {
      await updateDoc(refTienda, {
        estadoTienda: false,
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.error(e);
      alert("No se pudo cerrar la tienda. Revisa conexión/Firestore.");
    }
  };

  const abrirTienda = async () => {
    try {
      await setDoc(
        refTienda,
        { estadoTienda: true, updatedAt: serverTimestamp() },
        { merge: true }
      );
    } catch (e) {
      console.error(e);
      alert("No se pudo abrir la tienda. Revisa conexión/Firestore.");
    }
  };

  // Cargando
  if (estadoTienda === null) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-xl text-slate-300">Cargando estado de tienda...</p>
      </div>
    );
  }

  // Vista TIENDA CERRADA
  if (estadoTienda === false) {
    return (
      <div className="min-h-screen bg-red-950 text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl bg-black/30 border border-red-400/40 shadow-2xl p-8 text-center">
          <div className="text-6xl mb-3">😢</div>
          <h1 className="text-3xl font-extrabold mb-2">Tienda cerrada</h1>
          <p className="text-base text-red-100/90 mb-6">
            La tienda está en modo cerrado. Presiona para volver a abrir.
          </p>

          {error && (
            <div className="mb-4 rounded-xl bg-red-500/20 border border-red-500/40 px-4 py-2 text-sm text-red-100">
              {error}
            </div>
          )}

          <button
            onClick={abrirTienda}
            className="w-full py-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-extrabold text-lg active:scale-[0.98]"
          >
            Abrir tienda
          </button>
        </div>
      </div>
    );
  }

  // Vista NORMAL (tienda abierta) + botón para cerrar
  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="text-white font-bold">
          Estado: <span className="text-emerald-300">Abierta</span>
        </div>

        <button
          onClick={cerrarTienda}
          className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-400 text-black font-extrabold flex items-center gap-2 active:scale-[0.98]"
          title="Cerrar tienda"
        >
          <span className="text-xl">😢</span>
          Tienda cerrada
        </button>
      </div>

      {children}
    </div>
  );
};

export default EstadoTiendaGate;
