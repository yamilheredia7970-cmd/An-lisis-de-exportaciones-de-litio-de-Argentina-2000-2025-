import React, { useEffect, useState } from 'react';
import Papa from 'papaparse';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart 
} from 'recharts';
import { ArrowUpRight, ArrowDownRight, Activity, DollarSign, TrendingUp, AlertTriangle, ShieldCheck, BarChart3, Globe } from 'lucide-react';
import { cn } from '../lib/utils';
import MapChart from './MapChart';

interface LithiumData {
  Año: number;
  Exportaciones_FOB: number;
  Variación_interanual: number;
  Participación_total: number;
}

const COLORS = ['#3b82f6', '#334155', '#60a5fa', '#475569']; // Elegant dark blue theme

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 p-4 border border-slate-700 shadow-lg rounded-md">
        <p className="font-semibold text-slate-50 mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={`item-${index}`} style={{ color: entry.color }} className="text-sm font-medium">
            {entry.name}: {entry.name.includes('Variación') || entry.name.includes('Participación') 
              ? `${(entry.value * 100).toFixed(2)}%` 
              : `$${entry.value.toFixed(2)} M`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const [data, setData] = useState<LithiumData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/data.csv');
        const csvText = await response.text();
        
        Papa.parse(csvText, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => {
             // Clean and format data
             const parsedData = results.data.map((row: any) => ({
               Año: row['Año'],
               Exportaciones_FOB: row['Exportaciones_FOB'] || 0,
               Variación_interanual: row['Variación_interanual_eje_derecho'] || 0,
               Participación_total: row['Participación_sobre_total_exportado'] || 0
             })).filter(row => row.Año); // Ensure valid year
             
             setData(parsedData);
             setLoading(false);
          }
        });
      } catch (error) {
        console.error("Error loading data:", error);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin text-blue-600">
          <Activity size={32} />
        </div>
      </div>
    );
  }

  // --- Compute KPIs ---
  const latestYear = data[data.length - 1];
  const previousYear = data[data.length - 2];
  
  const totalExports = data.reduce((acc, curr) => acc + curr.Exportaciones_FOB, 0);
  const avgExports = totalExports / data.length;
  const maxExport = Math.max(...data.map(d => d.Exportaciones_FOB));
  const maxExportYear = data.find(d => d.Exportaciones_FOB === maxExport)?.Año;
  
  // CAGR Calculation
  const startVal = data[0].Exportaciones_FOB;
  const endVal = latestYear.Exportaciones_FOB;
  const periods = latestYear.Año - data[0].Año;
  const cagr = (Math.pow(endVal / startVal, 1 / periods) - 1) * 100;

  const yoyGrowthActual = ((latestYear.Exportaciones_FOB - previousYear.Exportaciones_FOB) / previousYear.Exportaciones_FOB) * 100;

  // Make pie chart data for latest year
  const otherExportsValue = (latestYear.Exportaciones_FOB / latestYear.Participación_total) - latestYear.Exportaciones_FOB;
  const pieData = [
    { name: 'Litio', value: latestYear.Exportaciones_FOB },
    { name: 'Resto de Exportaciones Mineras', value: otherExportsValue }
  ];

  // --- Insights Generation ---
  const insights = {
    positive: [
      `Crecimiento histórico consolidado con una tasa anual compuesta (CAGR) del ${cagr.toFixed(1)}% desde ${data[0].Año}.`,
      `El sector alcanzó su máximo histórico en ${maxExportYear} con USD ${maxExport.toFixed(2)} Millones.`,
      `Resiliencia del sector: la participación del litio sobre el total aumentó a ${(latestYear.Participación_total * 100).toFixed(1)}% en ${latestYear.Año}.`,
    ],
    risk: [
        latestYear.Variación_interanual < 0 
          ? `Desaceleración reciente: contracción del ${Math.abs(yoyGrowthActual).toFixed(1)}% en el último año analizado (${latestYear.Año}).` 
          : `Volatilidad latente: a pesar del crecimiento, existen fluctuaciones interanuales significativas a lo largo del período.`,
      `Concentración de mercado: el sector está supeditado a las fluctuaciones del precio internacional, evidenciando un desacople entre volumen y valor en ciertos años.`,
      `Riesgo de dependencia: con el litio representando gran parte de las exportaciones mineras, shocks externos pueden impactar fuertemente las divisas.`
    ]
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-slate-50 mb-2">Análisis de Exportaciones de Litio - Argentina</h1>
        <p className="text-slate-400">Dashboard de inteligencia de mercado e indicadores estructurales ({data[0].Año} - {latestYear.Año}).</p>
      </header>

      {/* KPI Section */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <KpiCard 
          title={`Exportaciones (${latestYear.Año})`}
          value={`$${latestYear.Exportaciones_FOB.toFixed(1)} M`}
          trend={yoyGrowthActual}
          trendLabel="vs año anterior"
          icon={<DollarSign className="text-blue-500" size={24} />}
        />
        <KpiCard 
          title="Crecimiento Compuesto (CAGR)"
          value={`${cagr.toFixed(1)}%`}
          subtitle={`Promedio anual desde ${data[0].Año}`}
          icon={<TrendingUp className="text-indigo-400" size={24} />}
        />
        <KpiCard 
          title="Participación de Mercado"
          value={`${(latestYear.Participación_total * 100).toFixed(1)}%`}
          subtitle={`Del total de exportaciones (${latestYear.Año})`}
          icon={<PieChart className="text-sky-400" size={24} />}
        />
        <KpiCard 
          title="Máximo Histórico"
          value={`$${maxExport.toFixed(0)} M`}
          subtitle={`Registrado en el año ${maxExportYear}`}
          icon={<BarChart3 className="text-emerald-400" size={24} />}
        />
      </section>

      {/* Main Charts area */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        {/* Evolution Chart (Large taking 2 columns on lg) */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-50 mb-6">Evolución Histórica y Variación Interanual</h2>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                <XAxis dataKey="Año" axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} tickFormatter={(value) => `$${value}`} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} tickFormatter={(value) => `${(value * 100).toFixed(0)}%`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar yAxisId="right" dataKey="Variación_interanual" name="Variación Interanual (%)" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                <Line yAxisId="left" type="monotone" dataKey="Exportaciones_FOB" name="Valor FOB (M USD)" stroke="#3b82f6" strokeWidth={3} dot={{r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#1e293b'}} activeDot={{r: 6}} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Participation Pie Chart */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm flex flex-col">
          <h2 className="text-lg font-semibold text-slate-50 mb-6">Peso Relativo del Sector ({latestYear.Año})</h2>
          <div className="flex-grow flex items-center justify-center h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `$${value.toFixed(1)} M`} />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 text-center">
            <p className="text-sm text-slate-400">
              El litio representa el <span className="font-bold text-slate-50">{(latestYear.Participación_total * 100).toFixed(1)}%</span> sobre el total exportado de su categoría, evidenciando un salto significativo desde el {(data[0].Participación_total * 100).toFixed(1)}% en {data[0].Año}.
            </p>
          </div>
        </div>
      </section>

      {/* Map Chart Area */}
      <section className="bg-slate-800 rounded-xl border border-slate-700 shadow-sm overflow-hidden mb-10">
        <div className="p-6 border-b border-slate-700 flex items-center gap-2">
          <Globe className="text-blue-400" size={24} />
          <h2 className="text-lg font-semibold text-slate-50">Mapa Mundial de Destinos de Exportación ({latestYear.Año})</h2>
        </div>
        <div className="h-[500px] w-full p-2 bg-[#0f172a]">
          <MapChart totalExportValue={latestYear.Exportaciones_FOB} />
        </div>
      </section>

      {/* Insights Section */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="text-emerald-500" size={24} />
            <h3 className="text-lg font-bold text-slate-50">Vectores de Crecimiento</h3>
          </div>
          <ul className="space-y-4">
            {insights.positive.map((insight, idx) => (
              <li key={idx} className="flex gap-3">
                <div className="mt-1 w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0"></div>
                <p className="text-slate-300">{insight}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="text-rose-500" size={24} />
            <h3 className="text-lg font-bold text-slate-50">Riesgos Estructurales</h3>
          </div>
          <ul className="space-y-4">
            {insights.risk.map((insight, idx) => (
              <li key={idx} className="flex gap-3">
                <div className="mt-1 w-2 h-2 rounded-full bg-rose-500 flex-shrink-0"></div>
                <p className="text-slate-300">{insight}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Data Table */}
      <section className="bg-slate-800 rounded-xl border border-slate-700 shadow-sm overflow-hidden mb-10">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-slate-50">Tabla de Datos Históricos</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-400 uppercase bg-slate-900/50">
              <tr>
                <th className="px-6 py-4 font-medium">Año</th>
                <th className="px-6 py-4 font-medium">Exportaciones FOB (USD M)</th>
                <th className="px-6 py-4 font-medium">Variación Interanual</th>
                <th className="px-6 py-4 font-medium">Participación Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {data.slice().reverse().map((row) => (
                <tr key={row.Año} className="hover:bg-slate-700/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-50">{row.Año}</td>
                  <td className="px-6 py-4 text-slate-300">${row.Exportaciones_FOB.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-full font-medium text-xs flex items-center w-fit gap-1",
                      row.Variación_interanual > 0 ? "bg-emerald-500/20 text-emerald-400" : 
                      row.Variación_interanual < 0 ? "bg-rose-500/20 text-rose-400" : "bg-slate-700 text-slate-300"
                    )}>
                      {row.Variación_interanual > 0 ? <ArrowUpRight size={12} /> : 
                       row.Variación_interanual < 0 ? <ArrowDownRight size={12} /> : null}
                      {(row.Variación_interanual * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-300">{(row.Participación_total * 100).toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      
      {/* Footer Conclusion */}
      <footer className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-slate-50">
        <h2 className="text-xl font-bold mb-4">Resumen Ejecutivo</h2>
        <div className="space-y-4 text-slate-300">
          <p>
            El análisis de la serie de tiempo (2000-2025) demuestra que el sector litífero en Argentina ha pasado de ser un segmento marginal a un pilar estratégico de las exportaciones mineras. Con un valor pico de <strong>USD {maxExport.toFixed(0)} M</strong>, la industria refleja la fuerte demanda global de reservas probadas para la transición energética.
          </p>
          <p>
            No obstante, las pronunciadas oscilaciones interanuales (variaciones de hasta +233% en 2022 y contracciones posteriores) advierten sobre la vulnerabilidad ligada a la fijación de precios internacionales. <strong>Implicancia de mercado:</strong> Resulta imperioso fortalecer la cadena de valor agregado local y diversificar destinos para mitigar la fuerte exposición a ciclos contractivos del <em>commoditie</em>, estabilizando así los flujos futuros de divisas.
          </p>
        </div>
      </footer>
    </div>
  );
}

function KpiCard({ title, value, subtitle, trend, trendLabel, icon }: any) {
  return (
    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm flex flex-col group hover:border-blue-500/50 transition-colors">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-sm font-medium text-slate-400">{title}</h3>
        <div className="p-2 bg-slate-900/50 rounded-lg group-hover:bg-blue-500/10 transition-colors">
          {icon}
        </div>
      </div>
      <div className="mb-2 flex items-baseline gap-2">
        <span className="text-3xl font-bold text-slate-50 tracking-tight">{value}</span>
      </div>
      {(trend !== undefined || subtitle) && (
        <div className="mt-auto pt-4 border-t border-slate-700 flex items-center justify-between">
          {subtitle && <span className="text-xs text-slate-400">{subtitle}</span>}
          {trend !== undefined && (
            <div className="flex items-center gap-1.5 flex-1 justify-end">
              <span className={cn(
                "text-xs font-semibold flex items-center gap-0.5",
                trend > 0 ? "text-emerald-500" : trend < 0 ? "text-rose-500" : "text-slate-400"
              )}>
                {trend > 0 ? <ArrowUpRight size={14} /> : trend < 0 ? <ArrowDownRight size={14} /> : null}
                {Math.abs(trend).toFixed(1)}%
              </span>
              {trendLabel && <span className="text-xs text-slate-400">{trendLabel}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
