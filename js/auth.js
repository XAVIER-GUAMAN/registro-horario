import { supabase } from './supabase.js';
import { AUTH_CONFIG, ERROR_MESSAGES } from './config.js';
import { StorageUtils, UIUtils, ValidationUtils } from './utils.js';

/**
 * Gestor de autenticación con patrón singleton
 */
class AuthManager {
    constructor() {
        if (AuthManager.instance) {
            return AuthManager.instance;
        }

        this.user = null;
        this.token = null;
        this.isAuthenticated = false;
        this.loginAttempts = new Map();

        AuthManager.instance = this;
        this.init();
    }

    /**
     * Inicializa el gestor de autenticación
     */
    async init() {
        try {
            // Cargar sesión existente
            await this.loadSession();

            // Limpiar intentos de login expirados
            this.cleanExpiredLoginAttempts();

            console.log('AuthManager inicializado correctamente');
        } catch (error) {
            console.error('Error inicializando AuthManager:', error);
        }
    }

    /**
     * Autentica un usuario
     */
    async login(email, password) {
        try {
            // Validar entrada
            const emailValidation = ValidationUtils.validateEmail(email);
            if (!emailValidation.isValid) {
                throw new Error(emailValidation.message);
            }

            const passwordValidation = ValidationUtils.validatePassword(password);
            if (!passwordValidation.isValid) {
                throw new Error(passwordValidation.message);
            }

            // Verificar bloqueo por intentos fallidos
            if (this.isAccountLocked(email)) {
                throw new Error(ERROR_MESSAGES.ACCOUNT_LOCKED);
            }

            // Realizar autenticación con Supabase
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email.toLowerCase().trim(),
                password: password
            });

            if (error) {
                this.recordFailedAttempt(email);

                if (error.message.includes('Invalid login credentials')) {
                    throw new Error(ERROR_MESSAGES.LOGIN_FAILED);
                }
                throw new Error(error.message);
            }

            // Verificar que el usuario existe en nuestra tabla personalizada
            const { data: userData, error: userError } = await supabase
                .from('usuarios')
                .select('*')
                .eq('email', email.toLowerCase().trim())
                .single();

            if (userError || !userData) {
                throw new Error('Usuario no encontrado en el sistema');
            }

            // Actualizar último acceso
            await this.updateLastAccess(userData.id);

            // Crear sesión
            const sessionData = {
                user: {
                    id: userData.id,
                    email: userData.email,
                    nombre: userData.nombre,
                    apellidos: userData.apellidos,
                    rol: userData.rol || 'empleado',
                    activo: userData.activo,
                    ultimo_acceso: new Date().toISOString()
                },
                token: data.session.access_token,
                expiresAt: data.session.expires_at
            };

            // Generar token JWT personalizado
            const customToken = this.generateJWT(sessionData.user);

            // Guardar sesión
            this.saveSession(sessionData.user, customToken);

            // Limpiar intentos fallidos
            this.loginAttempts.delete(email);

            UIUtils.showAlert('Inicio de sesión exitoso', 'success');

