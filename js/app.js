/**
 * APP.JS - Main Application Logic for Time Tracking System
 *
 * Features:
 * - Modern class-based architecture with authentication integration
 * - Fixed date calculation (corrects day-of-week bug)
 * - Smart saving with confirmation modals
 * - Auto-save functionality with change tracking
 * - Enhanced error handling and user feedback
 * - Mobile/desktop component synchronization
 */

import { supabaseClient } from './supabase.js';
import { AuthManager } from './auth.js';
import {
    createTableRow,
    createTimeCard,
    updateStatistics,
    showLoadingScreen,
    hideLoadingScreen,
    markSaved,
    markUnsaved,
    showConfirmModal,
    showNotification,
    applyTimeTemplate,
    extractDayData,
    syncViews,
    updateRowHours,
    updateCardHours
} from './components.js';

// Fixed DAYS array with correct Spanish weekdays
const DAYS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

/**
 * Main TimeTrackingApp class - modern architecture with authentication
 */
class TimeTrackingApp {
    constructor() {
        this.authManager = AuthManager;
        this.currentUser = null;
        this.hasUnsavedChanges = false;
        this.autoSaveInterval = null;
        this.changeTracking = new Set();
        this.initialized = false;
    }

    /**
     * Initialize the application with authentication check
     */
    async init() {
        try {
            showLoadingScreen('Inicializando aplicación...');

            // Check authentication first
            if (!await this.checkAuth()) {
                return; // Will redirect to login
            }

            // Set up the application
            await this.setupApp();
            this.setupEventListeners();
            this.setupAutoSave();

            // Generate current month
            await this.generateMonth();

            this.initialized = true;
            hideLoadingScreen();

        } catch (error) {
            hideLoadingScreen();
            showNotification('Error crítico al inicializar la aplicación', 'error');
            console.error('App initialization error:', error);
        }
    }

    /**
     * Check authentication and protect routes
     */
    async checkAuth() {
        const isAuthenticated = await this.authManager.requireAuth('/index.html');

        if (!isAuthenticated) {
            return false;
        }

        this.currentUser = this.authManager.getCurrentUser();
        this.updateWelcomeMessage();
        return true;
    }

    /**
     * Set up initial app state
     */
    async setupApp() {
        // Initialize month selector with current month
        const currentDate = new Date();
        const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
        document.getElementById("mes").value = currentMonth;

        // Refresh token if needed
        await this.authManager.refreshTokenIfNeeded();
    }

