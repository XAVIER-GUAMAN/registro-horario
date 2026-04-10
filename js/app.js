import { supabaseClient } from './supabase.js';
import {
    createTableRow,
    createTimeCard,
    updateStatistics,
    showLoadingScreen,
    hideLoadingScreen,
    markSaved,
    showConfirmModal,
    showNotification,
    applyTimeTemplate
} from './components.js';

const DIAS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

// Initialize app on DOM load
document.addEventListener('DOMContentLoaded', initializeApp);

async function initializeApp() {
    try {
        showLoadingScreen('Cargando aplicación...');

        // Initialize month selector with current month
        const currentDate = new Date();
        const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
        document.getElementById("mes").value = currentMonth;

        // Set up event listeners
        document.getElementById("mes").addEventListener("change", generarMes);

        // Initialize welcome message (will be updated by auth system)
        updateWelcomeMessage();

        // Generate current month data
        await generarMes();

        hideLoadingScreen();
    } catch (error) {
        hideLoadingScreen();
        showNotification('Error al cargar la aplicación. Por favor, recarga la página.', 'error');
        console.error('App initialization error:', error);
    }
}

async function generarMes() {
    const mes = document.getElementById("mes").value;
    if (!mes) return;

    try {
        showLoadingScreen('Generando calendario...');

        const [year, month] = mes.split("-");
        const dias = new Date(year, month, 0).getDate();

        const tbody = document.querySelector("#tabla tbody");
        const timeCards = document.getElementById("timeCards");

        // Clear existing content
        tbody.innerHTML = "";
        timeCards.innerHTML = "";

        for (let i = 1; i <= dias; i++) {
            const fecha = new Date(year, month - 1, i);
            const diaSemana = fecha.getDay();

            // Skip weekends
            if (diaSemana === 0 || diaSemana === 6) continue;

            const dayData = {
                date: fecha.toISOString().split("T")[0],
                dayOfWeek: DIAS[diaSemana],
                entrada: '',
                pausa: '',
                reanuda: '',
                salida: '',
                hours: '0.00'
            };

            // Create both table row and mobile card
            const tableRow = createTableRow(dayData);
            const timeCard = createTimeCard(dayData);

            tbody.appendChild(tableRow);
            timeCards.appendChild(timeCard);
        }

        await cargarDesdeSupabase();
        updateStatistics();
        hideLoadingScreen();

    } catch (error) {
        hideLoadingScreen();
        showNotification('Error al generar el calendario', 'error');
        console.error('Error generating month:', error);
    }
}

function updateWelcomeMessage(userName = 'Usuario') {
    const welcomeElement = document.getElementById('userWelcome');
    if (welcomeElement) {
        welcomeElement.textContent = `Bienvenido, ${userName}`;
    }
}

// Global functions for button clicks
window.aplicarATodos = function() {
    showConfirmModal(
        '¿Aplicar horario estándar (9:00-14:00, 15:00-18:00) a todos los días del mes?',
        () => {
            applyTimeTemplate('09:00', '14:00', '15:00', '18:00');
            showNotification('Horario estándar aplicado correctamente', 'success');
        }
    );
}

window.logout = async function() {
    showConfirmModal(
        '¿Estás seguro que deseas cerrar sesión?',
        () => {
            showLoadingScreen('Cerrando sesión...');
            // Redirect to login page
            window.location.href = 'login.html';
        }
    );
}

// ================= GUARDAR =================
window.guardarEnSupabase = async function() {
    try {
        showLoadingScreen('Guardando datos...');

        const filas = document.querySelectorAll("#tabla tbody tr");
        const datos = [];

        filas.forEach(tr => {
            const c = tr.children;
            const fecha = c[0].innerText;
            const entrada = c[2].querySelector("input").value;
            const pausa = c[3].querySelector("input").value;
            const reanudacion = c[4].querySelector("input").value;
            const salida = c[5].querySelector("input").value;
            const horas = parseFloat(c[6].innerText) || 0;

            // Only save if there's at least entry and exit time
            if (entrada && salida) {
                datos.push({
                    fecha,
                    entrada,
                    pausa,
                    reanudacion,
                    salida,
                    horas
                });
            }
        });

        if (datos.length === 0) {
            hideLoadingScreen();
            showNotification('No hay datos para guardar', 'warning');
            return;
        }

        const { error } = await supabaseClient
            .from('fichajes')
            .upsert(datos, { onConflict: ['fecha'] });

        hideLoadingScreen();

        if (error) {
            showNotification(`Error al guardar: ${error.message}`, 'error');
            console.error('Save error:', error);
        } else {
            markSaved();
            showNotification('💾 Datos guardados correctamente', 'success');
        }

    } catch (error) {
        hideLoadingScreen();
        showNotification('Error inesperado al guardar los datos', 'error');
        console.error('Unexpected save error:', error);
    }
}

