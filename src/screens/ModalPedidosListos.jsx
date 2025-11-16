// src/Screens/ModalPedidosListos.jsx
import React, { useMemo, useState } from "react";
import { FaTimes } from "react-icons/fa";

// Convierte fecha de Firestore / JS a Date
const getFechaJS = (p) => {
  const raw = p.fechaListo || p.fecha || p.creado_en;
  if (!raw) return null;
  if (typeof raw.toDate === "function") return raw.toDate();
  if (raw.seconds) return new Date(raw.seconds * 1000);
  return new Date(raw);
};

// Normaliza el método de pago a etiquetas amigables
const normalizarMetodoPago = (p) => {
  const raw = (p.metodoPago || p.metodo || "").toString().toLowerCase();

  if (raw.includes("efectivo")) return { key: "efectivo", label: "Efectivo" };
  if (raw.includes("trans")) return { key: "transferencia", label: "Transferencia" };
  if (raw.includes("tarjeta")) return { key: "tarjeta", label: "Tarjeta" };

  if (!raw || raw === "null" || raw === "undefined") {
    return { key: "sin-metodo", label: "Sin método" };
  }
  return { key: raw, label: raw.charAt(0).toUpperCase() + raw.slice(1) };
};

// Filtra pedidos por rango de tiempo
const filtrarPorRango = (pedidos, filtro) => {
  if (filtro === "todo") return pedidos;

  const ahora = new Date();
  let desde;

  if (filtro === "hoy") {
    desde = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  } else if (filtro === "semana") {
    desde = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (filtro === "mes") {
    desde = new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  return pedidos.filter((p) => {
    const f = getFechaJS(p);
    if (!f) return false;
    return f >= desde && f <= ahora;
  });
};

const ModalPedidosListos = ({ pedidos = [], onClose }) => {
  const [filtro, setFiltro] = useState("hoy"); // "hoy" | "semana" | "mes" | "todo"
  const [pedidoDetalle, setPedidoDetalle] = useState(null); // 👈 nuevo modal detalle

  // Calculamos totales y estadísticas según el filtro
  const {
    pedidosFiltrados,
    totalPedidos,
    totalProductos,
    statsProductos,
    resumenMetodos,
  } = useMemo(() => {
    const filtrados = filtrarPorRango(pedidos, filtro);

    let totalProd = 0;
    const mapProductos = new Map();
    const mapMetodos = new Map();

    filtrados.forEach((p) => {
      const items = p.nuevoCarrito || p.carrito || [];
      const { key: metodoKey, label: metodoLabel } = normalizarMetodoPago(p);

      // Inicializar resumen por método si no existe
      if (!mapMetodos.has(metodoKey)) {
        mapMetodos.set(metodoKey, {
          id: metodoKey,
          label: metodoLabel,
          totalPedidos: 0,
          totalProductos: 0,
        });
      }
      const resumenMetodo = mapMetodos.get(metodoKey);
      resumenMetodo.totalPedidos += 1;

      items.forEach((it) => {
        const key =
          (it.handle || it.nombre || "Producto sin nombre").toLowerCase();
        const cantidad = it.cantidad || 1;
        totalProd += cantidad;

        // Global productos
        const previo = mapProductos.get(key) || {
          id: key,
          nombre: key,
          cantidad: 0,
        };
        previo.cantidad += cantidad;
        mapProductos.set(key, previo);

        // Por método de pago
        resumenMetodo.totalProductos += cantidad;
      });

      mapMetodos.set(metodoKey, resumenMetodo);
    });

    const stats = Array.from(mapProductos.values()).sort(
      (a, b) => b.cantidad - a.cantidad
    );

    const resumenMetodosArr = Array.from(mapMetodos.values()).sort(
      (a, b) => b.totalProductos - a.totalProductos
    );

    return {
      pedidosFiltrados: filtrados,
      totalPedidos: filtrados.length,
      totalProductos: totalProd,
      statsProductos: stats,
      resumenMetodos: resumenMetodosArr,
    };
  }, [pedidos, filtro]);

  const filtros = [
    { id: "hoy", label: "Hoy" },
    { id: "semana", label: "Últimos 7 días" },
    { id: "mes", label: "Últimos 30 días" },
    { id: "todo", label: "Todo" },
  ];

  const formatearFechaCorta = (p) => {
    const f = getFechaJS(p);
    if (!f) return "";
    return f.toLocaleString("es-MX", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatearFechaLarga = (p) => {
    const f = getFechaJS(p);
    if (!f) return "";
    return f.toLocaleString("es-MX", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const calcularTotalProductosPedido = (p) => {
    const items = p.nuevoCarrito || p.carrito || [];
    return items.reduce((acc, it) => acc + (it.cantidad || 1), 0);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70">
      <div className="bg-slate-900 rounded-2xl shadow-2xl border border-emerald-500/60 max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* HEADER */}
        <div className="flex items-start justify-between px-5 pt-4 pb-2 border-b border-slate-700/70">
          <div>
            <h2 className="text-xl md:text-2xl font-extrabold text-white">
              Pedidos listos (status = 2)
            </h2>
            <p className="text-xs md:text-sm text-slate-300">
              Resumen de productos vendidos y métodos de pago.
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-3 mt-1 text-slate-300 hover:text-white"
          >
            <FaTimes />
          </button>
        </div>

        {/* FILTROS */}
        <div className="px-5 pt-3 pb-2 border-b border-slate-800 flex flex-wrap gap-2">
          {filtros.map((f) => (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${
                filtro === f.id
                  ? "bg-emerald-500 text-black border-emerald-400"
                  : "bg-slate-800 text-slate-200 border-slate-600 hover:bg-slate-700"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* RESUMEN GLOBAL */}
        <div className="px-5 py-3 border-b border-slate-800 text-sm text-slate-200 flex flex-wrap gap-4">
          <span>
            <b>Pedidos listos:</b> {totalPedidos}
          </span>
          <span>
            <b>Productos totales:</b> {totalProductos}
          </span>
        </div>

        {/* RESUMEN POR MÉTODO DE PAGO */}
        <div className="px-5 pb-3 border-b border-slate-800 text-xs md:text-sm text-slate-200">
          <p className="font-semibold mb-1">Por método de pago:</p>
          {resumenMetodos.length === 0 ? (
            <p className="text-slate-500 text-xs">
              No hay pedidos en este período.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {resumenMetodos.map((m) => (
                <div
                  key={m.id}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-600 text-xs md:text-sm"
                >
                  <p className="font-semibold">{m.label}</p>
                  <p>
                    Pedidos: <b>{m.totalPedidos}</b>
                  </p>
                  <p>
                    Productos: <b>{m.totalProductos}</b>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div className="flex-1 overflow-auto px-5 py-4 flex flex-col md:flex-row gap-4">
          {/* Tabla de productos */}
          <div className="md:w-2/3">
            <h3 className="text-sm font-semibold text-slate-300 mb-2">
              Productos vendidos (todos los métodos)
            </h3>
            {statsProductos.length === 0 ? (
              <p className="text-sm text-slate-500">
                No hay pedidos listos en este período.
              </p>
            ) : (
              <div className="bg-slate-950/60 rounded-xl border border-slate-800 max-h-[280px] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-900">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs text-slate-400">
                        Producto
                      </th>
                      <th className="text-right px-3 py-2 text-xs text-slate-400">
                        Cantidad
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {statsProductos.map((prod) => (
                      <tr
                        key={prod.id}
                        className="border-t border-slate-800/70"
                      >
                        <td className="px-3 py-1.5">
                          {prod.nombre.replace(/-/g, " ").toUpperCase()}
                        </td>
                        <td className="px-3 py-1.5 text-right font-bold">
                          {prod.cantidad}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Lista de pedidos (click abre detalle) */}
          <div className="md:w-1/3">
            <h3 className="text-sm font-semibold text-slate-300 mb-2">
              Pedidos en el período
            </h3>
            {pedidosFiltrados.length === 0 ? (
              <p className="text-sm text-slate-500">
                No hay pedidos listos en este período.
              </p>
            ) : (
              <div className="bg-slate-950/60 rounded-xl border border-slate-800 max-h-[280px] overflow-auto text-xs">
                <ul>
                  {pedidosFiltrados.map((p) => {
                    const { label: metodoLabel } = normalizarMetodoPago(p);
                    const totalPedido = calcularTotalProductosPedido(p);
                    return (
                      <li
                        key={p.id}
                        onClick={() => setPedidoDetalle(p)}
                        className="px-3 py-2 border-b border-slate-800/70 cursor-pointer hover:bg-slate-800/60"
                      >
                        <p className="font-semibold">
                          #{p.id.slice(-6).toUpperCase()} –{" "}
                          {p.infoCliente?.nombre || "Sin nombre"}
                        </p>
                        <p className="text-slate-400">
                          {formatearFechaCorta(p)} · {metodoLabel} ·{" "}
                          {totalPedido} prod.
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* BOTÓN CERRAR */}
        <div className="px-5 pb-4 pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="ml-auto block px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-sm font-semibold"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* MODAL DETALLE DE UN PEDIDO */}
      {pedidoDetalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-slate-900 rounded-2xl shadow-2xl border border-emerald-500/70 max-w-md w-full mx-4 max-h-[85vh] flex flex-col">
            {/* Header detalle */}
            <div className="flex items-start justify-between px-5 pt-4 pb-2 border-b border-slate-800">
              <div>
                <p className="text-sm text-emerald-300 font-semibold">
                  Pedido #{pedidoDetalle.id.slice(-6).toUpperCase()}
                </p>
                <p className="text-lg font-bold">
                  {pedidoDetalle.infoCliente?.nombre || "Sin nombre"}
                </p>
                <p className="text-xs text-slate-400">
                  {formatearFechaLarga(pedidoDetalle)}
                </p>
              </div>
              <button
                onClick={() => setPedidoDetalle(null)}
                className="ml-3 mt-1 text-slate-300 hover:text-white"
              >
                <FaTimes />
              </button>
            </div>

            {/* Contenido detalle */}
            <div className="flex-1 overflow-auto px-5 py-3 text-sm text-slate-100">
              <p className="text-xs text-slate-400 uppercase mb-1">
                Cliente
              </p>
              <p className="mb-1">
                {pedidoDetalle.infoCliente?.nombre || "Sin nombre"}
              </p>
              {pedidoDetalle.infoCliente?.telefono && (
                <p className="text-xs text-slate-300 mb-2">
                  {pedidoDetalle.infoCliente.telefono}
                </p>
              )}

              <p className="text-xs text-slate-400 uppercase mt-2 mb-1">
                Entrega / Pago
              </p>
              <p className="text-xs text-slate-300">
                Entrega:{" "}
                {pedidoDetalle.metodoEntrega ||
                  pedidoDetalle.MetodoEntrga ||
                  "Domicilio"}
              </p>
              <p className="text-xs text-slate-300 mb-2">
                Pago: {normalizarMetodoPago(pedidoDetalle).label}
              </p>

              {pedidoDetalle.direccion && (
                <>
                  <p className="text-xs text-slate-400 uppercase mb-1">
                    Dirección
                  </p>
                  <p className="text-xs mb-2">
                    {pedidoDetalle.direccion}
                  </p>
                </>
              )}

              {pedidoDetalle.infoCliente?.referencias && (
                <>
                  <p className="text-xs text-slate-400 uppercase mb-1">
                    Comentarios del cliente
                  </p>
                  <p className="text-xs mb-2">
                    {pedidoDetalle.infoCliente.referencias}
                  </p>
                </>
              )}

              {/* Productos del pedido */}
              <p className="text-xs text-slate-400 uppercase mt-3 mb-1">
                Productos ({calcularTotalProductosPedido(pedidoDetalle)} en total)
              </p>
              <ul className="space-y-1">
                {(pedidoDetalle.nuevoCarrito || pedidoDetalle.carrito || []).map(
                  (it, idx) => (
                    <li key={idx} className="text-xs">
                      <span className="font-semibold">
                        {it.cantidad || 1}×{" "}
                        {(it.handle || it.nombre || "").toUpperCase()}
                      </span>
                      {it.comentario && (
                        <span className="block text-[11px] text-slate-300">
                          {it.comentario}
                        </span>
                      )}
                    </li>
                  )
                )}
              </ul>
            </div>

            {/* Cerrar detalle */}
            <div className="px-5 pb-4 pt-2 border-t border-slate-800">
              <button
                onClick={() => setPedidoDetalle(null)}
                className="ml-auto block px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-sm font-semibold text-black"
              >
                Cerrar detalle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModalPedidosListos;
