/**
 * COMPONENTS.JS - Reusable UI Components for Time Tracking App
 *
 * Contains:
 * - Table and card components for responsive timesheet display
 * - Hour calculation utilities with real-time updates
 * - Modal confirmation system for user interactions
 * - Statistics dashboard management
 * - UI state management (loading, unsaved changes)
 * - Component utilities for consistent behavior
 */

// ====================================================================
// 1. RESPONSIVE DISPLAY COMPONENTS
// ====================================================================

/**
 * Creates a table row for desktop timesheet display
 * @param {Object} dayData - Day information {date, dayOfWeek, entrada, pausa, reanuda, salida, hours}
 * @returns {HTMLTableRowElement} Configured table row element
 */
export function createTableRow(dayData) {
    const row = document.createElement("tr");
    row.dataset.date = dayData.date;

    row.innerHTML = `
        <td>${dayData.date}</td>
        <td>${dayData.dayOfWeek}</td>
        <td><input type="time" class="time-input" data-field="entrada" value="${dayData.entrada || ''}"></td>
        <td><input type="time" class="time-input" data-field="pausa" value="${dayData.pausa || ''}"></td>
        <td><input type="time" class="time-input" data-field="reanuda" value="${dayData.reanuda || ''}"></td>
        <td><input type="time" class="time-input" data-field="salida" value="${dayData.salida || ''}"></td>
        <td class="horas text-center">${dayData.hours || '0.00'}</td>
    `;

    // Add event listeners for real-time calculation
    row.querySelectorAll('.time-input').forEach(input => {
        input.addEventListener('input', () => {
            updateRowHours(row);
            markUnsaved();
            updateStatistics();
        });
    });

    return row;
}

/**
 * Creates a mobile card for timesheet display
 * @param {Object} dayData - Day information {date, dayOfWeek, entrada, pausa, reanuda, salida, hours}
 * @returns {HTMLDivElement} Configured time card element
 */
export function createTimeCard(dayData) {
    const card = document.createElement("div");
    card.className = "time-card";
    card.dataset.date = dayData.date;

    card.innerHTML = `
        <div class="card-header">
            <span class="card-date">${dayData.date}</span>
            <span class="card-day">${dayData.dayOfWeek}</span>
        </div>
        <div class="card-fields">
            <div class="field-group">
                <label class="field-label">Entrada</label>
                <input type="time" class="field-input time-input" data-field="entrada" value="${dayData.entrada || ''}">
            </div>
            <div class="field-group">
                <label class="field-label">Pausa</label>
                <input type="time" class="field-input time-input" data-field="pausa" value="${dayData.pausa || ''}">
            </div>
            <div class="field-group">
                <label class="field-label">Reanuda</label>
                <input type="time" class="field-input time-input" data-field="reanuda" value="${dayData.reanuda || ''}">
            </div>
            <div class="field-group">
                <label class="field-label">Salida</label>
                <input type="time" class="field-input time-input" data-field="salida" value="${dayData.salida || ''}">
            </div>
        </div>
        <div class="card-footer">
            <div>
                <div class="hours-label">Total de Horas</div>
            </div>
            <div class="hours-display">${dayData.hours || '0.00'}</div>
        </div>
    `;

    // Add event listeners for real-time calculation
    card.querySelectorAll('.time-input').forEach(input => {
        input.addEventListener('input', () => {
            updateCardHours(card);
            markUnsaved();
            updateStatistics();
        });
    });

    return card;
}

// ====================================================================
// 2. HOUR CALCULATION UTILITIES
// ====================================================================

/**
 * Updates hours calculation for a table row with validation
 * @param {HTMLTableRowElement} row - Table row element to update
 */
export function updateRowHours(row) {
    const inputs = row.querySelectorAll('.time-input');
    const hoursCell = row.querySelector('.horas');

    const entrada = inputs[0].value;
    const pausa = inputs[1].value;
    const reanuda = inputs[2].value;
    const salida = inputs[3].value;

    const hours = calculateWorkHours(entrada, pausa, reanuda, salida);
    hoursCell.textContent = hours.toFixed(2);

    // Add visual feedback for validation
    if (hours < 0) {
        hoursCell.style.color = 'var(--color-error)';
        hoursCell.title = 'Horario inválido: revisa los tiempos ingresados';
    } else {
        hoursCell.style.color = 'var(--color-success)';
        hoursCell.title = '';
    }
}

