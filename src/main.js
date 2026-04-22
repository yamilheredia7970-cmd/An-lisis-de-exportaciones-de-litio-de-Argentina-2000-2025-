import './index.css';

let lithiumData = [];
let worldGeoJson = null;

// ECharts instances
let evoChart = null;
let pieChart = null;
let mapA = null;
let mapB = null;

// State
let yearA = 0;
let yearB = 0;
let latestYear = null;
let previousYear = null;

const THEME = {
  blue: '#3b82f6',
  slateDark: '#1e293b',
  slateLight: '#334155',
  slateText: '#94a3b8',
  slateLightText: '#f8fafc',
  emerald: '#10b981'
};

async function bootstrap() {
  try {
    const [csvRes, mapRes] = await Promise.all([
      fetch('/data.csv'),
      fetch('https://cdn.jsdelivr.net/npm/echarts@4.9.0/map/json/world.json')
    ]);

    const csvText = await csvRes.text();
    worldGeoJson = await mapRes.json();
    echarts.registerMap('world', worldGeoJson);

    Papa.parse(csvText, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        lithiumData = results.data.map(row => ({
          Año: row['Año'],
          Exportaciones_FOB: row['Exportaciones_FOB'] || 0,
          Variación_interanual: row['Variación_interanual_eje_derecho'] || 0,
          Participación_total: row['Participación_sobre_total_exportado'] || 0
        })).filter(r => r.Año);

        if (lithiumData.length >= 2) {
          latestYear = lithiumData[lithiumData.length - 1];
          previousYear = lithiumData[lithiumData.length - 2];
          yearA = latestYear.Año;
          yearB = lithiumData[Math.max(0, lithiumData.length - 6)].Año;
        }

        document.getElementById('loader').classList.add('hidden');
        renderDashboard();
      }
    });
  } catch (error) {
    console.error("Error al cargar datos", error);
    document.getElementById('root').innerHTML = '<div class="p-8 text-rose-500">Error inicializando la aplicación. Verifica la conexión o los archivos de datos.</div>';
  }
}

function getIcon(name, classes) {
  return `<i data-lucide="${name}" class="${classes}"></i>`;
}

function renderTrend(trend) {
  if (trend === undefined || trend === null) return '';
  const isPositive = trend > 0;
  const isNegative = trend < 0;
  const colorClass = isPositive ? 'text-emerald-500' : isNegative ? 'text-rose-500' : 'text-slate-400';
  const icon = isPositive ? 'arrow-up-right' : isNegative ? 'arrow-down-right' : 'minus';
  
  return `
    <span class="text-xs font-semibold flex items-center gap-0.5 ${colorClass}">
      ${getIcon(icon, 'w-3 h-3')}
      ${Math.abs(trend).toFixed(1)}%
    </span>
  `;
}

function KpiCard(title, value, subtitle, trend, trendLabel, iconHtml) {
  return `
    <div class="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm flex flex-col group hover:border-blue-500/50 transition-colors">
      <div class="flex justify-between items-start mb-4">
        <h3 class="text-sm font-medium text-slate-400">${title}</h3>
        <div class="p-2 bg-slate-900/50 rounded-lg group-hover:bg-blue-500/10 transition-colors">
          ${iconHtml}
        </div>
      </div>
      <div class="mb-2 flex items-baseline gap-2">
        <span class="text-3xl font-bold text-slate-50 tracking-tight">${value}</span>
      </div>
      ${(trend !== undefined || subtitle) ? `
        <div class="mt-auto pt-4 border-t border-slate-700 flex items-center justify-between">
          ${subtitle ? `<span class="text-xs text-slate-400">${subtitle}</span>` : ''}
          ${trend !== undefined ? `
            <div class="flex items-center gap-1.5 flex-1 justify-end">
              ${renderTrend(trend)}
              ${trendLabel ? `<span class="text-xs text-slate-400">${trendLabel}</span>` : ''}
            </div>
          ` : ''}
        </div>
      ` : ''}
    </div>
  `;
}

