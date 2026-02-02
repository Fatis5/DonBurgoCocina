// src/App.jsx
import React from "react";
import ListaPedidos from "./screens/ListaPedidos";
import EstadoTiendaGate from "./screens/EstadotiendaGate";

const App = () => {
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <EstadoTiendaGate>
        <ListaPedidos />
      </EstadoTiendaGate>
    </div>
  );
};

export default App;