/**
 * Updates hours calculation for a mobile card with validation
 * @param {HTMLDivElement} card - Time card element to update
 */
export function updateCardHours(card) {
    const inputs = card.querySelectorAll('.time-input');
    const hoursDisplay = card.querySelector('.hours-display');

    const entrada = inputs[0].value;
    const pausa = inputs[1].value;
    const reanuda = inputs[2].value;
    const salida = inputs[3].value;

    const hours = calculateWorkHours(entrada, pausa, reanuda, salida);
    hoursDisplay.textContent = hours.toFixed(2);

    // Add visual feedback for validation
    if (hours < 0) {
        hoursDisplay.style.color = 'var(--color-error)';
        hoursDisplay.title = 'Horario inválido: revisa los tiempos ingresados';
    } else {
        hoursDisplay.style.color = 'var(--color-success)';
        hoursDisplay.title = '';
    }
}

/**
 * Core work hours calculation with break time
 * @param {string} entrada - Start time (HH:mm)
 * @param {string} pausa - Break start time (HH:mm)
 * @param {string} reanuda - Break end time (HH:mm)
 * @param {string} salida - End time (HH:mm)
 * @returns {number} Total work hours
 */
function calculateWorkHours(entrada, pausa, reanuda, salida) {
    if (!entrada || !salida) return 0;

    const entradaMin = timeToMinutes(entrada);
    const salidaMin = timeToMinutes(salida);
    const pausaMin = timeToMinutes(pausa || entrada);
    const reanudaMin = timeToMinutes(reanuda || salida);

    if (salidaMin <= entradaMin) return -1; // Invalid: end before start
    if (reanudaMin <= pausaMin) return -1; // Invalid: break end before break start

    const totalMinutes = (salidaMin - entradaMin) - (reanudaMin - pausaMin);
    return Math.max(0, totalMinutes / 60);
}

/**
 * Converts time string to minutes for calculation
 * @param {string} timeStr - Time in HH:mm format
 * @returns {number} Minutes since midnight
 */
function timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

// ====================================================================
// 3. CONFIRMATION MODAL SYSTEM
// ====================================================================

/**
 * Shows confirmation modal for user actions
 * @param {string} message - Confirmation message to display
 * @param {Function} onConfirm - Callback function for confirmation
 * @param {Function} onCancel - Optional callback for cancellation
 */
export function showConfirmModal(message, onConfirm, onCancel = null) {
    const modal = document.getElementById('confirmModal');
    const messageElement = document.getElementById('confirmMessage');
    const confirmButton = document.getElementById('confirmButton');

    messageElement.textContent = message;
    modal.classList.remove('hidden');

    // Remove previous event listeners
    const newConfirmButton = confirmButton.cloneNode(true);
    confirmButton.parentNode.replaceChild(newConfirmButton, confirmButton);

    // Add new event listeners
    newConfirmButton.addEventListener('click', () => {
        closeConfirmModal();
        if (onConfirm) onConfirm();
    });

    // Handle cancellation
    const closeButtons = modal.querySelectorAll('[onclick*="closeConfirmModal"], .modal-close');
    closeButtons.forEach(button => {
        button.onclick = () => {
            closeConfirmModal();
            if (onCancel) onCancel();
        };
    });

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeConfirmModal();
            if (onCancel) onCancel();
        }
    });

    // Focus management for accessibility
    newConfirmButton.focus();
}

/**
 * Closes the confirmation modal
 */
export function closeConfirmModal() {
    const modal = document.getElementById('confirmModal');
    modal.classList.add('hidden');
}

// ====================================================================
// 4. STATISTICS DASHBOARD MANAGEMENT
// ====================================================================

/**
 * Updates work statistics in the dashboard
 */
export function updateStatistics() {
    const rows = document.querySelectorAll('#tabla tbody tr, .time-card');
    let totalHours = 0;
    let workingDays = 0;

    rows.forEach(element => {
        let hoursText;
        if (element.tagName === 'TR') {
            hoursText = element.querySelector('.horas').textContent;
        } else {
            hoursText = element.querySelector('.hours-display').textContent;
        }

        const hours = parseFloat(hoursText) || 0;
        if (hours > 0) {
            totalHours += hours;
            workingDays++;
        }
    });

    const avgHours = workingDays > 0 ? totalHours / workingDays : 0;

    // Update statistics display
    const totalElement = document.getElementById('totalHours');
    const daysElement = document.getElementById('workingDays');
    const avgElement = document.getElementById('avgHours');

    if (totalElement) totalElement.textContent = totalHours.toFixed(2);
    if (daysElement) daysElement.textContent = workingDays.toString();
    if (avgElement) avgElement.textContent = avgHours.toFixed(2);

    // Add visual indicators for statistics
    updateStatisticsVisuals(totalHours, workingDays, avgHours);
}