            return {
                success: true,
                user: sessionData.user,
                token: customToken
            };

        } catch (error) {
            console.error('Error en login:', error);
            UIUtils.showAlert(error.message, 'error');

            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Cierra la sesión del usuario
     */
    async logout(showMessage = true) {
        try {
            // Cerrar sesión en Supabase
            const { error } = await supabase.auth.signOut();

            if (error) {
                console.error('Error cerrando sesión en Supabase:', error);
            }

            // Limpiar datos locales
            this.clearSession();

            if (showMessage) {
                UIUtils.showAlert('Sesión cerrada correctamente', 'info');
            }

            // Redirigir al login después de un breve delay
            setTimeout(() => {
                this.redirectToLogin();
            }, AUTH_CONFIG.REDIRECT_DELAY);

            return { success: true };

        } catch (error) {
            console.error('Error en logout:', error);
            this.clearSession(); // Limpiar de todas formas
            return { success: false, error: error.message };
        }
    }

    /**
     * Carga una sesión existente
     */
    async loadSession() {
        try {
            // Obtener datos del storage
            const user = StorageUtils.getStorageItem(AUTH_CONFIG.USER_KEY);
            const token = StorageUtils.getStorageItem(AUTH_CONFIG.TOKEN_KEY);

            if (!user || !token) {
                return false;
            }

            // Validar token
            if (!this.validateJWT(token)) {
                this.clearSession();
                return false;
            }

            // Verificar sesión con Supabase
            const { data: { session }, error } = await supabase.auth.getSession();

            if (error || !session) {
                this.clearSession();
                return false;
            }

            // Configurar estado
            this.user = user;
            this.token = token;
            this.isAuthenticated = true;

            console.log('Sesión cargada correctamente');
            return true;

        } catch (error) {
            console.error('Error cargando sesión:', error);
            this.clearSession();
            return false;
        }
    }

    /**
     * Guarda la sesión en el storage
     */
    saveSession(user, token) {
        try {
            StorageUtils.setStorageItem(AUTH_CONFIG.USER_KEY, user, AUTH_CONFIG.TOKEN_EXPIRY_HOURS);
            StorageUtils.setStorageItem(AUTH_CONFIG.TOKEN_KEY, token, AUTH_CONFIG.TOKEN_EXPIRY_HOURS);

            this.user = user;
            this.token = token;
            this.isAuthenticated = true;

            return true;
        } catch (error) {
            console.error('Error guardando sesión:', error);
            return false;
        }
    }

    /**
     * Limpia la sesión
     */
    clearSession() {
        StorageUtils.removeStorageItem(AUTH_CONFIG.USER_KEY);
        StorageUtils.removeStorageItem(AUTH_CONFIG.TOKEN_KEY);

        this.user = null;
        this.token = null;
        this.isAuthenticated = false;
    }

    /**
     * Valida si hay una sesión activa
     */
    validateSession() {
        if (!this.isAuthenticated || !this.token) {
            return false;
        }

        return this.validateJWT(this.token);
    }

    /**
     * Genera un token JWT personalizado
     */
    generateJWT(userData) {
        try {
            const header = {
                alg: 'HS256',
                typ: 'JWT'
            };

            const payload = {
                sub: userData.id,
                email: userData.email,
                nombre: userData.nombre,
                rol: userData.rol,
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + (AUTH_CONFIG.TOKEN_EXPIRY_HOURS * 3600)
            };

            // Simulación de JWT (en producción usar una librería como jose)
            const encodedHeader = btoa(JSON.stringify(header));
            const encodedPayload = btoa(JSON.stringify(payload));
            const signature = btoa(JSON.stringify({ timestamp: Date.now() })); // Firma simplificada

            return `${encodedHeader}.${encodedPayload}.${signature}`;

        } catch (error) {
            console.error('Error generando JWT:', error);
            return null;
        }
    }

    /**
     * Valida un token JWT
     */
    validateJWT(token) {
        try {
            if (!token || typeof token !== 'string') {
                return false;
            }

            const parts = token.split('.');
            if (parts.length !== 3) {
                return false;
            }

            const payload = JSON.parse(atob(parts[1]));
            const now = Math.floor(Date.now() / 1000);

            // Verificar expiración
            if (payload.exp && payload.exp < now) {
                return false;
            }

            return true;

        } catch (error) {
            console.error('Error validando JWT:', error);
            return false;
        }
    }

    /**
     * Obtiene los datos del token JWT
     */
    getTokenData(token = null) {
        try {
            const tokenToUse = token || this.token;
            if (!tokenToUse) return null;

            const parts = tokenToUse.split('.');
            if (parts.length !== 3) return null;

            return JSON.parse(atob(parts[1]));

        } catch (error) {
            console.error('Error obteniendo datos del token:', error);
            return null;
        }
    }

    /**
     * Actualiza el último acceso del usuario
     */
    async updateLastAccess(userId) {
        try {
            const { error } = await supabase
                .from('usuarios')
                .update({ ultimo_acceso: new Date().toISOString() })
                .eq('id', userId);

            if (error) {
                console.error('Error actualizando último acceso:', error);
            }
        } catch (error) {
            console.error('Error en updateLastAccess:', error);
        }
    }

    /**
     * Registra un intento de login fallido
     */
    recordFailedAttempt(email) {
        const attempts = this.loginAttempts.get(email) || { count: 0, lastAttempt: Date.now() };
        attempts.count++;
        attempts.lastAttempt = Date.now();
        this.loginAttempts.set(email, attempts);
    }

    /**
     * Verifica si una cuenta está bloqueada
     */
    isAccountLocked(email) {
        const attempts = this.loginAttempts.get(email);
        if (!attempts || attempts.count < AUTH_CONFIG.MAX_LOGIN_ATTEMPTS) {
            return false;
        }

        const lockoutTime = AUTH_CONFIG.LOCKOUT_DURATION_MINUTES * 60 * 1000;
        return (Date.now() - attempts.lastAttempt) < lockoutTime;
    }

    /**
     * Limpia intentos de login expirados
     */
    cleanExpiredLoginAttempts() {
        const lockoutTime = AUTH_CONFIG.LOCKOUT_DURATION_MINUTES * 60 * 1000;
        const now = Date.now();

        for (const [email, attempts] of this.loginAttempts.entries()) {
            if (now - attempts.lastAttempt > lockoutTime) {
                this.loginAttempts.delete(email);
            }
        }
    }

    /**
     * Protege una ruta verificando autenticación
     */
    async requireAuth(redirectPath = '/') {
        if (!await this.loadSession()) {
            UIUtils.showAlert(ERROR_MESSAGES.SESSION_EXPIRED, 'warning');
            setTimeout(() => {
                window.location.href = redirectPath;
            }, AUTH_CONFIG.REDIRECT_DELAY);
            return false;
        }

        return true;
    }

    /**
     * Verifica si el usuario tiene un rol específico
     */
    hasRole(requiredRole) {
        if (!this.user) return false;

        const userRole = this.user.rol || 'empleado';

        // Jerarquía de roles
        const roleHierarchy = {
            'super_admin': 4,
            'admin': 3,
            'supervisor': 2,
            'empleado': 1
        };

        const userLevel = roleHierarchy[userRole] || 0;
        const requiredLevel = roleHierarchy[requiredRole] || 0;

        return userLevel >= requiredLevel;
    }

    /**
     * Redirige a la página de login
     */
    redirectToLogin() {
        window.location.href = '/';
    }

    /**
     * Redirige a la página principal
     */
    redirectToMain() {
        window.location.href = '/main.html';
    }

    /**
     * Obtiene información del usuario actual
     */
    getCurrentUser() {
        return this.user;
    }

    /**
     * Verifica si el usuario está autenticado
     */
    isUserAuthenticated() {
        return this.isAuthenticated && this.validateSession();
    }

    /**
     * Refresca el token si es necesario
     */
    async refreshTokenIfNeeded() {
        try {
            if (!this.token) return false;

            const tokenData = this.getTokenData();
            if (!tokenData) return false;

            // Verificar si el token expira en los próximos 30 minutos
            const now = Math.floor(Date.now() / 1000);
            const thirtyMinutesFromNow = now + (30 * 60);

            if (tokenData.exp < thirtyMinutesFromNow) {
                // Intentar refrescar la sesión con Supabase
                const { data: { session }, error } = await supabase.auth.refreshSession();

                if (error || !session) {
                    await this.logout(false);
                    return false;
                }

                // Generar nuevo token personalizado
                const newToken = this.generateJWT(this.user);

                if (newToken) {
                    StorageUtils.setStorageItem(AUTH_CONFIG.TOKEN_KEY, newToken, AUTH_CONFIG.TOKEN_EXPIRY_HOURS);
                    this.token = newToken;
                    return true;
                }
            }

            return true;

        } catch (error) {
            console.error('Error refrescando token:', error);
            return false;
        }
    }
}

