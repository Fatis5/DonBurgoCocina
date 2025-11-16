// src/Screens/ListaPedidos.jsx
import React, { useEffect, useState, useMemo, useRef } from "react";
import { FaCheck } from "react-icons/fa";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import audio from "../assets/audio.mp3";
import ModalPedidosListos from "./ModalPedidosListos";

const ListaPedidos = () => {
  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  // audio de alarma
  const audioRef = useRef(null);
  const alarmaRef = useRef(false);
  const [alarmaActiva, setAlarmaActiva] = useState(false);

  // animación del último pedido nuevo
  const [ultimoIdNuevo, setUltimoIdNuevo] = useState(null);

  // modal de nuevo pedido
  const [mostrarModalNuevo, setMostrarModalNuevo] = useState(false);
  const [pedidoEnModal, setPedidoEnModal] = useState(null);

  // modal de pedidos listos
  const [mostrarModalListos, setMostrarModalListos] = useState(false);

  // cuántos productos caben de arriba a abajo en una columna
  const [itemsPerCol, setItemsPerCol] = useState(8);

  // 🎵 controlar audio según alarmaActiva
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    if (alarmaActiva) {
      el.loop = true;
      el.currentTime = 0;
      el.play().catch(() => {});
    } else {
      el.pause();
      el.currentTime = 0;
      el.loop = false;
    }
  }, [alarmaActiva]);

  // 🔢 calcular cuántos productos caben en una columna, según altura de pantalla
  useEffect(() => {
    const calcItemsPerCol = () => {
      const h = window.innerHeight || 800;
      const headerYMargen = 220; // espacio para header y márgenes
      const usable = Math.max(250, h - headerYMargen);
      const alturaLinea = 26; // px aprox por producto/comentario
      const n = Math.max(4, Math.floor(usable / alturaLinea));
      setItemsPerCol(n);
    };

    calcItemsPerCol();
    window.addEventListener("resize", calcItemsPerCol);
    return () => window.removeEventListener("resize", calcItemsPerCol);
  }, []);

  // 🔊 escuchar pedidos
  useEffect(() => {
    const ref = collection(db, "pedidos");
    const q = query(ref, orderBy("fecha", "asc"));

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const lista = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        setPedidos((prev) => {
          const prevIds = new Set(prev.map((p) => p.id));
          const nuevosPendientes = lista.filter(
            (p) =>
              !prevIds.has(p.id) &&
              (String(p.status) === "1" ||
                String(p.status).toLowerCase() === "pendiente")
          );

          if (nuevosPendientes.length > 0 && !alarmaRef.current) {
            const ultimoNuevo = nuevosPendientes[nuevosPendientes.length - 1];

            alarmaRef.current = true;
            setAlarmaActiva(true);

            setUltimoIdNuevo(ultimoNuevo.id);
            setPedidoEnModal(ultimoNuevo);
            setMostrarModalNuevo(true);
          }

          return lista;
        });

        setCargando(false);
        setError(null);
      },
      (err) => {
        console.error("Error escuchando pedidos:", err);
        setError(
          "No se pudieron cargar los pedidos. Revisa la conexión o Firestore."
        );
        setCargando(false);
      }
    );

    return () => {
      unsubscribe();
      setAlarmaActiva(false);
      alarmaRef.current = false;
    };
  }, []);

  // quitar animación de “nuevo” después de unos segundos
  useEffect(() => {
    if (!ultimoIdNuevo) return;
    const t = setTimeout(() => setUltimoIdNuevo(null), 4000);
    return () => clearTimeout(t);
  }, [ultimoIdNuevo]);

  const pendientes = useMemo(
    () =>
      pedidos.filter(
        (p) =>
          String(p.status) === "1" ||
          String(p.status).toLowerCase() === "pendiente"
      ),
    [pedidos]
  );

  const listos = useMemo(
    () =>
      pedidos.filter(
        (p) =>
          String(p.status) === "2" ||
          String(p.status).toLowerCase() === "listo"
      ),
    [pedidos]
  );

  const marcarComoListo = async (id) => {
    try {
      await updateDoc(doc(db, "pedidos", id), {
        status: "2",
        fechaListo: serverTimestamp(),
      });
    } catch (e) {
      console.error(e);
      alert("No se pudo marcar como listo. Revisa la conexión.");
    }
  };

  const formatearHora = (fecha) => {
    try {
      if (!fecha) return "";
      let f;
      if (fecha.toDate) f = fecha.toDate();
      else if (fecha.seconds) f = new Date(fecha.seconds * 1000);
      else f = new Date(fecha);
      return f.toLocaleTimeString("es-MX", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const getMetodoEntrega = (p) =>
    p.MetodoEntrga || p.metodoEntrega || p.metodo || "Domicilio";

  const esDomicilio = (p) =>
    getMetodoEntrega(p).toLowerCase() === "domicilio";

  // partir productos de UN pedido en columnas
  const dividirProductosEnColumnas = (items) => {
    if (!items || items.length === 0) return [];
    const cols = [];
    for (let i = 0; i < items.length; i += itemsPerCol) {
      cols.push(items.slice(i, i + itemsPerCol));
    }
    return cols;
  };

  // aceptar en modal nuevo pedido
  const handleAceptarNuevo = () => {
    alarmaRef.current = false;
    setAlarmaActiva(false);
    setMostrarModalNuevo(false);
    setPedidoEnModal(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white px-4 py-4 md:py-6">
      {/* audio */}
      <audio ref={audioRef} src={audio} preload="auto" />

      {/* MODAL NUEVO PEDIDO */}
      {mostrarModalNuevo && pedidoEnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-slate-900 rounded-2xl shadow-2xl border border-emerald-500/70 max-w-md w-full mx-4 max-h-[80vh] flex flex-col">
            <div className="px-5 pt-4 pb-2">
              <h2 className="text-2xl font-extrabold mb-1">
                🛎️ ¡Nuevo pedido!
              </h2>
              <p className="text-base">
                Confirma que viste este pedido para detener la alarma.
              </p>
            </div>

            <div className="flex-1 overflow-auto px-5 pb-4">
              <div className="bg-slate-800/90 rounded-xl p-3 text-base">
                <p className="text-xs text-slate-400 uppercase mb-1">
                  Cliente
                </p>
                <p className="font-bold text-lg">
                  {pedidoEnModal.infoCliente?.nombre || "Sin nombre"}
                </p>
                {pedidoEnModal.infoCliente?.telefono && (
                  <p className="text-sm text-slate-300">
                    {pedidoEnModal.infoCliente.telefono}
                  </p>
                )}

                <div className="mt-3">
                  <p className="text-xs text-slate-400 mb-1">Productos</p>
                  <div className="flex gap-4 text-base">
                    {dividirProductosEnColumnas(
                      pedidoEnModal.nuevoCarrito || []
                    ).map((col, idxCol) => (
                      <div key={idxCol} className="min-w-[160px]">
                        {idxCol > 0 && (
                          <p className="text-[11px] text-slate-300 italic mb-1">
                            Continuación
                          </p>
                        )}
                        {col.map((it, idx) => (
                          <div key={idx} className="mb-1">
                            <span className="font-semibold block">
                              {it.cantidad || 1}×{" "}
                              {(it.handle || it.nombre || "").toUpperCase()}
                            </span>
                            {it.comentario && (
                              <span className="block text-sm text-slate-300">
                                {it.comentario}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                {pedidoEnModal.direccion && (
                  <div className="mt-3">
                    <p className="text-xs text-slate-400 mb-1">Dirección</p>
                    <p className="text-sm text-slate-100">
                      {pedidoEnModal.direccion}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="px-5 pb-5">
              <button
                onClick={handleAceptarNuevo}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-lg font-bold text-black"
              >
                ACEPTAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL pedidos listos */}
      {mostrarModalListos && (
        <ModalPedidosListos
          pedidos={listos}
          onClose={() => setMostrarModalListos(false)}
        />
      )}

      {/* HEADER */}
      <header className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Cocina Don Burgo
          </h1>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2 text-sm">
            <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-base">
              Pendientes: <b>{pendientes.length}</b>
            </span>
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-base">
              Listos: <b>{listos.length}</b>
            </span>
          </div>
          <button
            onClick={() => setMostrarModalListos(true)}
            className="mt-1 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-base"
          >
            Ver pedidos listos
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-3 rounded-xl bg-red-500/10 border border-red-500/50 text-red-200 px-4 py-2 text-base">
          {error}
        </div>
      )}

      {/* PEDIDOS PENDIENTES – SCROLL HORIZONTAL */}
      {cargando ? (
        <div className="flex justify-center items-center h-40">
          <p className="text-xl text-slate-200">Cargando pedidos...</p>
        </div>
      ) : pendientes.length === 0 ? (
        <p className="text-xl text-slate-400 mt-10">
          No hay pedidos pendientes.
        </p>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {pendientes.map((p) => {
            const items = p.nuevoCarrito || p.carrito || [];
            const info = p.infoCliente || {};
            const esDom = esDomicilio(p);
            const esNuevoAnimado = p.id === ultimoIdNuevo;
            const headerColor = esDom
              ? "bg-emerald-400 text-emerald-950"
              : "bg-amber-400 text-amber-950";

            const columnasProductos = dividirProductosEnColumnas(items);

            // 👉 total de productos del pedido
            const totalProductos = items.reduce(
              (acc, it) => acc + (it.cantidad || 1),
              0
            );

            return (
              <article
                key={p.id}
                className={`min-w-[260px] md:min-w-[280px] shrink-0 rounded-xl overflow-hidden shadow-lg border border-slate-700 bg-slate-900 ${
                  esNuevoAnimado ? "animate-pulse" : ""
                }`}
              >
                {/* HEADER DEL PEDIDO */}
                <div
                  className={`px-3 py-2 ${headerColor} flex flex-col gap-0.5`}
                >
                  <p className="text-xs font-semibold uppercase">
                    Pedido #{p.id.slice(-6).toUpperCase()}
                  </p>
                  <p className="text-sm font-bold truncate">
                    {info.nombre || "Sin nombre"}
                  </p>
                  <p className="text-xs font-medium">
                    {formatearHora(p.fecha)} ·{" "}
                    {esDom ? "Domicilio" : "Recoger"} ·{" "}
                    {totalProductos} prod.
                  </p>
                  {esDom && (
                    <p className="text-[11px] opacity-90 truncate">
                      {p.direccion}
                    </p>
                  )}
                </div>

                {/* CUERPO TIPO COMANDA */}
                <div className="bg-slate-50 text-slate-900 px-3 py-3">
                  <p className="text-xs font-semibold text-slate-500 mb-1">
                    Productos
                  </p>

                  <div className="flex gap-4 text-sm">
                    {columnasProductos.map((col, idxCol) => (
                      <div key={idxCol} className="min-w-[150px]">
                        {idxCol > 0 && (
                          <p className="text-[11px] text-slate-500 italic mb-1">
                            Continuación
                          </p>
                        )}
                        {col.map((it, idx) => (
                          <div key={idx} className="mb-1">
                            <span className="font-semibold block">
                              {it.cantidad || 1}×{" "}
                              {(it.handle || it.nombre || "").toUpperCase()}
                            </span>
                            {it.comentario && (
                              <span className="block text-xs text-slate-600">
                                {it.comentario}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>

                  {info.referencias && (
                    <div className="mt-3">
                      <p className="text-[11px] font-semibold text-slate-500">
                        Comentarios
                      </p>
                      <p className="text-xs text-slate-700">
                        {info.referencias}
                      </p>
                    </div>
                  )}
                </div>

                <div className="bg-slate-900 px-3 pb-3 pt-2">
                  <button
                    onClick={() => marcarComoListo(p.id)}
                    className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm flex items-center justify-center gap-2"
                  >
                    <FaCheck />
                    Pedido listo
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ListaPedidos;
