import { VALIDATION_PATTERNS, ERROR_MESSAGES, DEFAULT_WORK_HOURS } from './config.js';

/**
 * Utilidades para manejo de fechas y tiempo
 */
export const DateUtils = {
    /**
     * Formatea una fecha al formato español
     */
    formatDate(date, includeTime = false) {
        const options = {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            timeZone: 'Europe/Madrid'
        };

        if (includeTime) {
            options.hour = '2-digit';
            options.minute = '2-digit';
            options.second = '2-digit';
        }

        return new Intl.DateTimeFormat('es-ES', options).format(date);
    },

    /**
     * Obtiene la fecha actual en formato YYYY-MM-DD
     */
    getCurrentDate() {
        return new Date().toISOString().split('T')[0];
    },

    /**
     * Obtiene la hora actual en formato HH:MM
     */
    getCurrentTime() {
        return new Date().toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Europe/Madrid'
        });
    },

    /**
     * Calcula la diferencia en horas entre dos tiempos
     */
    calculateHoursDifference(startTime, endTime) {
        const start = new Date(`2000-01-01 ${startTime}`);
        const end = new Date(`2000-01-01 ${endTime}`);

        if (end < start) {
            // Si es el día siguiente
            end.setDate(end.getDate() + 1);
        }

        return (end - start) / (1000 * 60 * 60);
    },

    /**
     * Convierte minutos a formato HH:MM
     */
    minutesToHours(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    },

    /**
     * Convierte formato HH:MM a minutos
     */
    hoursToMinutes(timeString) {
        const [hours, minutes] = timeString.split(':').map(Number);
        return hours * 60 + minutes;
    },

    /**
     * Valida si una fecha es válida
     */
    isValidDate(dateString) {
        if (!VALIDATION_PATTERNS.DATE_FORMAT.test(dateString)) return false;
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date);
    },

    /**
     * Valida si una hora es válida
     */
    isValidTime(timeString) {
        return VALIDATION_PATTERNS.TIME_FORMAT.test(timeString);
    }
};

/**
 * Utilidades para validación de formularios
 */
export const ValidationUtils = {
    validatePasswordLogin(password) {
    if (!password || typeof password !== 'string') {
        return { isValid: false, message: 'Contraseña requerida' };
    }
    return { isValid: true };
     },
    /**
     * Valida un email
     */
    validateEmail(email) {
        if (!email || typeof email !== 'string') {
            return { isValid: false, message: 'Email requerido' };
        }

        if (!VALIDATION_PATTERNS.EMAIL.test(email)) {
            return { isValid: false, message: ERROR_MESSAGES.INVALID_EMAIL };
        }

        return { isValid: true };
    },

    /**
     * Valida una contraseña
     */
    validatePassword(password) {
        if (!password || typeof password !== 'string') {
            return { isValid: false, message: 'Contraseña requerida' };
        }

        if (!VALIDATION_PATTERNS.PASSWORD.test(password)) {
            return { isValid: false, message: ERROR_MESSAGES.INVALID_PASSWORD };
        }

        return { isValid: true };
    },

    /**
     * Valida formato de tiempo
     */
    validateTime(time) {
        if (!DateUtils.isValidTime(time)) {
            return { isValid: false, message: ERROR_MESSAGES.INVALID_TIME };
        }
        return { isValid: true };
    },

    /**
     * Valida formato de fecha
     */
    validateDate(date) {
        if (!DateUtils.isValidDate(date)) {
            return { isValid: false, message: ERROR_MESSAGES.INVALID_DATE };
        }
        return { isValid: true };
    },

    /**
     * Valida que la hora de salida sea posterior a la de entrada
     */
    validateTimeRange(startTime, endTime) {
        const startMinutes = DateUtils.hoursToMinutes(startTime);
        const endMinutes = DateUtils.hoursToMinutes(endTime);

        if (endMinutes <= startMinutes) {
            return {
                isValid: false,
                message: 'La hora de salida debe ser posterior a la de entrada'
            };
        }

        return { isValid: true };
    }
};

/**
 * Utilidades para cálculos de trabajo
 */
export const WorkUtils = {
    /**
     * Calcula las horas trabajadas
     */
    calculateWorkedHours(startTime, endTime, lunchDuration = DEFAULT_WORK_HOURS.LUNCH_DURATION_MINUTES) {
        if (!startTime || !endTime) return 0;

        const totalHours = DateUtils.calculateHoursDifference(startTime, endTime);
        const lunchHours = lunchDuration / 60;

        return Math.max(0, totalHours - lunchHours);
    },

    /**
     * Calcula horas extra
     */
    calculateOvertimeHours(workedHours, standardHours = DEFAULT_WORK_HOURS.DAILY_HOURS) {
        return Math.max(0, workedHours - standardHours);
    },

    /**
     * Determina el estado del día laboral
     */
    getWorkdayStatus(startTime, endTime) {
        if (!startTime) return 'no_started';
        if (!endTime) return 'in_progress';

        const workedHours = this.calculateWorkedHours(startTime, endTime);
        const standardHours = DEFAULT_WORK_HOURS.DAILY_HOURS;

        if (workedHours < standardHours * 0.5) return 'incomplete';
        if (workedHours < standardHours) return 'partial';
        if (workedHours >= standardHours) return 'complete';

        return 'unknown';
    }
};

/**
 * Utilidades para LocalStorage con expiración
 */
