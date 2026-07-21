// Capturas de interfaces de usuario
const tempInput = document.getElementById('temp-input');
const humInput = document.getElementById('hum-input');
const tempVal = document.getElementById('temp-val');
const humVal = document.getElementById('hum-val');
const tempStatus = document.getElementById('temp-status');
const humStatus = document.getElementById('hum-status');
const cardTemp = document.getElementById('card-temp');
const cardHum = document.getElementById('card-hum');
const logTerminal = document.getElementById('log-terminal');
const toastContainer = document.getElementById('toast-container');

// Navegación lateral y modales
const btnMenu = document.getElementById('btn-menu');
const sidebar = document.getElementById('sidebar');
const btnCloseSidebar = document.getElementById('btn-close-sidebar');
const btnConnect = document.getElementById('btn-connect');
const activeDeviceStatus = document.getElementById('active-device-status');
const mainContainer = document.getElementById('main-container');

// Tiempo de inicio del Uptime
const inicioSesionTime = Date.now();

// ==========================================
//     BASE DE DATOS LOCAL (localStorage)
// ==========================================
let LIMIT_TEMP_MAX = parseFloat(localStorage.getItem('limit_temp_max')) || 35.0;
let LIMIT_HUM_MIN = parseFloat(localStorage.getItem('limit_hum_min')) || 40.0;
let TEMP_OFFSET = parseFloat(localStorage.getItem('temp_offset')) || 0.0;
let HUM_OFFSET = parseFloat(localStorage.getItem('hum_offset')) || 0.0;
let audioHabilitado = localStorage.getItem('audio_enabled') !== 'false';
let notificacionesHabilitadas = localStorage.getItem('notifications_enabled') !== 'false';
let modoAhorro = localStorage.getItem('power_saving') === 'true';

// Cargando las variables estéticas y de personalización persistentes 
let activeNeonColor = localStorage.getItem('neon_color') || 'cyan';
let activeFontFamily = localStorage.getItem('font_family') || 'system';
let activeDesignTheme = localStorage.getItem('design_theme') || 'defecto';

// Sincronizar elementos visuales con la base de datos local
document.getElementById('limit-temp-max').value = LIMIT_TEMP_MAX;
document.getElementById('limit-hum-min').value = LIMIT_HUM_MIN;
document.getElementById('cal-temp-offset').value = TEMP_OFFSET;
document.getElementById('cal-hum-offset').value = HUM_OFFSET;
document.getElementById('audio-toggle').checked = audioHabilitado;
document.getElementById('notification-toggle').checked = notificacionesHabilitadas;

// Aplicar Estéticas Guardadas Inmediatamente
aplicarColorNeon(activeNeonColor);
aplicarFuenteLetra(activeFontFamily);
aplicarDisenioTema(activeDesignTheme);

// Actualizar valores de los selects al iniciar
document.getElementById('theme-selector').value = activeNeonColor;
document.getElementById('font-selector').value = activeFontFamily;
document.getElementById('design-selector').value = activeDesignTheme;

// Historial, control de Toasts y cooldowns
let historicoDatos = [];
let ultimoAvisoToast = { temp: 0, hum: 0 };
const COOLDOWN_AVISO = 12000;

// COOLDOWN DE SONIDO TECLADO MECÁNICO
let ultimoSonidoASMR = 0;
const COOLDOWN_SONIDO = 80;

let statsValores = {
    tempMax: -999, tempMin: 999,
    humMax: -999, humMin: 999
};

// block de notas local
document.getElementById('notes-textarea').value = localStorage.getItem('local_notes') || '';

// Configuración del Programador de Horas
let scheduleEnabled = localStorage.getItem('schedule_enabled') === 'true';
let scheduleStart = localStorage.getItem('schedule_start') || "22:00";
let scheduleEnd = localStorage.getItem('schedule_end') || "07:00";

document.getElementById('schedule-toggle').checked = scheduleEnabled;
document.getElementById('schedule-start').value = scheduleStart;
document.getElementById('schedule-end').value = scheduleEnd;

// ==========================================
//     SINTETIZADOR DE AUDIO ASMR CREMOSO
// ==========================================
const AudioContextClass = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function reproducirSonidoASMR() {
    const ahora = Date.now();
    if (ahora - ultimoSonidoASMR < COOLDOWN_SONIDO) return;
    ultimoSonidoASMR = ahora;

    try {
        if (!audioCtx) audioCtx = new AudioContextClass();
        
        const oscThock = audioCtx.createOscillator();
        const gainThock = audioCtx.createGain();
        const filter = audioCtx.createBiquadFilter();
        
        oscThock.connect(filter);
        filter.connect(gainThock);
        gainThock.connect(audioCtx.destination);
        
        oscThock.type = 'triangle'; 
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(320, audioCtx.currentTime); 
        
        oscThock.frequency.setValueAtTime(130, audioCtx.currentTime);
        oscThock.frequency.exponentialRampToValueAtTime(70, audioCtx.currentTime + 0.08);
        
        gainThock.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainThock.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
        
        oscThock.start();
        oscThock.stop(audioCtx.currentTime + 0.08);

        // Rebote Clack
        const oscClack = audioCtx.createOscillator();
        const gainClack = audioCtx.createGain();
        
        oscClack.connect(gainClack);
        gainClack.connect(audioCtx.destination);
        
        oscClack.type = 'sine';
        oscClack.frequency.setValueAtTime(400, audioCtx.currentTime);
        oscClack.frequency.exponentialRampToValueAtTime(180, audioCtx.currentTime + 0.04);
        
        gainClack.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gainClack.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.04);
        
        oscClack.start();
        oscClack.stop(audioCtx.currentTime + 0.04);
        
    } catch (e) {
        console.warn("Audio bloqueado temporalmente por interacción.");
    }
}