/**
 * Updates visual indicators for statistics based on work metrics
 * @param {number} totalHours - Total hours worked
 * @param {number} workingDays - Number of working days
 * @param {number} avgHours - Average hours per day
 */
function updateStatisticsVisuals(totalHours, workingDays, avgHours) {
    const statCards = document.querySelectorAll('.stat-card');

    // Expected work hours per day (8 hours)
    const expectedHoursPerDay = 8;
    const expectedTotal = workingDays * expectedHoursPerDay;

    // Color coding for performance
    statCards.forEach((card, index) => {
        const statIcon = card.querySelector('.stat-icon');

        if (index === 0) { // Total hours
            if (totalHours >= expectedTotal * 0.9) {
                statIcon.style.background = 'var(--color-success-50)';
                statIcon.style.color = 'var(--color-success)';
            } else if (totalHours >= expectedTotal * 0.7) {
                statIcon.style.background = 'var(--color-warning-50)';
                statIcon.style.color = 'var(--color-warning)';
            } else {
                statIcon.style.background = 'var(--color-error-50)';
                statIcon.style.color = 'var(--color-error)';
            }
        } else if (index === 2) { // Average hours
            if (avgHours >= expectedHoursPerDay * 0.9) {
                statIcon.style.background = 'var(--color-success-50)';
                statIcon.style.color = 'var(--color-success)';
            } else if (avgHours >= expectedHoursPerDay * 0.7) {
                statIcon.style.background = 'var(--color-warning-50)';
                statIcon.style.color = 'var(--color-warning)';
            } else {
                statIcon.style.background = 'var(--color-error-50)';
                statIcon.style.color = 'var(--color-error)';
            }
        }
    });
}

// ====================================================================
// 5. UI STATE MANAGEMENT
// ====================================================================

/**
 * Shows loading screen with customizable message
 * @param {string} message - Loading message to display
 */
export function showLoadingScreen(message = 'Cargando...') {
    const loadingScreen = document.getElementById('loadingScreen');
    const loadingText = loadingScreen.querySelector('.loading-text');

    if (loadingText) loadingText.textContent = message;
    loadingScreen.style.display = 'flex';

    // Prevent body scroll while loading
    document.body.style.overflow = 'hidden';
}

/**
 * Hides loading screen and restores normal UI state
 */
export function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    loadingScreen.style.display = 'none';

    // Restore body scroll
    document.body.style.overflow = '';
}

/**
 * Marks UI as having unsaved changes with visual indicator
 */
export function markUnsaved() {
    const indicator = document.getElementById('unsavedIndicator');
    if (indicator) {
        indicator.classList.add('show');
    }

    // Add window beforeunload event to warn about unsaved changes
    window.onbeforeunload = () => {
        return "Tienes cambios sin guardar. ¿Estás seguro que quieres salir?";
    };
}

/**
 * Clears unsaved changes indicator when data is saved
 */
export function markSaved() {
    const indicator = document.getElementById('unsavedIndicator');
    if (indicator) {
        indicator.classList.remove('show');
    }

    // Remove beforeunload warning
    window.onbeforeunload = null;
}

// ====================================================================
// 6. COMPONENT UTILITIES
// ====================================================================

/**
 * Validates time input format and range
 * @param {string} timeStr - Time string to validate
 * @returns {boolean} True if valid time format
 */
export function isValidTime(timeStr) {
    if (!timeStr) return true; // Empty is valid (optional field)

    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(timeStr);
}

/**
 * Formats time for consistent display
 * @param {string} timeStr - Time string to format
 * @returns {string} Formatted time string
 */
export function formatTime(timeStr) {
    if (!timeStr) return '';

    const [hours, minutes] = timeStr.split(':');
    return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
}

/**
 * Extracts day data from table row or card element
 * @param {HTMLElement} element - Table row or card element
 * @returns {Object} Day data object
 */
