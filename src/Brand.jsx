import React from 'react';

// Caminho relativo mantém a marca acessível no subdiretório do GitHub Pages.
export function Brand(){
  return <div className="brand"><img className="brand-image" src={`${import.meta.env.BASE_URL}brand/grupo-marajo-logo.png`} alt="Grupo Marajó" width="2167" height="726"/></div>;
}