    /**
     * Set up event listeners for user interaction
     */
    setupEventListeners() {
        // Month change listener
        document.getElementById("mes").addEventListener("change", () => this.generateMonth());

        // Track changes on time inputs (delegated event handling)
        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('time-input')) {
                this.trackChange(e.target);
                this.hasUnsavedChanges = true;
                markUnsaved();
            }
        });

        // Window beforeunload protection
        window.addEventListener('beforeunload', (e) => {
            if (this.hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = 'Tienes cambios sin guardar. ¿Estás seguro que quieres salir?';
                return e.returnValue;
            }
        });
    }

    /**
     * Set up auto-save functionality
     */
    setupAutoSave() {
        // Auto-save every 30 seconds if there are changes
        this.autoSaveInterval = setInterval(async () => {
            if (this.hasUnsavedChanges && this.changeTracking.size > 0) {
                await this.autoSave();
            }
        }, 30000);
    }

    /**
     * Generate calendar for selected month with fixed date calculations
     */
    async generateMonth() {
        const monthValue = document.getElementById("mes").value;
        if (!monthValue) return;

        try {
            showLoadingScreen('Generando calendario...');

            const [year, month] = monthValue.split("-");
            const daysInMonth = new Date(year, month, 0).getDate();

            const tbody = document.querySelector("#tabla tbody");
            const timeCards = document.getElementById("timeCards");

            // Clear existing content
            tbody.innerHTML = "";
            timeCards.innerHTML = "";

            // Generate days (fixed date calculation)
            for (let day = 1; day <= daysInMonth; day++) {
                // FIXED: Correct date object creation
                const date = new Date(year, month - 1, day);
                const dayOfWeek = date.getDay(); // 0=Sunday, 1=Monday, etc.

                // Skip weekends (Saturday=6, Sunday=0)
                if (dayOfWeek === 0 || dayOfWeek === 6) continue;

                const dayData = {
                    date: date.toISOString().split("T")[0],
                    dayOfWeek: DAYS[dayOfWeek], // FIXED: Now shows correct day
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

            // Load saved data and update statistics
            await this.loadDataFromSupabase();
            updateStatistics();

            // Reset change tracking
            this.clearChangeTracking();

            hideLoadingScreen();

        } catch (error) {
            hideLoadingScreen();
            showNotification('Error al generar el calendario', 'error');
            console.error('Error generating month:', error);
        }
    }

    /**
     * Update welcome message with user name
     */
    updateWelcomeMessage() {
        const welcomeElement = document.getElementById('userWelcome');
        if (welcomeElement && this.currentUser) {
            const userName = this.currentUser.nombre || this.currentUser.email;
            welcomeElement.textContent = `Bienvenido, ${userName}`;
        }
    }

    /**
     * Track changes for auto-save
     */
    trackChange(element) {
        const date = element.closest('tr, .time-card')?.dataset.date;
        if (date) {
            this.changeTracking.add(date);
        }
    }

    /**
     * Clear change tracking
     */
    clearChangeTracking() {
        this.changeTracking.clear();
        this.hasUnsavedChanges = false;
        markSaved();
    }

    /**
     * Auto-save functionality
     */
    async autoSave() {
        try {
            const dataToSave = this.getSmartSaveData();

            if (dataToSave.length === 0) {
                this.clearChangeTracking();
                return;
            }

            const { error } = await supabaseClient
                .from('fichajes')
                .upsert(dataToSave, { onConflict: ['fecha'] });

            if (!error) {
                this.clearChangeTracking();
                showNotification('💾 Auto-guardado completado', 'success', 2000);
            }

        } catch (error) {
            console.error('Auto-save error:', error);
        }
    }

    /**
     * Get data for smart saving (only non-empty records)
     */
    getSmartSaveData() {
        const rows = document.querySelectorAll("#tabla tbody tr");
        const validData = [];

        rows.forEach(tr => {
            const cells = tr.children;
            const fecha = cells[0].innerText;
            const entrada = cells[2].querySelector("input").value.trim();
            const pausa = cells[3].querySelector("input").value.trim();
            const reanudacion = cells[4].querySelector("input").value.trim();
            const salida = cells[5].querySelector("input").value.trim();
            const horas = parseFloat(cells[6].innerText) || 0;

            // Smart filtering: only save if there's meaningful time data
            if (entrada && salida) { // Minimum requirement: entry and exit times
                validData.push({
                    fecha,
                    entrada,
                    pausa: pausa || null,
                    reanudacion: reanudacion || null,
                    salida,
                    horas,
                    usuario_id: this.currentUser.id
                });
            }
        });

        return validData;
    }

    /**
     * Enhanced save with confirmation modal and data preview
     */
    async saveToSupabase() {
        try {
            const dataToSave = this.getSmartSaveData();

            if (dataToSave.length === 0) {
                showNotification('No hay datos válidos para guardar', 'warning');
                return;
            }

            // Show confirmation modal with data preview
            const previewMessage = `
                Se guardarán ${dataToSave.length} día(s) de trabajo.
                Total de horas: ${dataToSave.reduce((sum, d) => sum + d.horas, 0).toFixed(2)}h

                ¿Continuar con el guardado?
            `;

            showConfirmModal(
                previewMessage,
                async () => {
                    await this.performSave(dataToSave);
                }
            );

        } catch (error) {
            showNotification('Error al preparar el guardado', 'error');
            console.error('Save preparation error:', error);
        }
    }

    /**
     * Perform the actual save operation
     */
    async performSave(data) {
        try {
            showLoadingScreen('Guardando datos...');

            const { error } = await supabaseClient
                .from('fichajes')
                .upsert(data, { onConflict: ['fecha'] });

            hideLoadingScreen();

            if (error) {
                showNotification(`Error al guardar: ${error.message}`, 'error');
                console.error('Save error:', error);
            } else {
                this.clearChangeTracking();
                showNotification('💾 Datos guardados correctamente', 'success');
            }

        } catch (error) {
            hideLoadingScreen();
            showNotification('Error inesperado al guardar los datos', 'error');
            console.error('Unexpected save error:', error);
        }
    }

    /**
     * Load data from Supabase with user filtering
     */
    async loadDataFromSupabase() {
        const monthValue = document.getElementById("mes").value;
        if (!monthValue) return;

        try {
            const [year, month] = monthValue.split("-");
            const startDate = `${year}-${month}-01`;
            const endDate = `${year}-${month}-31`;

            let query = supabaseClient
                .from('fichajes')
                .select('*')
                .gte('fecha', startDate)
                .lte('fecha', endDate);

            // Add user filtering if user_id exists in the table
            if (this.currentUser && this.currentUser.id) {
                query = query.eq('usuario_id', this.currentUser.id);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error loading data:', error);
                showNotification('Error al cargar los datos guardados', 'warning');
                return;
            }

            // Apply data to UI
            this.applyDataToUI(data);

        } catch (error) {
            console.error('Unexpected error loading data:', error);
            showNotification('Error inesperado al cargar los datos', 'error');
        }
    }

    /**
     * Apply loaded data to UI components
     */
    applyDataToUI(data) {
        // Create date map for quick lookup
        const dataMap = {};
        data.forEach(record => {
            dataMap[record.fecha] = record;
        });

        // Update table rows
        document.querySelectorAll("#tabla tbody tr").forEach(tr => {
            const fecha = tr.children[0].innerText;

            if (dataMap[fecha]) {
                const record = dataMap[fecha];
                const inputs = tr.querySelectorAll("input");

                inputs[0].value = record.entrada || "";
                inputs[1].value = record.pausa || "";
                inputs[2].value = record.reanudacion || "";
                inputs[3].value = record.salida || "";

                updateRowHours(tr);
            }
        });

        // Update mobile cards
        document.querySelectorAll(".time-card").forEach(card => {
            const fecha = card.dataset.date;

            if (dataMap[fecha]) {
                const record = dataMap[fecha];
                const inputs = card.querySelectorAll("input");

                inputs[0].value = record.entrada || "";
                inputs[1].value = record.pausa || "";
                inputs[2].value = record.reanudacion || "";
                inputs[3].value = record.salida || "";

                updateCardHours(card);
            }
        });

        // Sync views and update statistics
        syncViews();
        this.clearChangeTracking();
        updateStatistics();
    }

    /**
     * Enhanced Excel export with proper formatting
     */
    exportToExcel() {
        try {
            const rows = document.querySelectorAll("#tabla tbody tr");

            if (rows.length === 0) {
                showNotification('No hay datos para exportar', 'warning');
                return;
            }

            showLoadingScreen('Preparando exportación...');

            // Create Excel data with headers
            const data = [
                ["Fecha", "Día", "Entrada", "Pausa", "Reanuda", "Salida", "Total Horas"]
            ];

            rows.forEach(tr => {
                const cells = tr.children;
                data.push([
                    cells[0].innerText,
                    cells[1].innerText,
                    cells[2].querySelector("input").value || '-',
                    cells[3].querySelector("input").value || '-',
                    cells[4].querySelector("input").value || '-',
                    cells[5].querySelector("input").value || '-',
                    cells[6].innerText
                ]);
            });

            // Create worksheet and workbook
            const worksheet = XLSX.utils.aoa_to_sheet(data);

            // Apply formatting
            const range = XLSX.utils.decode_range(worksheet['!ref']);

            // Style header row
            for (let col = range.s.c; col <= range.e.c; col++) {
                const cellRef = XLSX.utils.encode_cell({r: 0, c: col});
                if (!worksheet[cellRef]) continue;

                worksheet[cellRef].s = {
                    font: { bold: true },
                    fill: { fgColor: { rgb: "E8F5E8" } },
                    border: {
                        top: { style: "thin" },
                        bottom: { style: "thin" },
                        left: { style: "thin" },
                        right: { style: "thin" }
                    }
                };
            }

            // Create workbook
            const workbook = XLSX.utils.book_new();
            const monthYear = document.getElementById("mes").value;
            const sheetName = monthYear ? `Registro ${monthYear}` : "Registro Horario";

            XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

            // Generate filename
            const userName = this.currentUser?.nombre || 'Usuario';
            const fileName = monthYear ?
                `registro_horario_${userName}_${monthYear.replace('-', '_')}.xlsx` :
                `registro_horario_${userName}.xlsx`;

            // Save file
            XLSX.writeFile(workbook, fileName);

            hideLoadingScreen();
            showNotification('📊 Archivo Excel generado correctamente', 'success');

        } catch (error) {
            hideLoadingScreen();
            showNotification('Error al generar el archivo Excel', 'error');
            console.error('Export error:', error);
        }
    }

    /**
     * Logout with proper cleanup
     */
    async logout() {
        showConfirmModal(
            '¿Estás seguro que deseas cerrar sesión?',
            async () => {
                try {
                    showLoadingScreen('Cerrando sesión...');

                    // Clear auto-save
                    if (this.autoSaveInterval) {
                        clearInterval(this.autoSaveInterval);
                        this.autoSaveInterval = null;
                    }

                    // Logout through AuthManager
                    await this.authManager.logout();

                } catch (error) {
                    hideLoadingScreen();
                    console.error('Logout error:', error);
                    // Force redirect on error
                    window.location.href = '/index.html';
                }
            }
        );
    }

    /**
     * Apply time template to all visible entries
     */
    applyStandardSchedule() {
        showConfirmModal(
            '¿Aplicar horario estándar (9:00-14:00, 15:00-18:00) a todos los días del mes?',
            () => {
                applyTimeTemplate('09:00', '14:00', '15:00', '18:00');
                this.hasUnsavedChanges = true;
                markUnsaved();
                showNotification('Horario estándar aplicado correctamente', 'success');
            }
        );
    }

    /**
     * Cleanup resources
     */
    destroy() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
        window.removeEventListener('beforeunload', this.beforeUnloadHandler);
    }
}

// Create global app instance
const app = new TimeTrackingApp();

// Initialize app when DOM loads
document.addEventListener('DOMContentLoaded', () => app.init());

// Global functions for UI components
window.guardarEnSupabase = () => app.saveToSupabase();
window.exportarExcel = () => app.exportToExcel();
window.logout = () => app.logout();
window.aplicarATodos = () => app.applyStandardSchedule();

// Export app instance for testing/debugging
export { app as TimeTrackingApp };