// ================= EXPORT =================
window.exportarExcel = function() {
    try {
        const filas = document.querySelectorAll("#tabla tbody tr");

        if (filas.length === 0) {
            showNotification('No hay datos para exportar', 'warning');
            return;
        }

        showLoadingScreen('Preparando exportación...');

        const data = [["Fecha","Día","Entrada","Pausa","Reanuda","Salida","Horas"]];

        filas.forEach(tr => {
            const c = tr.children;
            data.push([
                c[0].innerText,
                c[1].innerText,
                c[2].querySelector("input").value || '-',
                c[3].querySelector("input").value || '-',
                c[4].querySelector("input").value || '-',
                c[5].querySelector("input").value || '-',
                c[6].innerText
            ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(data);

        // Add some formatting
        const range = XLSX.utils.decode_range(ws['!ref']);

        // Style header row
        for (let col = range.s.c; col <= range.e.c; col++) {
            const cellRef = XLSX.utils.encode_cell({r: 0, c: col});
            if (!ws[cellRef]) continue;
            ws[cellRef].s = {
                font: { bold: true },
                fill: { fgColor: { rgb: "D9EAD3" } }
            };
        }

        const wb = XLSX.utils.book_new();
        const monthYear = document.getElementById("mes").value;
        const sheetName = monthYear ? `Horario ${monthYear}` : "Horario";

        XLSX.utils.book_append_sheet(wb, ws, sheetName);

        const fileName = monthYear ? `horario_${monthYear.replace('-', '_')}.xlsx` : "horario.xlsx";
        XLSX.writeFile(wb, fileName);

        hideLoadingScreen();
        showNotification('📊 Archivo Excel generado correctamente', 'success');

    } catch (error) {
        hideLoadingScreen();
        showNotification('Error al generar el archivo Excel', 'error');
        console.error('Export error:', error);
    }
}

async function cargarDesdeSupabase() {
    const mes = document.getElementById("mes").value;
    if (!mes) return;

    try {
        const [year, month] = mes.split("-");
        const inicio = `${year}-${month}-01`;
        const fin = `${year}-${month}-31`;

        const { data, error } = await supabaseClient
            .from('fichajes')
            .select('*')
            .gte('fecha', inicio)
            .lte('fecha', fin);

        if (error) {
            console.error('Error loading data:', error);
            showNotification('Error al cargar los datos guardados', 'warning');
            return;
        }

        // Create date map for quick lookup
        const mapa = {};
        data.forEach(d => {
            mapa[d.fecha] = d;
        });

        // Update table rows
        document.querySelectorAll("#tabla tbody tr").forEach(tr => {
            const fecha = tr.children[0].innerText;

            if (mapa[fecha]) {
                const inputs = tr.querySelectorAll("input");
                inputs[0].value = mapa[fecha].entrada || "";
                inputs[1].value = mapa[fecha].pausa || "";
                inputs[2].value = mapa[fecha].reanudacion || "";
                inputs[3].value = mapa[fecha].salida || "";

                // Update hours calculation
                const { updateRowHours } = await import('./components.js');
                updateRowHours(tr);
            }
        });

        // Update mobile cards
        document.querySelectorAll(".time-card").forEach(card => {
            const fecha = card.dataset.date;

            if (mapa[fecha]) {
                const inputs = card.querySelectorAll("input");
                inputs[0].value = mapa[fecha].entrada || "";
                inputs[1].value = mapa[fecha].pausa || "";
                inputs[2].value = mapa[fecha].reanudacion || "";
                inputs[3].value = mapa[fecha].salida || "";

                // Update hours calculation
                const { updateCardHours } = await import('./components.js');
                updateCardHours(card);
            }
        });

        // Mark as saved since we just loaded from database
        markSaved();
        updateStatistics();

    } catch (error) {
        console.error('Unexpected error loading data:', error);
        showNotification('Error inesperado al cargar los datos', 'error');
    }
}