export const StorageUtils = {
    /**
     * Guarda un item con fecha de expiración
     */
    setStorageItem(key, value, expirationHours = 8) {
        const item = {
            value: value,
            timestamp: Date.now(),
            expirationHours: expirationHours
        };

        try {
            localStorage.setItem(key, JSON.stringify(item));
            return true;
        } catch (error) {
            console.error('Error guardando en localStorage:', error);
            return false;
        }
    },

    /**
     * Obtiene un item verificando su expiración
     */
    getStorageItem(key) {
        try {
            const itemStr = localStorage.getItem(key);
            if (!itemStr) return null;

            const item = JSON.parse(itemStr);
            const now = Date.now();
            const expirationTime = item.timestamp + (item.expirationHours * 60 * 60 * 1000);

            if (now > expirationTime) {
                localStorage.removeItem(key);
                return null;
            }

            return item.value;
        } catch (error) {
            console.error('Error leyendo de localStorage:', error);
            localStorage.removeItem(key);
            return null;
        }
    },

    /**
     * Elimina un item del storage
     */
    removeStorageItem(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Error eliminando de localStorage:', error);
            return false;
        }
    },

    /**
     * Limpia todos los items expirados
     */
    cleanExpiredItems() {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            this.getStorageItem(key); // Esto eliminará automáticamente items expirados
        });
    }
};

/**
 * Utilidades para la UI
 */
export const UIUtils = {
    /**
     * Muestra una alerta personalizada
     */
    showAlert(message, type = 'info') {
        // Crear elemento de alerta
        const alertElement = document.createElement('div');
        alertElement.className = `alert alert-${type}`;
        alertElement.textContent = message;

        // Estilos inline para la alerta
        Object.assign(alertElement.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '15px 20px',
            borderRadius: '5px',
            zIndex: '9999',
            maxWidth: '400px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.3s ease'
        });

        // Colores según el tipo
        const colors = {
            success: { bg: '#d4edda', border: '#c3e6cb', text: '#155724' },
            error: { bg: '#f8d7da', border: '#f5c6cb', text: '#721c24' },
            warning: { bg: '#fff3cd', border: '#ffeaa7', text: '#856404' },
            info: { bg: '#d1ecf1', border: '#bee5eb', text: '#0c5460' }
        };

        const color = colors[type] || colors.info;
        alertElement.style.backgroundColor = color.bg;
        alertElement.style.borderLeft = `4px solid ${color.border}`;
        alertElement.style.color = color.text;

        // Agregar al DOM
        document.body.appendChild(alertElement);

        // Auto-eliminar después de 5 segundos
        setTimeout(() => {
            if (alertElement.parentNode) {
                alertElement.style.opacity = '0';
                alertElement.style.transform = 'translateX(100%)';
                setTimeout(() => alertElement.remove(), 300);
            }
        }, 5000);
    },

    /**
     * Muestra un spinner de carga
     */
    showSpinner(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return null;

        const spinner = document.createElement('div');
        spinner.className = 'loading-spinner';
        spinner.innerHTML = `
            <div class="spinner"></div>
            <span>Cargando...</span>
        `;

        // Estilos inline para el spinner
        Object.assign(spinner.style, {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
        });

        container.appendChild(spinner);
        return spinner;
    },

    /**
     * Oculta un spinner de carga
     */
    hideSpinner(spinner) {
        if (spinner && spinner.parentNode) {
            spinner.remove();
        }
    },

    /**
     * Implementa debounce para funciones
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Habilita o deshabilita un elemento
     */
    setElementState(elementId, disabled = false) {
        const element = document.getElementById(elementId);
        if (element) {
            element.disabled = disabled;
            if (disabled) {
                element.classList.add('disabled');
            } else {
                element.classList.remove('disabled');
            }
        }
    },

    /**
     * Limpia los errores de validación de un formulario
     */
    clearFormErrors(formId) {
        const form = document.getElementById(formId);
        if (form) {
            const errorElements = form.querySelectorAll('.error-message');
            errorElements.forEach(el => el.remove());

            const invalidInputs = form.querySelectorAll('.invalid');
            invalidInputs.forEach(input => input.classList.remove('invalid'));
        }
    },

    /**
     * Muestra error en un campo específico
     */
    showFieldError(fieldId, message) {
        const field = document.getElementById(fieldId);
        if (!field) return;

        // Limpiar errores anteriores
        this.clearFieldError(fieldId);

        // Agregar clase de error
        field.classList.add('invalid');

        // Crear mensaje de error
        const errorElement = document.createElement('span');
        errorElement.className = 'error-message';
        errorElement.textContent = message;
        errorElement.style.color = '#721c24';
        errorElement.style.fontSize = '0.875rem';
        errorElement.style.marginTop = '5px';
        errorElement.style.display = 'block';

        // Insertar después del campo
        field.parentNode.insertBefore(errorElement, field.nextSibling);
    },

    /**
     * Limpia el error de un campo específico
     */
    clearFieldError(fieldId) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.classList.remove('invalid');
            const nextElement = field.nextSibling;
            if (nextElement && nextElement.classList?.contains('error-message')) {
                nextElement.remove();
            }
        }
    }
};

/**
 * Utilidades generales
 */
export const GeneralUtils = {
    /**
     * Genera un ID único
     */
    generateUniqueId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    /**
     * Capitaliza la primera letra de una cadena
     */
    capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    },

    /**
     * Formatea números con separadores de miles
     */
    formatNumber(number, decimals = 2) {
        return new Intl.NumberFormat('es-ES', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(number);
    },

    /**
     * Verifica si un objeto está vacío
     */
    isEmpty(obj) {
        if (obj === null || obj === undefined) return true;
        if (Array.isArray(obj) || typeof obj === 'string') return obj.length === 0;
        if (typeof obj === 'object') return Object.keys(obj).length === 0;
        return false;
    },

    /**
     * Clona un objeto profundamente
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (typeof obj === 'object') {
            const clonedObj = {};
            Object.keys(obj).forEach(key => {
                clonedObj[key] = this.deepClone(obj[key]);
            });
            return clonedObj;
        }
    }
};