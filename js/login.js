import { AuthManager, AuthUtils } from './auth.js';
import { ValidationUtils, UIUtils } from './utils.js';
import { ERROR_MESSAGES } from './config.js';

/**
 * Controlador para la página de login con validación en tiempo real
 */
class LoginController {
    constructor() {
        this.form = null;
        this.emailInput = null;
        this.passwordInput = null;
        this.submitButton = null;
        this.passwordToggleBtn = null;
        this.alertContainer = null;
        this.isSubmitting = false;

        this.init();
    }

    /**
     * Inicializa el controlador de login
     */
    async init() {
        try {
            // Verificar si ya está autenticado
            await this.checkExistingAuthentication();

            // Inicializar elementos DOM
            this.initializeElements();

            // Configurar event listeners
            this.setupEventListeners();

            // Configurar validación en tiempo real
            this.setupRealTimeValidation();

            // Enfocar el primer campo
            this.focusFirstField();

            console.log('LoginController inicializado correctamente');
        } catch (error) {
            console.error('Error inicializando LoginController:', error);
            this.showAlert('Error inicializando la página de login', 'error');
        }
    }

    /**
     * Verifica si el usuario ya está autenticado
     */
    async checkExistingAuthentication() {
        const isAuthenticated = AuthManager.isUserAuthenticated();
        if (isAuthenticated) {
            this.showAlert('Ya tienes una sesión activa. Redirigiendo...', 'info');
            setTimeout(() => {
                AuthManager.redirectToMain();
            }, 1500);
        }
    }

    /**
     * Inicializa los elementos DOM
     */
    initializeElements() {
        this.form = document.getElementById('loginForm');
        this.emailInput = document.getElementById('email');
        this.passwordInput = document.getElementById('password');
        this.submitButton = this.form?.querySelector('button[type="submit"]');
        this.passwordToggleBtn = document.querySelector('.password-toggle-btn');
        this.alertContainer = document.getElementById('alertContainer');

        // Validar que todos los elementos existan
        const requiredElements = {
            form: this.form,
            emailInput: this.emailInput,
            passwordInput: this.passwordInput,
            submitButton: this.submitButton,
            alertContainer: this.alertContainer
        };

        for (const [name, element] of Object.entries(requiredElements)) {
            if (!element) {
                throw new Error(`Elemento requerido no encontrado: ${name}`);
            }
        }
    }