function renderDashboard() {
  const root = document.getElementById('root');
  
  // Computations
  const totalExports = lithiumData.reduce((acc, curr) => acc + curr.Exportaciones_FOB, 0);
  const maxExport = Math.max(...lithiumData.map(d => d.Exportaciones_FOB));
  const maxExportYear = lithiumData.find(d => d.Exportaciones_FOB === maxExport)?.Año;
  
  const startVal = lithiumData[0].Exportaciones_FOB;
  const endVal = latestYear.Exportaciones_FOB;
  const periods = latestYear.Año - lithiumData[0].Año;
  const cagr = (Math.pow(endVal / startVal, 1 / periods) - 1) * 100;
  const yoyGrowthActual = ((latestYear.Exportaciones_FOB - previousYear.Exportaciones_FOB) / previousYear.Exportaciones_FOB) * 100;

  const availableYears = [...lithiumData].reverse().map(d => d.Año);

  root.innerHTML = `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <header class="mb-10">
        <h1 class="text-3xl font-bold text-slate-50 mb-2">Análisis de Exportaciones de Litio - Argentina</h1>
        <p class="text-slate-400">Dashboard de inteligencia de mercado e indicadores estructurales (${lithiumData[0].Año} - ${latestYear.Año}).</p>
      </header>

      <section class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        ${KpiCard(`Exportaciones (${latestYear.Año})`, `$${latestYear.Exportaciones_FOB.toFixed(1)} M`, null, yoyGrowthActual, "vs año anterior", getIcon('dollar-sign', 'text-blue-500 w-6 h-6'))}
        ${KpiCard(`Crecimiento Compuesto (CAGR)`, `${cagr.toFixed(1)}%`, `Promedio anual desde ${lithiumData[0].Año}`, null, null, getIcon('trending-up', 'text-indigo-400 w-6 h-6'))}
        ${KpiCard(`Participación de Mercado`, `${(latestYear.Participación_total * 100).toFixed(1)}%`, `Del total de exportaciones (${latestYear.Año})`, null, null, getIcon('pie-chart', 'text-sky-400 w-6 h-6'))}
        ${KpiCard(`Máximo Histórico`, `$${maxExport.toFixed(0)} M`, `Registrado en el año ${maxExportYear}`, null, null, getIcon('bar-chart-3', 'text-emerald-400 w-6 h-6'))}
      </section>

      <!-- Comparador Histórico -->
      <section class="bg-slate-800 rounded-xl border border-slate-700 shadow-sm overflow-hidden mb-10">
        <div class="p-6 border-b border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div class="flex items-center gap-2">
            ${getIcon('git-compare', 'text-purple-400 w-6 h-6')}
            <h2 class="text-lg font-semibold text-slate-50">Comparador Histórico de Exportaciones</h2>
          </div>
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-2">
              <label for="yearA" class="text-sm text-slate-400 font-medium">Año A:</label>
              <select id="yearA" class="bg-slate-900 border border-slate-600 text-slate-50 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none cursor-pointer">
                ${availableYears.map(y => `<option value="${y}" ${y === yearA ? 'selected' : ''}>${y}</option>`).join('')}
              </select>
            </div>
            <div class="flex items-center gap-2">
              <label for="yearB" class="text-sm text-slate-400 font-medium">Año B:</label>
              <select id="yearB" class="bg-slate-900 border border-slate-600 text-slate-50 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none cursor-pointer">
                ${availableYears.map(y => `<option value="${y}" ${y === yearB ? 'selected' : ''}>${y}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>
        <div class="p-6 grid grid-cols-1 xl:grid-cols-2 gap-8 bg-slate-900/30">
          <div class="flex flex-col gap-4">
            <div class="bg-slate-900/50 p-4 rounded-xl border border-slate-700 flex justify-between items-center shadow-inner">
              <div>
                <div class="text-slate-400 text-sm uppercase tracking-wide">Desempeño <span id="lbl-year-a">${yearA}</span></div>
                <div class="text-2xl font-bold text-slate-50" id="lbl-fob-a">$-$ M</div>
              </div>
              <div class="text-right">
                <div class="text-slate-400 text-sm uppercase tracking-wide">Participación Total</div>
                <div class="text-xl font-bold text-emerald-400" id="lbl-part-a">-%</div>
              </div>
            </div>
            <div id="map-container-a" class="h-[350px] w-full bg-[#0f172a] rounded-xl border border-slate-700 overflow-hidden relative shadow-inner"></div>
          </div>
          
          <div class="flex flex-col gap-4">
            <div class="bg-slate-900/50 p-4 rounded-xl border border-slate-700 flex justify-between items-center shadow-inner">
              <div>
                <div class="text-slate-400 text-sm uppercase tracking-wide">Desempeño <span id="lbl-year-b">${yearB}</span></div>
                <div class="text-2xl font-bold text-slate-50" id="lbl-fob-b">$-$ M</div>
              </div>
              <div class="text-right">
                <div class="text-slate-400 text-sm uppercase tracking-wide">Participación Total</div>
                <div class="text-xl font-bold text-purple-400" id="lbl-part-b">-%</div>
              </div>
            </div>
            <div id="map-container-b" class="h-[350px] w-full bg-[#0f172a] rounded-xl border border-slate-700 overflow-hidden relative shadow-inner"></div>
          </div>
        </div>
      </section>

      <!-- Main Charts -->
      <section class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        <div class="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm lg:col-span-2">
          <h2 class="text-lg font-semibold text-slate-50 mb-6">Evolución Histórica y Variación Interanual</h2>
          <div id="evo-chart-container" class="h-[400px] w-full"></div>
        </div>
        <div class="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm flex flex-col">
          <h2 class="text-lg font-semibold text-slate-50 mb-6">Peso Relativo del Sector (${latestYear.Año})</h2>
          <div id="pie-chart-container" class="flex-grow w-full h-[300px]"></div>
          <div class="mt-4 text-center">
            <p class="text-sm text-slate-400">
              El litio representa el <span class="font-bold text-slate-50">${(latestYear.Participación_total * 100).toFixed(1)}%</span> sobre el total exportado de su categoría, evidenciando un salto significativo desde el ${(lithiumData[0].Participación_total * 100).toFixed(1)}% en ${lithiumData[0].Año}.
            </p>
          </div>
        </div>
      </section>

      <!-- Insights -->
      <section class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div class="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
          <div class="flex items-center gap-2 mb-4">
            ${getIcon('shield-check', 'text-emerald-500 w-6 h-6')}
            <h3 class="text-lg font-bold text-slate-50">Vectores de Crecimiento</h3>
          </div>
          <ul class="space-y-4" id="list-insights-pos"></ul>
        </div>
        <div class="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
          <div class="flex items-center gap-2 mb-4">
            ${getIcon('alert-triangle', 'text-rose-500 w-6 h-6')}
            <h3 class="text-lg font-bold text-slate-50">Riesgos Estructurales</h3>
          </div>
          <ul class="space-y-4" id="list-insights-risk"></ul>
        </div>
      </section>

      <!-- Table Table -->
      <section class="bg-slate-800 rounded-xl border border-slate-700 shadow-sm overflow-hidden mb-10">
        <div class="p-6 border-b border-slate-700">
          <h2 class="text-lg font-semibold text-slate-50">Tabla de Datos Históricos</h2>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm text-left">
            <thead class="text-xs text-slate-400 uppercase bg-slate-900/50">
              <tr>
                <th class="px-6 py-4 font-medium">Año</th>
                <th class="px-6 py-4 font-medium">Exportaciones FOB (USD M)</th>
                <th class="px-6 py-4 font-medium">Variación Interanual</th>
                <th class="px-6 py-4 font-medium">Participación Total</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-700" id="data-table-body">
              <!-- Rendered via loop -->
            </tbody>
          </table>
        </div>
      </section>
      
      <!-- Footer Conclusion -->
      <footer class="bg-slate-800 border border-slate-700 rounded-xl p-8 text-slate-50">
        <h2 class="text-xl font-bold mb-4">Resumen Ejecutivo</h2>
        <div class="space-y-4 text-slate-300">
          <p>
            El análisis de la serie de tiempo (${lithiumData[0].Año}-${latestYear.Año}) demuestra que el sector litífero en Argentina ha pasado de ser un segmento marginal a un pilar estratégico de las exportaciones mineras. Con un valor pico de <strong>USD ${maxExport.toFixed(0)} M</strong>, la industria refleja la fuerte demanda global de reservas probadas para la transición energética.
          </p>
          <p>
            No obstante, las pronunciadas oscilaciones interanuales advierten sobre la vulnerabilidad ligada a la fijación de precios internacionales. <strong>Implicancia de mercado:</strong> Resulta imperioso fortalecer la cadena de valor agregado local y diversificar destinos para mitigar la fuerte exposición a ciclos contractivos del <em>commoditie</em>, estabilizando así los flujos futuros de divisas.
          </p>
        </div>
      </footer>
    </div>
  `;

  // Draw dynamic parts
  lucide.createIcons();

  initGlobalCharts();
  renderComparisons();
  populateInsights(cagr, maxExport, maxExportYear, yoyGrowthActual);
  populateTable();

  // Attach event handlers
  document.getElementById('yearA').addEventListener('change', (e) => {
    yearA = Number(e.target.value);
    renderComparisons();
  });
  
  document.getElementById('yearB').addEventListener('change', (e) => {
    yearB = Number(e.target.value);
    renderComparisons();
  });
  
  // Resize listener
  window.addEventListener('resize', () => {
    if(evoChart) evoChart.resize();
    if(pieChart) pieChart.resize();
    if(mapA) mapA.resize();
    if(mapB) mapB.resize();
  });
}

function initGlobalCharts() {
  const years = lithiumData.map(d => d.Año);
  const fobValues = lithiumData.map(d => d.Exportaciones_FOB);
  const varValues = lithiumData.map(d => d.Variación_interanual * 100);

  evoChart = echarts.init(document.getElementById('evo-chart-container'));
  evoChart.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross', crossStyle: { color: THEME.slateText } },
      backgroundColor: THEME.slateDark,
      borderColor: THEME.slateLight,
      textStyle: { color: THEME.slateLightText }
    },
    legend: {
      data: ['Valor FOB (M USD)', 'Variación Interanual (%)'],
      textStyle: { color: THEME.slateText },
      bottom: 0
    },
    grid: { left: '3%', right: '3%', bottom: '10%', containLabel: true },
    xAxis: [
      {
        type: 'category',
        data: years,
        axisPointer: { type: 'shadow' },
        axisLabel: { color: THEME.slateText },
        axisLine: { lineStyle: { color: THEME.slateLight } }
      }
    ],
    yAxis: [
      {
        type: 'value',
        name: 'FOB (M)',
        nameTextStyle: { color: THEME.slateText },
        axisLabel: { formatter: '${value}', color: THEME.slateText },
        splitLine: { lineStyle: { color: THEME.slateLight, type: 'dashed' } }
      },
      {
        type: 'value',
        name: 'Var (%)',
        nameTextStyle: { color: THEME.slateText },
        axisLabel: { formatter: '{value}%', color: THEME.slateText },
        splitLine: { show: false }
      }
    ],
    series: [
      {
        name: 'Variación Interanual (%)',
        type: 'bar',
        yAxisIndex: 1,
        itemStyle: { color: '#60a5fa', borderRadius: [4, 4, 0, 0] },
        data: varValues
      },
      {
        name: 'Valor FOB (M USD)',
        type: 'line',
        itemStyle: { color: THEME.blue },
        lineStyle: { width: 3 },
        symbol: 'circle',
        symbolSize: 8,
        data: fobValues
      }
    ]
  });

  const litioValue = latestYear.Exportaciones_FOB;
  const restoValue = (litioValue / latestYear.Participación_total) - litioValue;

  pieChart = echarts.init(document.getElementById('pie-chart-container'));
  pieChart.setOption({
    tooltip: {
      trigger: 'item',
      formatter: '{b}: ${c} M ({d}%)',
      backgroundColor: THEME.slateDark,
      borderColor: THEME.slateLight,
      textStyle: { color: THEME.slateLightText }
    },
    legend: {
      bottom: '5%',
      textStyle: { color: THEME.slateText },
      icon: 'circle'
    },
    series: [
      {
        name: 'Exportaciones Mineras',
        type: 'pie',
        radius: ['50%', '80%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderColor: THEME.slateDark,
          borderWidth: 2
        },
        label: { show: false },
        data: [
          { value: parseFloat(litioValue.toFixed(1)), name: 'Litio', itemStyle: { color: THEME.blue } },
          { value: parseFloat(restoValue.toFixed(1)), name: 'Otras Exp. Mineras', itemStyle: { color: THEME.slateLight } }
        ]
      }
    ]
  });
}

function updateMapInstance(mapInstance, containerId, yearData) {
  if (!mapInstance) {
    mapInstance = echarts.init(document.getElementById(containerId));
  }
  
  const totalValue = yearData.Exportaciones_FOB;
  // Apply standard distribution weights matching user req
  const mapData = [
    { name: 'China', value: totalValue * 0.42 },
    { name: 'Japan', value: totalValue * 0.24 },
    { name: 'Korea', value: totalValue * 0.14 },
    { name: 'United States', value: totalValue * 0.10 },
    { name: 'Germany', value: totalValue * 0.05 },
    { name: 'France', value: totalValue * 0.03 },
    { name: 'Belgium', value: totalValue * 0.02 },
    { name: 'Argentina', value: 0 } // Source
  ];
  const maxVal = Math.max(...mapData.map(d => d.value));

  mapInstance.setOption({
    tooltip: {
      trigger: 'item',
      backgroundColor: THEME.slateDark,
      borderColor: THEME.slateLight,
      textStyle: { color: THEME.slateLightText, fontSize: 12 },
      formatter: p => {
          if(!p.name) return '';
          if(p.name === 'Argentina') return 'Argentina (Origen)';
          return `${p.name}: $${(p.value||0).toFixed(1)} M USD`;
      }
    },
    visualMap: {
      min: 0,
      max: maxVal,
      text: ['Max', '0'],
      realtime: false,
      calculable: true,
      inRange: { color: [THEME.slateDark, THEME.blue] },
      textStyle: { color: THEME.slateText, fontSize: 10 },
      left: '3%',
      bottom: '5%',
      itemHeight: 80,
      itemWidth: 10,
    },
    series: [
      {
        type: 'map',
        map: 'world',
        roam: true,
        scaleLimit: { min: 1, max: 5 },
        label: { show: false },
        itemStyle: {
          borderColor: '#020617', // Very dark slate line
          borderWidth: 0.5,
          areaColor: THEME.slateDark
        },
        emphasis: {
          label: { show: false },
          itemStyle: { areaColor: '#60a5fa' }
        },
        data: mapData.map(item => {
           if(item.name === 'Argentina') {
               return { name: item.name, value: item.value, itemStyle: { areaColor: THEME.emerald } };
           }
           return item;
        })
      }
    ]
  });
  
  return mapInstance;
}

function renderComparisons() {
  const dataYearA = lithiumData.find(d => d.Año === yearA) || latestYear;
  const dataYearB = lithiumData.find(d => d.Año === yearB) || previousYear;

  document.getElementById('lbl-year-a').innerText = dataYearA.Año;
  document.getElementById('lbl-fob-a').innerText = `$${dataYearA.Exportaciones_FOB.toFixed(1)} M`;
  document.getElementById('lbl-part-a').innerText = `${(dataYearA.Participación_total * 100).toFixed(1)}%`;

  document.getElementById('lbl-year-b').innerText = dataYearB.Año;
  document.getElementById('lbl-fob-b').innerText = `$${dataYearB.Exportaciones_FOB.toFixed(1)} M`;
  document.getElementById('lbl-part-b').innerText = `${(dataYearB.Participación_total * 100).toFixed(1)}%`;

  mapA = updateMapInstance(mapA, 'map-container-a', dataYearA);
  mapB = updateMapInstance(mapB, 'map-container-b', dataYearB);
}

function populateInsights(cagr, maxExport, maxExportYear, yoyGrowthActual) {
  const pInsights = [
      `Crecimiento histórico consolidado con una tasa anual compuesta (CAGR) del ${cagr.toFixed(1)}% desde ${lithiumData[0].Año}.`,
      `El sector alcanzó su máximo histórico en ${maxExportYear} con USD ${maxExport.toFixed(2)} Millones.`,
      `Resiliencia del sector: la participación del litio sobre el total aumentó a ${(latestYear.Participación_total * 100).toFixed(1)}% en ${latestYear.Año}.`,
  ];
  
  const rInsights = [
      latestYear.Variación_interanual < 0 
        ? `Desaceleración reciente: contracción del ${Math.abs(yoyGrowthActual).toFixed(1)}% en el último año analizado (${latestYear.Año}).` 
        : `Volatilidad latente: a pesar del crecimiento, existen fluctuaciones interanuales significativas a lo largo del período.`,
    `Concentración de mercado: el sector está supeditado a las fluctuaciones del precio internacional, evidenciando un desacople entre volumen y valor en ciertos años.`,
    `Riesgo de dependencia: con el litio representando gran parte de las exportaciones mineras, shocks externos pueden impactar fuertemente las divisas.`
  ];

  document.getElementById('list-insights-pos').innerHTML = pInsights.map(text => 
      `<li class="flex gap-3"><div class="mt-1 w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0"></div><p class="text-slate-300">${text}</p></li>`
  ).join('');

  document.getElementById('list-insights-risk').innerHTML = rInsights.map(text => 
      `<li class="flex gap-3"><div class="mt-1 w-2 h-2 rounded-full bg-rose-500 flex-shrink-0"></div><p class="text-slate-300">${text}</p></li>`
  ).join('');
}

function populateTable() {
  const tbody = document.getElementById('data-table-body');
  
  // Create reverse copy
  const rows = [...lithiumData].reverse().map(row => {
      const isPos = row.Variación_interanual > 0;
      const isNeg = row.Variación_interanual < 0;
      const tCol = isPos ? 'bg-emerald-500/20 text-emerald-400' : isNeg ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-700 text-slate-300';
      const iconStr = isPos ? getIcon('arrow-up-right', 'w-3 h-3') : isNeg ? getIcon('arrow-down-right', 'w-3 h-3') : '';
      
      return `
      <tr class="hover:bg-slate-700/50 transition-colors">
        <td class="px-6 py-4 font-medium text-slate-50">${row.Año}</td>
        <td class="px-6 py-4 text-slate-300">$${row.Exportaciones_FOB.toFixed(2)}</td>
        <td class="px-6 py-4">
          <span class="px-2.5 py-0.5 rounded-full font-medium text-xs flex items-center w-fit gap-1 ${tCol}">
            ${iconStr}
            ${(row.Variación_interanual * 100).toFixed(1)}%
          </span>
        </td>
        <td class="px-6 py-4 text-slate-300">${(row.Participación_total * 100).toFixed(2)}%</td>
      </tr>`;
  });
  
  tbody.innerHTML = rows.join('');
  lucide.createIcons(); // Reactivate icons drawn dynamically in table
}

// Start sequence
bootstrap();