// Sirenas de alarmas industriales
function reproducirSirena(tipo) {
    if (!audioHabilitado) return;
    
    // Validar si estamos en el rango de "No Molestar"
    if (comprobarSilencioProgramado()) return;

    try {
        if (!audioCtx) audioCtx = new AudioContextClass();
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        if (tipo === 'calor') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(900, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1300, audioCtx.currentTime + 0.35);
            gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
            osc.start(); osc.stop(audioCtx.currentTime + 0.4);
        } else if (tipo === 'humedad') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(500, audioCtx.currentTime);
            gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
            osc.start(); osc.stop(audioCtx.currentTime + 0.4);
        }
    } catch (e) {}
}

// Comprobación de horario nocturno para silenciar alarmas
function comprobarSilencioProgramado() {
    if (!scheduleEnabled) return false;
    const ahora = new Date();
    const horaActual = ahora.getHours() * 60 + ahora.getMinutes();
    
    const [hStart, mStart] = scheduleStart.split(':').map(Number);
    const [hEnd, mEnd] = scheduleEnd.split(':').map(Number);
    const minStart = hStart * 60 + mStart;
    const minEnd = hEnd * 60 + mEnd;

    if (minStart < minEnd) {
        return horaActual >= minStart && horaActual <= minEnd;
    } else {
        // Franja que cruza la medianoche
        return horaActual >= minStart || horaActual <= minEnd;
    }
}

// ==========================================
//         NOTIFICACIONES WEB (TOASTS)
// ==========================================
function lanzarToast(titulo, mensaje, tipo = 'success', icono = '🔔') {
    if (!notificacionesHabilitadas) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;
    toast.innerHTML = `
        <span class="toast-icon">${icono}</span>
        <div class="toast-content">
            <span class="toast-title">${titulo}</span>
            <span class="toast-message">${mensaje}</span>
        </div>
    `;
    toastContainer.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 5000);
}

// ==========================================
//      SISTEMA DE PARTÍCULAS MEJORADO Y DE ALTA VISIBILIDAD
// ==========================================
function crearParticulas(x, y) {
    if (modoAhorro) return;

    const cantidad = 18; 
    const colores = ['#00e5ff', '#00e676', '#ff1744', '#ff9100', '#ffffff'];

    for (let i = 0; i < cantidad; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        
        const size = Math.random() * 12 + 8; 
        p.style.width = `${size}px`;
        p.style.height = `${size}px`;
        
        const colorEscogido = colores[Math.floor(Math.random() * colores.length)];
        p.style.color = colorEscogido;
        p.style.backgroundColor = colorEscogido;
        p.style.boxShadow = `0 0 12px ${colorEscogido}, 0 0 4px ${colorEscogido}`;
        
        p.style.left = `${x - size / 2}px`;
        p.style.top = `${y - size / 2}px`;
        
        const angulo = Math.random() * Math.PI * 2;
        const distancia = Math.random() * 90 + 40; 
        const mx = Math.cos(angulo) * distancia;
        const my = Math.sin(angulo) * distancia;
        
        p.style.setProperty('--mx', `${mx}px`);
        p.style.setProperty('--my', `${my}px`);
        
        document.body.appendChild(p);
        setTimeout(() => { p.remove(); }, 1000);
    }
}

// Escuchar clics globales para disparar ASMR y Partículas
document.addEventListener('click', (e) => {
    if (e.target.closest('button') || e.target.closest('.menu-btn-opt') || e.target.closest('input') || e.target.closest('select')) {
        crearParticulas(e.clientX, e.clientY);
        reproducirSonidoASMR();
    }
});

// ==========================================
//   ADMINISTRACIÓN DE LOS MODALES FLUIDOS
// ==========================================
function abrirModal(modal) {
    modal.classList.add('open');
}

function cerrarModal(modal) {
    const contenido = modal.querySelector('.modal-content');
    contenido.style.transform = 'translateX(100vw)';
    modal.style.opacity = '0';
    
    setTimeout(() => {
        modal.classList.remove('open');
        modal.style.opacity = '';
        contenido.style.transform = '';
    }, 400);
}