    /**
     * Configura los event listeners
     */
    setupEventListeners() {
        // Listener para el formulario
        this.form.addEventListener('submit', (e) => this.handleFormSubmit(e));

        // Listener para el botón de toggle de contraseña
        if (this.passwordToggleBtn) {
            this.passwordToggleBtn.addEventListener('click', (e) => this.togglePasswordVisibility(e));
        }

        // Listeners para navegación por teclado
        this.setupKeyboardNavigation();

        // Listener para Enter en los inputs
        [this.emailInput, this.passwordInput].forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !this.isSubmitting) {
                    e.preventDefault();
                    if (this.validateForm()) {
                        this.handleFormSubmit(e);
                    }
                }
            });
        });
    }

    /**
     * Configura la validación en tiempo real
     */
    setupRealTimeValidation() {
        // Validación de email
        this.emailInput.addEventListener('blur', () => this.validateEmailField());
        this.emailInput.addEventListener('input', () => this.clearFieldError('email'));

        // Validación de contraseña
        this.passwordInput.addEventListener('blur', () => this.validatePasswordField());
        this.passwordInput.addEventListener('input', () => this.clearFieldError('password'));
    }

    /**
     * Configura la navegación por teclado
     */
    setupKeyboardNavigation() {
        // Tab navigation mejorada
        const focusableElements = [
            this.emailInput,
            this.passwordInput,
            this.passwordToggleBtn,
            this.submitButton
        ].filter(Boolean);

        focusableElements.forEach((element, index) => {
            element.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') {
                    // Permitir navegación natural del navegador
                    return;
                }

                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    const direction = e.key === 'ArrowDown' ? 1 : -1;
                    const nextIndex = (index + direction + focusableElements.length) % focusableElements.length;
                    focusableElements[nextIndex].focus();
                }
            });
        });
    }

    /**
     * Enfoca el primer campo del formulario
     */
    focusFirstField() {
        setTimeout(() => {
            if (this.emailInput) {
                this.emailInput.focus();
            }
        }, 100);
    }

    /**
     * Valida el campo de email
     */
    validateEmailField() {
        const email = this.emailInput.value.trim();
        const validation = ValidationUtils.validateEmail(email);

        if (!validation.isValid && email !== '') {
            this.showFieldError('email', validation.message);
            return false;
        } else {
            this.clearFieldError('email');
            return true;
        }
    }

    /**
     * Valida el campo de contraseña
     */
    validatePasswordField() {
        const password = this.passwordInput.value;
        const validation = ValidationUtils.validatePassword(password);

        if (!validation.isValid && password !== '') {
            this.showFieldError('password', validation.message);
            return false;
        } else {
            this.clearFieldError('password');
            return true;
        }
    }

    /**
     * Valida todo el formulario
     */
    validateForm() {
        const email = this.emailInput.value.trim();
        const password = this.passwordInput.value;

        let isValid = true;

        // Validar email
        const emailValidation = ValidationUtils.validateEmail(email);
        if (!emailValidation.isValid) {
            this.showFieldError('email', emailValidation.message);
            isValid = false;
        }

        // Validar contraseña
        const passwordValidation = ValidationUtils.validatePassword(password);
        if (!passwordValidation.isValid) {
            this.showFieldError('password', passwordValidation.message);
            isValid = false;
        }

        return isValid;
    }

    /**
     * Muestra error en un campo específico
     */
    showFieldError(fieldName, message) {
        const input = document.getElementById(fieldName);
        const errorElement = document.getElementById(`${fieldName}-error`);

        if (input) {
            input.classList.add('is-invalid');
            input.classList.remove('is-valid');
        }

        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }

    /**
     * Limpia el error de un campo específico
     */
    clearFieldError(fieldName) {
        const input = document.getElementById(fieldName);
        const errorElement = document.getElementById(`${fieldName}-error`);

        if (input) {
            input.classList.remove('is-invalid');
            if (input.value.trim() !== '') {
                input.classList.add('is-valid');
            }
        }

        if (errorElement) {
            errorElement.textContent = '';
            errorElement.style.display = 'none';
        }
    }

    /**
     * Muestra una alerta en el contenedor
     */
    showAlert(message, type = 'info') {
        const alertClass = `alert-${type}`;
        const iconMap = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };

        this.alertContainer.innerHTML = `
            <div class="alert ${alertClass}">
                <div class="alert-content">
                    <span class="alert-icon">${iconMap[type] || iconMap.info}</span>
                    <span>${message}</span>
                </div>
            </div>
        `;

        // Auto-limpiar alertas de éxito e info
        if (type === 'success' || type === 'info') {
            setTimeout(() => {
                this.clearAlert();
            }, 5000);
        }
    }

    /**
     * Limpia las alertas
     */
    clearAlert() {
        if (this.alertContainer) {
            this.alertContainer.innerHTML = '';
        }
    }

    /**
     * Alterna la visibilidad de la contraseña
     */
    togglePasswordVisibility(event) {
        event.preventDefault();

        const isCurrentlyPassword = this.passwordInput.type === 'password';
        const eyeOpen = this.passwordToggleBtn.querySelector('.eye-open');
        const eyeClosed = this.passwordToggleBtn.querySelector('.eye-closed');

        if (isCurrentlyPassword) {
            this.passwordInput.type = 'text';
            eyeOpen.style.display = 'none';
            eyeClosed.style.display = 'block';
            this.passwordToggleBtn.setAttribute('aria-label', 'Ocultar contraseña');
        } else {
            this.passwordInput.type = 'password';
            eyeOpen.style.display = 'block';
            eyeClosed.style.display = 'none';
            this.passwordToggleBtn.setAttribute('aria-label', 'Mostrar contraseña');
        }

        // Mantener el foco en el input de contraseña
        this.passwordInput.focus();
    }

    /**
     * Maneja el envío del formulario
     */
    async handleFormSubmit(event) {
        event.preventDefault();

        // Prevenir múltiples envíos
        if (this.isSubmitting) {
            return;
        }

        // Limpiar alertas previas
        this.clearAlert();

        // Validar formulario
        if (!this.validateForm()) {
            this.showAlert('Por favor, corrige los errores antes de continuar', 'error');
            return;
        }

        const email = this.emailInput.value.trim();
        const password = this.passwordInput.value;

        try {
            // Activar estado de carga
            this.setLoadingState(true);

            // Intentar hacer login
            const result = await AuthManager.login(email, password);

            if (result.success) {
                this.showAlert('¡Inicio de sesión exitoso! Redirigiendo...', 'success');

                // Limpiar formulario por seguridad
                this.clearFormData();

                // Redirigir después de un breve delay
                setTimeout(() => {
                    AuthManager.redirectToMain();
                }, 1500);
            } else {
                // Mostrar error específico
                this.showAlert(result.error || ERROR_MESSAGES.LOGIN_FAILED, 'error');

                // Enfocar el campo de email para reintentar
                this.emailInput.focus();
                this.emailInput.select();
            }

        } catch (error) {
            console.error('Error durante el login:', error);
            this.showAlert('Error de conexión. Por favor, inténtalo de nuevo.', 'error');
        } finally {
            // Desactivar estado de carga
            this.setLoadingState(false);
        }
    }

    /**
     * Configura el estado de carga del botón
     */
    setLoadingState(isLoading) {
        this.isSubmitting = isLoading;

        if (isLoading) {
            this.submitButton.disabled = true;
            this.submitButton.classList.add('loading');

            // Deshabilitar inputs
            this.emailInput.disabled = true;
            this.passwordInput.disabled = true;

            // Mostrar overlay de carga
            const overlay = document.getElementById('loadingOverlay');
            if (overlay) {
                overlay.style.display = 'flex';
            }
        } else {
            this.submitButton.disabled = false;
            this.submitButton.classList.remove('loading');

            // Habilitar inputs
            this.emailInput.disabled = false;
            this.passwordInput.disabled = false;

            // Ocultar overlay de carga
            const overlay = document.getElementById('loadingOverlay');
            if (overlay) {
                overlay.style.display = 'none';
            }
        }
    }

    /**
     * Limpia los datos del formulario
     */
    clearFormData() {
        this.emailInput.value = '';
        this.passwordInput.value = '';
        this.clearFieldError('email');
        this.clearFieldError('password');
    }

    /**
     * Obtiene el estado actual del controlador
     */
    getState() {
        return {
            isSubmitting: this.isSubmitting,
            hasErrors: this.form?.querySelectorAll('.is-invalid').length > 0,
            formData: {
                email: this.emailInput?.value || '',
                hasPassword: Boolean(this.passwordInput?.value)
            }
        };
    }
}

/**
 * Inicialización cuando el DOM esté listo
 */
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Verificar que estamos en la página de login
        if (window.location.pathname === '/' || window.location.pathname.endsWith('index.html')) {
            // Inicializar el controlador de login
            window.loginController = new LoginController();
        }

        // Configurar protección de rutas
        await AuthUtils.initRouteProtection();

        // Configurar monitoreo de sesión
        AuthUtils.setupSessionMonitoring();

    } catch (error) {
        console.error('Error inicializando la página de login:', error);

        // Mostrar mensaje de error al usuario
        const alertContainer = document.getElementById('alertContainer');
        if (alertContainer) {
            alertContainer.innerHTML = `
                <div class="alert alert-error">
                    <div class="alert-content">
                        <span class="alert-icon">✕</span>
                        <span>Error inicializando la página. Por favor, recarga la página.</span>
                    </div>
                </div>
            `;
        }
    }
});

// Exportar el controlador para uso externo
export { LoginController };