export function extractDayData(element) {
    const isRow = element.tagName === 'TR';
    const inputs = element.querySelectorAll('.time-input');

    return {
        date: element.dataset.date,
        entrada: inputs[0]?.value || '',
        pausa: inputs[1]?.value || '',
        reanuda: inputs[2]?.value || '',
        salida: inputs[3]?.value || '',
        hours: isRow ?
            element.querySelector('.horas').textContent :
            element.querySelector('.hours-display').textContent
    };
}

/**
 * Applies standard time template to all visible time entries
 * @param {string} entrada - Entry time (default: 09:00)
 * @param {string} pausa - Break start time (default: 14:00)
 * @param {string} reanuda - Break end time (default: 15:00)
 * @param {string} salida - Exit time (default: 18:00)
 */
export function applyTimeTemplate(entrada = '09:00', pausa = '14:00', reanuda = '15:00', salida = '18:00') {
    const rows = document.querySelectorAll('#tabla tbody tr');
    const cards = document.querySelectorAll('.time-card');

    // Apply to table rows
    rows.forEach(row => {
        const inputs = row.querySelectorAll('.time-input');
        inputs[0].value = entrada;
        inputs[1].value = pausa;
        inputs[2].value = reanuda;
        inputs[3].value = salida;
        updateRowHours(row);
    });

    // Apply to mobile cards
    cards.forEach(card => {
        const inputs = card.querySelectorAll('.time-input');
        inputs[0].value = entrada;
        inputs[1].value = pausa;
        inputs[2].value = reanuda;
        inputs[3].value = salida;
        updateCardHours(card);
    });

    markUnsaved();
    updateStatistics();
}

/**
 * Clears all time entries
 */
export function clearAllTimes() {
    const inputs = document.querySelectorAll('.time-input');
    inputs.forEach(input => {
        input.value = '';
    });

    document.querySelectorAll('.horas, .hours-display').forEach(element => {
        element.textContent = '0.00';
    });

    markUnsaved();
    updateStatistics();
}

/**
 * Synchronizes data between table and card views
 */
export function syncViews() {
    const rows = document.querySelectorAll('#tabla tbody tr');
    const cards = document.querySelectorAll('.time-card');

    rows.forEach((row, index) => {
        const card = cards[index];
        if (card) {
            const rowData = extractDayData(row);
            const cardInputs = card.querySelectorAll('.time-input');

            cardInputs[0].value = rowData.entrada;
            cardInputs[1].value = rowData.pausa;
            cardInputs[2].value = rowData.reanuda;
            cardInputs[3].value = rowData.salida;

            updateCardHours(card);
        }
    });
}

// ====================================================================
// 7. ACCESSIBILITY UTILITIES
// ====================================================================

/**
 * Announces changes to screen readers
 * @param {string} message - Message to announce
 */
export function announceToScreenReader(message) {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.style.position = 'absolute';
    announcement.style.left = '-10000px';
    announcement.style.width = '1px';
    announcement.style.height = '1px';
    announcement.style.overflow = 'hidden';
    announcement.textContent = message;

    document.body.appendChild(announcement);

    setTimeout(() => {
        document.body.removeChild(announcement);
    }, 1000);
}

// ====================================================================
// 8. GLOBAL ERROR HANDLING
// ====================================================================

/**
 * Handles component errors gracefully with user feedback
 * @param {Error} error - Error object
 * @param {string} context - Context where error occurred
 */
export function handleComponentError(error, context = 'Unknown') {
    console.error(`Component Error in ${context}:`, error);

    const message = `Ocurrió un error en ${context}. Por favor, recarga la página.`;

    // Show user-friendly error notification
    showNotification(message, 'error', 5000);
}

/**
 * Shows temporary notification to user
 * @param {string} message - Notification message
 * @param {string} type - Notification type (success, error, warning, info)
 * @param {number} duration - Auto-dismiss duration in ms
 */
export function showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type}`;
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.zIndex = '9999';
    notification.style.minWidth = '300px';
    notification.style.maxWidth = '500px';
    notification.innerHTML = `
        <div class="alert-content">
            <span>${message}</span>
        </div>
        <button type="button" class="alert-close" onclick="this.parentElement.remove()">×</button>
    `;

    document.body.appendChild(notification);

    if (duration > 0) {
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, duration);
    }
}

// Export global error handler for use in other modules
window.handleComponentError = handleComponentError;