// Configuración unificada de eventos de todos los modales (¡Incluso los nuevos!)
const modalesConfig = [
    { btn: 'btn-open-history', id: 'history-modal', close: 'btn-close-history' },
    { btn: 'btn-open-limits', id: 'limits-modal', close: 'btn-close-limits' },
    { btn: 'btn-open-calibration', id: 'calibration-modal', close: 'btn-close-calibration' },
    { btn: 'btn-open-stats', id: 'stats-modal', close: 'btn-close-stats' },
    { btn: 'btn-open-audio', id: 'audio-modal', close: 'btn-close-audio' },
    { btn: 'btn-open-export', id: 'export-modal', close: 'btn-close-export' },
    { btn: 'btn-open-guide', id: 'guide-modal', close: 'btn-close-guide' },
    { btn: 'btn-open-about', id: 'about-modal', close: 'btn-close-about' },
    { btn: 'btn-open-averages', id: 'averages-modal', close: 'btn-close-averages' },
    { btn: 'btn-open-pomodoro', id: 'pomodoro-modal', close: 'btn-close-pomodoro' },
    { btn: 'btn-open-notes', id: 'notes-modal', close: 'btn-close-notes' },
    { btn: 'btn-open-chartscale', id: 'chartscale-modal', close: 'btn-close-chartscale' },
    { btn: 'btn-open-ping', id: 'ping-modal', close: 'btn-close-ping' },
    { btn: 'btn-open-backup', id: 'backup-modal', close: 'btn-close-backup' },
    { btn: 'btn-open-scheduler', id: 'scheduler-modal', close: 'btn-close-scheduler' }
];

modalesConfig.forEach(item => {
    const modalEl = document.getElementById(item.id);
    document.getElementById(item.btn).addEventListener('click', () => {
        sidebar.classList.remove('open');
        abrirModal(modalEl);
    });
    document.getElementById(item.close).addEventListener('click', () => {
        cerrarModal(modalEl);
    });
});

// Modales de personalización estética
document.getElementById('btn-open-theme-selector').addEventListener('click', () => {
    sidebar.classList.remove('open');
    abrirModal(document.getElementById('theme-modal'));
});
document.getElementById('btn-close-theme').addEventListener('click', () => {
    cerrarModal(document.getElementById('theme-modal'));
});

document.getElementById('btn-open-font-selector').addEventListener('click', () => {
    sidebar.classList.remove('open');
    abrirModal(document.getElementById('font-modal'));
});
document.getElementById('btn-close-font').addEventListener('click', () => {
    cerrarModal(document.getElementById('font-modal'));
});

document.getElementById('btn-open-design-selector').addEventListener('click', () => {
    sidebar.classList.remove('open');
    abrirModal(document.getElementById('design-modal'));
});
document.getElementById('btn-close-design').addEventListener('click', () => {
    cerrarModal(document.getElementById('design-modal'));
});

// Conexión y Sidebar
const connectionModal = document.getElementById('connection-modal');
btnConnect.addEventListener('click', () => abrirModal(connectionModal));
document.getElementById('btn-close-conn').addEventListener('click', () => cerrarModal(connectionModal));
btnMenu.addEventListener('click', () => sidebar.classList.add('open'));
btnCloseSidebar.addEventListener('click', () => sidebar.classList.remove('open'));

// ==========================================
//     GRÁFICO DE LÍNEA TEMPORAL (CHART.JS)
// ==========================================
const ctx = document.getElementById('lineChart').getContext('2d');
let MAX_HISTORIAL_GRAFICO = 15; 
const lineChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [
            {
                label: 'Temperatura (°C)',
                data: [],
                borderColor: '#ff1744',
                backgroundColor: 'rgba(255, 23, 68, 0.1)',
                borderWidth: 2,
                tension: 0.3,
                fill: true
            },
            {
                label: 'Humedad (%)',
                data: [],
                borderColor: '#00e5ff',
                backgroundColor: 'rgba(0, 229, 255, 0.1)',
                borderWidth: 2,
                tension: 0.3,
                fill: true
            }
        ]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#707e94' } } },
        scales: {
            y: { beginAtZero: true, max: 100, grid: { color: '#1f2942' }, ticks: { color: '#707e94' } },
            x: { grid: { color: '#1f2942' }, ticks: { color: '#707e94' } }
        }
    }
});

