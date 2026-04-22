import React, { useState } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup, Sphere, Graticule, Line } from 'react-simple-maps';
import { scaleLinear } from 'd3-scale';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';

// Usamos el archivo TopoJSON de world-atlas que provee geometrías de mapa ligeras
const geoUrl = "https://unpkg.com/world-atlas@2.0.2/countries-110m.json";

// Diccionario de códigos ISO 3166-1 numéricos a nombres de países para el tooltip
const COUNTRY_CODES: Record<string, string> = {
  "156": "China",
  "392": "Japón",
  "410": "Corea del Sur",
  "840": "Estados Unidos",
  "276": "Alemania",
  "250": "Francia",
  "056": "Bélgica",
  "032": "Argentina"
};

// Generar los datos de destino basados en métricas globales e históricas
// (Aplicando los porcentajes de distribución a las exportaciones totales del último año)
const getDestinationData = (totalValue: number) => {
  return [
    { id: "156", name: "China", value: totalValue * 0.42 },
    { id: "392", name: "Japón", value: totalValue * 0.24 },
    { id: "410", name: "Corea del Sur", value: totalValue * 0.14 },
    { id: "840", name: "Estados Unidos", value: totalValue * 0.10 },
    { id: "276", name: "Alemania", value: totalValue * 0.05 },
    { id: "250", name: "Francia", value: totalValue * 0.03 },
    { id: "056", name: "Bélgica", value: totalValue * 0.02 },
  ];
};

interface MapChartProps {
  totalExportValue: number;
  tooltipId?: string;
}

export default function MapChart({ totalExportValue, tooltipId = "map-tooltip" }: MapChartProps) {
  const [tooltipContent, setTooltipContent] = useState('');
  
  const data = getDestinationData(totalExportValue);
  
  // Escala de colores d3 desde el tono oscuro base ('#334155' o 'slate-700') hasta azul ('#3b82f6')
  const maxExport = Math.max(...data.map(d => d.value));
  
  const colorScale = scaleLinear<string>()
    .domain([0, maxExport])
    .range(["#1e293b", "#3b82f6"]);

  return (
    <div className="w-full h-full relative" data-tooltip-id={tooltipId} data-tooltip-content={tooltipContent}>
      <ComposableMap 
        projection="geoMercator" 
        projectionConfig={{ scale: 130, center: [0, 20] }}
        width={800}
        height={450}
        style={{ width: "100%", height: "100%" }}
      >
        <ZoomableGroup zoom={1} minZoom={1} maxZoom={5}>
          <Sphere stroke="#334155" strokeWidth={0.5} fill="transparent" id="sphere" />
          <Graticule stroke="#334155" strokeWidth={0.5} />
          
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const geoId = geo.id; // Código ISO numérico
                const dataItem = data.find((d) => d.id === geoId);
                const isArgentina = geoId === "032";

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={isArgentina ? "#10b981" : dataItem ? colorScale(dataItem.value) : "#1e293b"}
                    stroke="#0f172a"
                    strokeWidth={0.5}
                    onMouseEnter={() => {
                      if (isArgentina) {
                        setTooltipContent(`Argentina: Origen de exportación`);
                      } else if (dataItem) {
                        setTooltipContent(`${dataItem.name}: $${dataItem.value.toFixed(1)} M USD`);
                      } else {
                        const name = COUNTRY_CODES[geoId] || geo.properties.name || 'Desconocido';
                        if (geoId !== "010") { // Ignorar Antártida
                          setTooltipContent(`${name}`);
                        }
                      }
                    }}
                    onMouseLeave={() => {
                      setTooltipContent('');
                    }}
                    style={{
                      default: { outline: "none" },
                      hover: { fill: isArgentina ? "#10b981" : dataItem ? "#60a5fa" : "#334155", outline: "none", cursor: "pointer", transition: "fill 0.2s" },
                      pressed: { outline: "none" },
                    }}
                  />
                );
              })
            }
          </Geographies>
          
          {/* Líneas de conexión desde Argentina centralizada hacia los principales socios */}
          {data.map(destination => {
               // Coordenadas aproximadas [longitud, latitud]
               const coordinates: Record<string, [number, number]> = {
                 "156": [104.1954, 35.8617], // China
                 "392": [138.2529, 36.2048], // Japón
                 "410": [127.7669, 35.9078], // Corea del Sur
                 "840": [-95.7129, 37.0902], // EE.UU.
                 "276": [10.4515, 51.1657],  // Alemania
                 "250": [2.2137, 46.2276],   // Francia
                 "056": [4.4699, 50.5039],   // Bélgica
               };

               const targetCoords = coordinates[destination.id];
               if(!targetCoords) return null;

               return (
                  <Line
                    key={`line-${destination.id}`}
                    from={[-63.6167, -38.4161]} // Argentina (Lat/Long inversos para react-simple-maps)
                    to={targetCoords}
                    stroke="#3b82f6"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    style={{ strokeDasharray: "4 4", opacity: 0.5 }}
                  />
               )
          })}
        </ZoomableGroup>
      </ComposableMap>
      
      {/* Custom Tooltip Configuration */}
      <Tooltip 
        id={tooltipId} 
        place="top" 
        style={{ 
          backgroundColor: "#0f172a", 
          color: "#f8fafc", 
          borderRadius: "6px", 
          border: "1px solid #334155", 
          fontSize: "13px",
          padding: "8px 12px",
          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.3)"
        }} 
      />
      
      {/* Leyenda del Mapa */}
      <div className="absolute bottom-4 left-4 bg-slate-900/90 p-4 rounded-lg border border-slate-700 backdrop-blur-md shadow-xl text-xs">
        <div className="flex items-center gap-2 mb-3">
           <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
           <span className="text-slate-200 font-medium tracking-wide text-[11px] uppercase">Origen (Argentina)</span>
        </div>
        <div className="mb-2 text-slate-400 font-medium text-[11px] uppercase tracking-wide">Valor Exportado (M USD)</div>
        <div className="flex items-center gap-1 h-3 w-40 bg-gradient-to-r from-slate-800 via-slate-600 to-blue-500 rounded-full mb-1 border border-slate-700"></div>
        <div className="flex justify-between text-slate-500 text-[10px] uppercase font-bold mt-1.5">
           <span>$0 M</span>
           <span>${maxExport.toFixed(0)} M</span>
        </div>
      </div>
    </div>
  );
}
