// Configuración de Supabase
export const SUPABASE_URL = 'https://qdklvavxvbomsstiixwt.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_Vuj-jPLFGuWukKHqgK6gHQ_HkRrtDTs';

// Configuración de autenticación
export const AUTH_CONFIG = {
    TOKEN_KEY: 'registro_horario_token',
    USER_KEY: 'registro_horario_user',
    TOKEN_EXPIRY_HOURS: 8, // 8 horas de duración del token
    REDIRECT_DELAY: 1500, // 1.5 segundos antes de redirección
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION_MINUTES: 15
};

// Configuración de horarios de trabajo por defecto
export const DEFAULT_WORK_HOURS = {
    START_TIME: '09:00',
    END_TIME: '17:00',
    LUNCH_DURATION_MINUTES: 60,
    DAILY_HOURS: 8
};

// Patrones de validación
export const VALIDATION_PATTERNS = {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    TIME_FORMAT: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
    DATE_FORMAT: /^\d{4}-\d{2}-\d{2}$/
};

// Mensajes de error
export const ERROR_MESSAGES = {
    INVALID_EMAIL: 'Por favor, introduce un email válido',
    INVALID_PASSWORD: 'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un símbolo',
    INVALID_TIME: 'Formato de hora inválido (HH:MM)',
    INVALID_DATE: 'Formato de fecha inválido (YYYY-MM-DD)',
    LOGIN_FAILED: 'Credenciales incorrectas',
    SESSION_EXPIRED: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente',
    ACCOUNT_LOCKED: 'Cuenta bloqueada por múltiples intentos fallidos. Intenta de nuevo en 15 minutos',
    CONNECTION_ERROR: 'Error de conexión. Verifica tu conexión a internet'
};

// Configuración de la aplicación
export const APP_CONFIG = {
    NAME: 'Registro Horario',
    VERSION: '2.0.0',
    DEBUG: false,
    DEFAULT_TIMEZONE: 'Europe/Madrid'
};