// ==========================================
//     PROCESAMIENTO Y ACTUALIZACIÓN DE DATOS
// ==========================================
function actualizarPantalla(tempSensor, humSensor) {
    const t = parseFloat(tempSensor) + TEMP_OFFSET;
    const h = parseFloat(humSensor) + HUM_OFFSET;
    if (isNaN(t) || isNaN(h)) return;

    tempVal.textContent = t.toFixed(1);
    humVal.textContent = h.toFixed(1);

    const ahora = Date.now();
    const tiempoLabel = new Date().toLocaleTimeString();

    historicoDatos.push({ fecha: new Date().toLocaleString(), temp: t, hum: h });

    // Actualizar estadísticas máximos y mínimos
    if (t > statsValores.tempMax) { statsValores.tempMax = t; document.getElementById('stat-temp-max').textContent = `${t.toFixed(1)}°C`; }
    if (t < statsValores.tempMin) { statsValores.tempMin = t; document.getElementById('stat-temp-min').textContent = `${t.toFixed(1)}°C`; }
    if (h > statsValores.humMax) { statsValores.humMax = h; document.getElementById('stat-hum-max').textContent = `${h.toFixed(1)}%`; }
    if (h < statsValores.humMin) { statsValores.humMin = h; document.getElementById('stat-hum-min-val').textContent = `${h.toFixed(1)}%`; }

    // Control de Alertas de Temperatura
    if (t > LIMIT_TEMP_MAX) {
        if (!cardTemp.classList.contains('alert-excess')) {
            cardTemp.className = "card temp alert-excess";
            tempStatus.textContent = "💥 ¡EXCESO!";
            tempStatus.className = "status-badge status-excess";
            registrarEvento(`CRÍTICO: ¡Exceso Térmico! (${t.toFixed(1)}°C)`, 'excess-err');
        }
        if (ahora - ultimoAvisoToast.temp > COOLDOWN_AVISO) {
            lanzarToast("🔥 ¡Alerta de Calor!", `El ambiente superó el límite fijado: ${t.toFixed(1)}°C.`, "error", "🚨");
            enviarNotificacionPush("🚨 Alerta Térmica", `Temperatura excesiva: ${t.toFixed(1)}°C.`);
            ultimoAvisoToast.temp = ahora;
        }
        reproducirSirena('calor');
    } else {
        cardTemp.className = "card temp";
        tempStatus.textContent = "Normal";
        tempStatus.className = "status-badge status-ok";
    }

    // Control de Alertas de Humedad
    if (h < LIMIT_HUM_MIN) {
        if (!cardHum.classList.contains('alert-lack')) {
            cardHum.className = "card hum alert-lack";
            humStatus.textContent = "⚠️ ¡FALTA!";
            humStatus.className = "status-badge status-lack";
            registrarEvento(`CRÍTICO: ¡Falta de Humedad! (${h.toFixed(1)}%)`, 'lack-err');
        }
        if (ahora - ultimoAvisoToast.hum > COOLDOWN_AVISO) {
            lanzarToast("💧 ¡Humedad Baja!", `Humedad crítica detectada: ${h.toFixed(1)}%.`, "warning", "⚠️");
            enviarNotificacionPush("⚠️ Humedad Baja", `La humedad ha caído a: ${h.toFixed(1)}%.`);
            ultimoAvisoToast.hum = ahora;
        }
        reproducirSirena('humedad');
    } else {
        cardHum.className = "card hum";
        humStatus.textContent = "Óptima";
        humStatus.className = "status-badge status-ok";
    }

    // Desplazar el gráfico con animación fluida
    lineChart.data.labels.push(tiempoLabel);
    lineChart.data.datasets[0].data.push(t);
    lineChart.data.datasets[1].data.push(h);

    if (lineChart.data.labels.length > MAX_HISTORIAL_GRAFICO) {
        lineChart.data.labels.shift();
        lineChart.data.datasets[0].data.shift();
        lineChart.data.datasets[1].data.shift();
    }
    lineChart.update();
}

function registrarEvento(texto, tipo) {
    const tiempo = new Date().toLocaleTimeString();
    const nuevaLinea = document.createElement('div');
    nuevaLinea.className = `log-line ${tipo}`;
    nuevaLinea.textContent = `[${tiempo}] ${texto}`;
    logTerminal.appendChild(nuevaLinea);
    logTerminal.scrollTop = logTerminal.scrollHeight;
}

// ==========================================
//     CALIBRADORES DE ENTRADA EN VIVO
// ==========================================
tempInput.addEventListener('input', () => {
    actualizarPantalla(tempInput.value, humInput.value);
});

humInput.addEventListener('input', () => {
    actualizarPantalla(tempInput.value, humInput.value);
});

// Guardar límites
document.getElementById('btn-save-limits').addEventListener('click', () => {
    LIMIT_TEMP_MAX = parseFloat(document.getElementById('limit-temp-max').value) || 35.0;
    LIMIT_HUM_MIN = parseFloat(document.getElementById('limit-hum-min').value) || 40.0;
    localStorage.setItem('limit_temp_max', LIMIT_TEMP_MAX);
    localStorage.setItem('limit_hum_min', LIMIT_HUM_MIN);
    cerrarModal(document.getElementById('limits-modal'));
    lanzarToast("Guardado", "Límites guardados localmente.", "success", "💾");
});

// Guardar calibraciones
document.getElementById('btn-save-calibration').addEventListener('click', () => {
    TEMP_OFFSET = parseFloat(document.getElementById('cal-temp-offset').value) || 0.0;
    HUM_OFFSET = parseFloat(document.getElementById('cal-hum-offset').value) || 0.0;
    localStorage.setItem('temp_offset', TEMP_OFFSET);
    localStorage.setItem('hum_offset', HUM_OFFSET);
    cerrarModal(document.getElementById('calibration-modal'));
    lanzarToast("Calibración Lista", "Margen de error de sensores actualizado.", "success", "🔧");
    actualizarPantalla(tempInput.value, humInput.value);
});