// Instancia singleton
const authManager = new AuthManager();

// Exportar instancia y funciones de utilidad
export { authManager as AuthManager };

/**
 * Funciones de utilidad para autenticación
 */
export const AuthUtils = {
    /**
     * Inicializa la protección de rutas
     */
    async initRouteProtection() {
        const isAuthenticated = await authManager.loadSession();

        // Si estamos en la página de login y ya estamos autenticados, redirigir
        if (isAuthenticated && window.location.pathname === '/') {
            authManager.redirectToMain();
            return;
        }

        // Si no estamos autenticados y no estamos en login, redirigir
        if (!isAuthenticated && window.location.pathname !== '/') {
            authManager.redirectToLogin();
            return;
        }
    },

    /**
     * Configura el manejo automático de sesión expirada
     */
    setupSessionMonitoring() {
        // Verificar sesión cada 5 minutos
        setInterval(async () => {
            if (authManager.isAuthenticated) {
                const isValid = await authManager.refreshTokenIfNeeded();
                if (!isValid) {
                    UIUtils.showAlert(ERROR_MESSAGES.SESSION_EXPIRED, 'warning');
                }
            }
        }, 5 * 60 * 1000);

        // Limpiar storage al cerrar la ventana
        window.addEventListener('beforeunload', () => {
            StorageUtils.cleanExpiredItems();
        });
    },

    /**
     * Configura listeners para formularios de login
     */
    setupLoginForm(formId) {
        const form = document.getElementById(formId);
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = form.querySelector('#email')?.value;
            const password = form.querySelector('#password')?.value;

            if (!email || !password) {
                UIUtils.showAlert('Por favor, completa todos los campos', 'warning');
                return;
            }

            // Deshabilitar botón de submit
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn?.textContent;

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Iniciando sesión...';
            }

            try {
                const result = await authManager.login(email, password);

                if (result.success) {
                    setTimeout(() => {
                        authManager.redirectToMain();
                    }, AUTH_CONFIG.REDIRECT_DELAY);
                }
            } finally {
                // Restaurar botón
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }
            }
        });
    },

    /**
     * Configura botón de logout
     */
    setupLogoutButton(buttonId) {
        const button = document.getElementById(buttonId);
        if (!button) return;

        button.addEventListener('click', async (e) => {
            e.preventDefault();

            if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
                await authManager.logout();
            }
        });
    }
};