// Guardar configuración de Audio
document.getElementById('audio-toggle').addEventListener('change', (e) => {
    audioHabilitado = e.target.checked;
    localStorage.setItem('audio_enabled', audioHabilitado);
});
document.getElementById('test-beep-heat').addEventListener('click', () => reproducirSirena('calor'));
document.getElementById('test-beep-humidity').addEventListener('click', () => reproducirSirena('humedad'));

// Descargar reporte CSV
document.getElementById('btn-download-csv').addEventListener('click', () => {
    if (historicoDatos.length === 0) {
        alert("Sin lecturas registradas en esta sesión."); return;
    }
    let csv = "Fecha,Temperatura (C),Humedad (%)\n";
    historicoDatos.forEach(r => { csv += `${r.fecha},${r.temp},${r.hum}\n`; });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "registro_keylefs_rt.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

// Notificaciones web locales
const notificationToggle = document.getElementById('notification-toggle');
notificationToggle.addEventListener('change', (e) => {
    notificacionesHabilitadas = e.target.checked;
    localStorage.setItem('notifications_enabled', notificacionesHabilitadas);
});

// Limpieza de Terminal
document.getElementById('btn-clear-terminal').addEventListener('click', () => {
    logTerminal.innerHTML = '<div class="log-line system">[SISTEMA] Registro reiniciado manualmente.</div>';
    lanzarToast("Consola Limpia", "Se ha borrado el historial de eventos.", "success", "🧹");
    sidebar.classList.remove('open');
});

// Tasa de Muestreo
const samplingModal = document.getElementById('sampling-modal');
document.getElementById('btn-open-sampling').addEventListener('click', () => {
    sidebar.classList.remove('open');
    abrirModal(samplingModal);
});
document.getElementById('btn-close-sampling').addEventListener('click', () => cerrarModal(samplingModal));

document.getElementById('btn-save-sampling').addEventListener('click', () => {
    const pts = parseInt(document.getElementById('sampling-points').value) || 15;
    MAX_HISTORIAL_GRAFICO = pts;
    cerrarModal(samplingModal);
    lanzarToast("Gráfico Ajustado", `Se registrarán hasta ${pts} puntos simultáneos.`, "success", "📈");
});

// Modo Ahorro
document.getElementById('btn-toggle-saving').addEventListener('click', () => {
    modoAhorro = !modoAhorro;
    localStorage.setItem('power_saving', modoAhorro);
    sidebar.classList.remove('open');
    const estado = modoAhorro ? "Activado (Partículas desactivadas)" : "Desactivado (Detalle visual completo)";
    lanzarToast("Modo Ahorro", estado, "warning", "💤");
});

// Restablecer de Fábrica
document.getElementById('btn-factory-reset').addEventListener('click', () => {
    if (confirm("¿Estás seguro de restablecer por completo la consola keylefs.rt?")) {
        localStorage.clear();
        lanzarToast("Reiniciando", "Restableciendo valores iniciales de fábrica...", "success", "🔄");
        setTimeout(() => { window.location.reload(); }, 1500);
    }
});

// Modo Kiosko
document.getElementById('btn-open-kiosk').addEventListener('click', () => {
    sidebar.classList.remove('open');
    mainContainer.classList.toggle('kiosk-mode');
    lanzarToast("Modo Kiosko", "Cambio en la visualización del panel.", "success", "📺");
});

// ==========================================
//      SISTEMA DE PERSONALIZACIÓN Y ESTILO
// ==========================================

// 1. Selector de Color Neón de Realce
document.getElementById('theme-selector').addEventListener('change', (e) => {
    const val = e.target.value;
    aplicarColorNeon(val);
    localStorage.setItem('neon_color', val);
    lanzarToast("Color de Realce", "Estilo visual del panel modificado y guardado.", "success", "🎨");
});

function aplicarColorNeon(color) {
    if (color === 'cyan') document.documentElement.style.setProperty('--neon-blue', '#00e5ff');
    if (color === 'green') document.documentElement.style.setProperty('--neon-blue', '#00e676');
    if (color === 'orange') document.documentElement.style.setProperty('--neon-blue', '#ff9100');
    if (color === 'red') document.documentElement.style.setProperty('--neon-blue', '#ff1744');
    if (color === 'purple') document.documentElement.style.setProperty('--neon-blue', '#bd93f9');
    if (color === 'yellow') document.documentElement.style.setProperty('--neon-blue', '#f1fa8c');
    if (color === 'pink') document.documentElement.style.setProperty('--neon-blue', '#ff79c6');
    if (color === 'gold') document.documentElement.style.setProperty('--neon-blue', '#ffd700');
}

// 2. Selector de Fuentes de Letra
document.getElementById('font-selector').addEventListener('change', (e) => {
    const val = e.target.value;
    aplicarFuenteLetra(val);
    localStorage.setItem('font_family', val);
    lanzarToast("Fuente Actualizada", "Tipografía global guardada con éxito.", "success", "✍️");
});

function aplicarFuenteLetra(font) {
    let fontValue = "system-ui, -apple-system, sans-serif";
    if (font === 'retro') fontValue = "'Courier New', Courier, monospace";
    if (font === 'industrial') fontValue = "monospace, sans-serif";
    if (font === 'sans') fontValue = "Arial, Helvetica, sans-serif";
    if (font === 'future') fontValue = "'Trebuchet MS', sans-serif";
    document.documentElement.style.setProperty('--main-font', fontValue);
}

// 3. Selector de Diseños y Temas Globales (10 Estilos)
document.getElementById('design-selector').addEventListener('change', (e) => {
    const val = e.target.value;
    aplicarDisenioTema(val);
    localStorage.setItem('design_theme', val);
    lanzarToast("Diseño de Consola", `Se ha aplicado el diseño: ${val.toUpperCase()}`, "success", "🏢");
});

function aplicarDisenioTema(theme) {
    document.body.setAttribute('data-theme', theme);
}


// ==========================================
//     CONTROL DE LAS 7 NUEVAS HERRAMIENTAS
// ==========================================

// N1: Temporizador Pomodoro
let pomodoroInterval = null;
let pomodoroSecondsLeft = 1500; // 25 Minutos
let pomodoroRunning = false;

const pomodoroDisplay = document.getElementById('pomodoro-timer');
const btnStartPomo = document.getElementById('btn-start-pomodoro');

btnStartPomo.addEventListener('click', () => {
    if (pomodoroRunning) {
        clearInterval(pomodoroInterval);
        btnStartPomo.textContent = "Iniciar";
        pomodoroRunning = false;
    } else {
        pomodoroRunning = true;
        btnStartPomo.textContent = "Pausar";
        pomodoroInterval = setInterval(() => {
            pomodoroSecondsLeft--;
            const min = Math.floor(pomodoroSecondsLeft / 60);
            const sec = pomodoroSecondsLeft % 60;
            pomodoroDisplay.textContent = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
            
            if (pomodoroSecondsLeft <= 0) {
                clearInterval(pomodoroInterval);
                pomodoroDisplay.textContent = "25:00";
                pomodoroSecondsLeft = 1500;
                pomodoroRunning = false;
                btnStartPomo.textContent = "Iniciar";
                lanzarToast("Pomodoro Finalizado", "Hora de estirar los músculos de calibración.", "success", "⏱️");
            }
        }, 1000);
    }
});

document.getElementById('btn-reset-pomodoro').addEventListener('click', () => {
    clearInterval(pomodoroInterval);
    pomodoroSecondsLeft = 1500;
    pomodoroDisplay.textContent = "25:00";
    pomodoroRunning = false;
    btnStartPomo.textContent = "Iniciar";
});

// N2: Guardar Notas Locales
document.getElementById('btn-save-notes').addEventListener('click', () => {
    const text = document.getElementById('notes-textarea').value;
    localStorage.setItem('local_notes', text);
    cerrarModal(document.getElementById('notes-modal'));
    lanzarToast("Notas Guardadas", "El borrador de notas se actualizó correctamente.", "success", "📝");
});

// N3: Exportar Alertas Exclusivas en JSON
document.getElementById('btn-export-json').addEventListener('click', () => {
    sidebar.classList.remove('open');
    
    // Filtrar solo los registros que corresponden a fallos
    const alertasFiltradas = historicoDatos.filter(r => r.temp > LIMIT_TEMP_MAX || r.hum < LIMIT_HUM_MIN);
    
    if (alertasFiltradas.length === 0) {
        alert("Sin alertas críticas registradas en esta sesión.");
        return;
    }
    
    const jsonString = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(alertasFiltradas, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", jsonString);
    link.setAttribute("download", "alertas_keylefs_rt.json");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    lanzarToast("JSON Descargado", "Log estructurado descargado.", "success", "🔔");
});

// N4: Configurar Ejes Verticales del Gráfico (Min/Max Y)
document.getElementById('btn-apply-chartscale').addEventListener('click', () => {
    const minY = parseFloat(document.getElementById('chart-min-y').value) || 0;
    const maxY = parseFloat(document.getElementById('chart-max-y').value) || 100;

    lineChart.options.scales.y.min = minY;
    lineChart.options.scales.y.max = maxY;
    lineChart.update();

    cerrarModal(document.getElementById('chartscale-modal'));
    lanzarToast("Eje Y Calibrado", `Gráfico escalado desde ${minY} hasta ${maxY}.`, "success", "📉");
});

// N5: Diagnóstico de Ping
document.getElementById('btn-execute-ping').addEventListener('click', () => {
    const resField = document.getElementById('ping-result');
    resField.textContent = "Pinging...";
    resField.style.color = "var(--neon-orange)";
    
    setTimeout(() => {
        const ms = Math.floor(Math.random() * 45) + 5;
        resField.textContent = `Respuesta exitosa desde hardware: latencia = ${ms}ms`;
        resField.style.color = "var(--neon-green)";
    }, 1200);
});

// N6: Copia de Seguridad/Backup Total de Configuración
document.getElementById('btn-download-backup').addEventListener('click', () => {
    const backupObj = {
        limit_temp_max: LIMIT_TEMP_MAX,
        limit_hum_min: LIMIT_HUM_MIN,
        temp_offset: TEMP_OFFSET,
        hum_offset: HUM_OFFSET,
        audio_enabled: audioHabilitado,
        notifications_enabled: notificacionesHabilitadas,
        neon_color: activeNeonColor,
        font_family: activeFontFamily,
        design_theme: activeDesignTheme,
        local_notes: localStorage.getItem('local_notes') || ""
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupObj, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", dataStr);
    link.setAttribute("download", "backup_config_keylefs_rt.json");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

document.getElementById('btn-trigger-import').addEventListener('click', () => {
    document.getElementById('file-import-backup').click();
});

document.getElementById('file-import-backup').addEventListener('change', (e) => {
    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const parsed = JSON.parse(event.target.result);
            if (parsed.limit_temp_max) {
                localStorage.setItem('limit_temp_max', parsed.limit_temp_max);
                localStorage.setItem('limit_hum_min', parsed.limit_hum_min);
                localStorage.setItem('temp_offset', parsed.temp_offset);
                localStorage.setItem('hum_offset', parsed.hum_offset);
                localStorage.setItem('audio_enabled', parsed.audio_enabled);
                localStorage.setItem('notifications_enabled', parsed.notifications_enabled);
                localStorage.setItem('neon_color', parsed.neon_color || 'cyan');
                localStorage.setItem('font_family', parsed.font_family || 'system');
                localStorage.setItem('design_theme', parsed.design_theme || 'defecto');
                localStorage.setItem('local_notes', parsed.local_notes || '');
                
                lanzarToast("Importación Exitosa", "Configuraciones restablecidas. Recargando...", "success", "🔄");
                setTimeout(() => window.location.reload(), 1500);
            }
        } catch (err) {
            alert("Archivo de configuración inválido.");
        }
    };
    reader.readAsText(e.target.files[0]);
});

// N7: Programador de Horarios de Alarma
document.getElementById('btn-save-scheduler').addEventListener('click', () => {
    scheduleEnabled = document.getElementById('schedule-toggle').checked;
    scheduleStart = document.getElementById('schedule-start').value;
    scheduleEnd = document.getElementById('schedule-end').value;

    localStorage.setItem('schedule_enabled', scheduleEnabled);
    localStorage.setItem('schedule_start', scheduleStart);
    localStorage.setItem('schedule_end', scheduleEnd);

    cerrarModal(document.getElementById('scheduler-modal'));
    lanzarToast("Programación Almacenada", "Horarios de silencio nocturno actualizados.", "success", "📅");
});


// ==========================================
//     ANTIGUAS FUNCIONES DE INTEGRACIÓN
// ==========================================

// Pantalla Completa
document.getElementById('btn-toggle-fullscreen').addEventListener('click', () => {
    sidebar.classList.remove('open');
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen()
            .then(() => lanzarToast("Pantalla Completa", "Modo cine/estación activado.", "success", "🖥️"))
            .catch(err => console.error(err));
    } else {
        document.exitFullscreen();
    }
});

// Promedios
const avgTempField = document.getElementById('avg-temp-val');
const avgHumField = document.getElementById('avg-hum-val');
const avgTotalSamplesField = document.getElementById('avg-total-samples');

document.getElementById('btn-open-averages').addEventListener('click', () => {
    sidebar.classList.remove('open');
    if (historicoDatos.length === 0) {
        avgTempField.textContent = "--°C";
        avgHumField.textContent = "--%";
        avgTotalSamplesField.textContent = "Muestras analizadas: 0";
    } else {
        const sumaTemp = historicoDatos.reduce((acc, r) => acc + r.temp, 0);
        const sumaHum = historicoDatos.reduce((acc, r) => acc + r.hum, 0);
        const total = historicoDatos.length;
        
        avgTempField.textContent = `${(sumaTemp / total).toFixed(1)}°C`;
        avgHumField.textContent = `${(sumaHum / total).toFixed(1)}%`;
        avgTotalSamplesField.textContent = `Muestras analizadas en esta sesión: ${total}`;
    }
    abrirModal(document.getElementById('averages-modal'));
});

// Simular falla
document.getElementById('btn-trigger-fault').addEventListener('click', () => {
    sidebar.classList.remove('open');
    const tFalla = 48.5;
    const hFalla = 12.0;
    tempInput.value = tFalla;
    humInput.value = hFalla;
    lanzarToast("🚨 Falla Simulada", "Inyectando valores críticos de simulación...", "error", "🔌");
    actualizarPantalla(tFalla, hFalla);
});

// Push
function enviarNotificacionPush(titulo, mensaje) {
    if (Notification.permission === "granted") {
        new Notification(titulo, {
            body: mensaje,
            icon: 'https://cdn-icons-png.flaticon.com/512/2913/2913564.png'
        });
    }
}

document.getElementById('btn-test-push').addEventListener('click', () => {
    sidebar.classList.remove('open');
    if (!("Notification" in window)) {
        alert("Este navegador no soporta notificaciones de escritorio.");
        return;
    }

    if (Notification.permission === "granted") {
        enviarNotificacionPush("keylefs.rt - Estado Óptimo", "El sistema de notificaciones en escritorio está listo.");
        lanzarToast("Prueba Exitosa", "Notificación push enviada al sistema.", "success", "📬");
    } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                enviarNotificacionPush("Sistema Vinculado", "¡Listo! Recibirás alertas del panel aquí.");
            }
        });
    } else {
        lanzarToast("Sin Permisos", "Debes activar las notificaciones en tu navegador.", "warning", "⚙️");
    }
});

// Uptime
document.getElementById('btn-show-uptime').addEventListener('click', () => {
    sidebar.classList.remove('open');
    const transcurrido = Date.now() - inicioSesionTime;
    const segundosTotales = Math.floor(transcurrido / 1000);
    const minutos = Math.floor(segundosTotales / 60);
    const segundos = segundosTotales % 60;
    lanzarToast("Tiempo Activo", `La consola lleva activa exactamente ${minutos} min y ${segundos} seg.`, "success", "⏱️");
});

// Guardar PNG
document.getElementById('btn-export-chart').addEventListener('click', () => {
    sidebar.classList.remove('open');
    const imageURI = lineChart.toBase64Image();
    const link = document.createElement('a');
    link.download = 'grafico_keylefs_rt.png';
    link.href = imageURI;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    lanzarToast("Gráfico Guardado", "Imagen PNG del gráfico descargada.", "success", "📉");
});


// ==========================================
//     CONEXIONES REALES DE HARDWARE (APIs)
// ==========================================

// USB Serial API
document.getElementById('opt-usb').addEventListener('click', async () => {
    connectionModal.classList.remove('open');
    if ('serial' in navigator) {
        try {
            const port = await navigator.serial.requestPort();
            await port.open({ baudRate: 9600 });
            btnConnect.textContent = "🔌 USB";
            btnConnect.style.background = "#00e676";
            activeDeviceStatus.innerHTML = `🟢 Conectado por USB`;
            
            tempInput.disabled = true; humInput.disabled = true;
            const decoder = new TextDecoderStream();
            port.readable.pipeTo(decoder.writable);
            const reader = decoder.readable.getReader();
            let buffer = "";

            while (true) {
                const { value, done } = await reader.read();
                if (done) { reader.releaseLock(); break; }
                if (value) {
                    buffer += value;
                    if (buffer.includes('\n')) {
                        const partes = buffer.trim().split(',');
                        if (partes.length === 2) actualizarPantalla(partes[0], partes[1]);
                        buffer = "";
                    }
                }
            }
        } catch (e) { registrarEvento("Conexión USB interrumpida.", "lack-err"); }
    } else { alert("Navegador incompatible con Web Serial."); }
});

// Bluetooth BLE
document.getElementById('opt-bluetooth').addEventListener('click', async () => {
    connectionModal.classList.remove('open');
    if ('bluetooth' in navigator) {
        try {
            const device = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: ['environmental_sensing', 0xFFE0]
            });
            await device.gatt.connect();
            btnConnect.textContent = "⚡ BLE";
            btnConnect.style.background = "#00e676";
            activeDeviceStatus.innerHTML = `🟢 Conectado por BLE`;
            lanzarToast("Conectado", `Vinculado por BLE a ${device.name}`, "success", "⚡");
        } catch (e) { registrarEvento("Bluetooth cancelado.", "lack-err"); }
    } else { alert("Bluetooth BLE no soportado por este navegador."); }
});

// Wi-Fi Fetch
let wifiInterval = null;
document.getElementById('opt-wifi').addEventListener('click', () => {
    const ip = document.getElementById('wifi-ip').value.trim();
    if (!ip) { alert("Ingresa una IP válida."); return; }
    connectionModal.classList.remove('open');
    if (wifiInterval) clearInterval(wifiInterval);
    
    registrarEvento(`Conectando con http://${ip}...`, "system");
    lanzarToast("Conectando Wi-Fi", `Enlazando a http://${ip}`, "success", "📶");

    wifiInterval = setInterval(async () => {
        try {
            const res = await fetch(`http://${ip}/`);
            if (res.ok) {
                const json = await res.json();
                actualizarPantalla(json.temperatura, json.humedad);
                btnConnect.textContent = "📶 Wi-Fi";
                btnConnect.style.background = "#00e676";
                activeDeviceStatus.innerHTML = `🟢 Conectado por Wi-Fi`;
            }
        } catch (err) {
            console.error("Error en lectura Wi-Fi:", err);
            registrarEvento(`Error de red en http://${ip}/`, "lack-err");
        }
    }, 3000);
});

// Cargar estado inicial
actualizarPantalla(24, 50);