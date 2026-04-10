# Renovación Completa - Intranet Registro Horario

**Fecha:** 2026-04-10  
**Tipo:** Renovación visual y técnica completa  
**Estado:** Aprobado por usuario  

## Resumen Ejecutivo

Renovación completa de la aplicación de registro horario para hacerla más profesional, segura y funcional. Incluye rediseño visual moderno, sistema de autenticación seguro, corrección de bugs de fechas y mejoras en UX móvil.

## Arquitectura General

### Estructura de Páginas
La aplicación se dividirá en **dos páginas principales**:

1. **`login.html`** - Página de autenticación independiente
   - Formulario centrado con validación en tiempo real
   - Responsive design para móviles
   - Redirección automática tras login exitoso

2. **`app.html`** - Dashboard principal (renombrado desde index.html)
   - Registro horario mejorado
   - Navegación con logout
   - Protegido por autenticación

### Stack Tecnológico
- **Frontend:** Vanilla JavaScript ES6 con módulos
- **Estilos:** CSS Grid + Flexbox, variables CSS para temas
- **Base de datos:** Supabase (PostgreSQL)
- **Autenticación:** JWT + bcrypt para passwords
- **Responsivo:** Mobile-first design

### Flujo de Navegación
```
Usuario → login.html → [autenticación] → app.html
                      ↓ (si falla)
                   Mensaje de error
                   
app.html → [verifica token] → mantiene sesión
            ↓ (si token inválido)
         Redirect a login.html
```

## Sistema de Autenticación y Seguridad

### Nueva Tabla `usuarios`
```sql
CREATE TABLE usuarios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    salt VARCHAR(255) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT NOW(),
    ultimo_acceso TIMESTAMP
);
```

### Seguridad Implementada
- **Contraseñas:** Hasheadas con bcrypt + salt único por usuario
- **Tokens:** JWT con expiración de 24 horas
- **Validación:** Verificación de sesión en cada carga de página
- **Storage:** LocalStorage con manejo de expiración

### Flujos de Autenticación

**Login:**
1. Usuario ingresa email + contraseña
2. Frontend valida formato y hashea password
3. Envío a Supabase para verificación
4. Supabase retorna usuario + genera token JWT
5. Token guardado en localStorage
6. Redirect automático a app.html

**Validación de Sesión:**
1. app.html verifica token válido al cargar
2. Si token inválido/expirado → redirect a login.html
3. Token válido → carga aplicación normalmente

**Logout:**
1. Botón "Cerrar Sesión" limpia localStorage
2. Redirect automático a login.html

## Diseño Visual Profesional

### Sistema de Colores
```css
:root {
  --primary: #2563eb;      /* Azul profesional */
  --secondary: #64748b;    /* Gris slate */
  --success: #059669;      /* Verde éxito */
  --warning: #d97706;      /* Naranja alerta */
  --error: #dc2626;        /* Rojo error */
  --bg-light: #f8fafc;     /* Fondo claro */
  --bg-card: #ffffff;      /* Fondo cards */
  --text: #1e293b;         /* Texto principal */
  --text-muted: #64748b;   /* Texto secundario */
}
```

### Tipografía
- **Font principal:** `system-ui, -apple-system, sans-serif`
- **Escala:** 8px base (8, 16, 24, 32, 48)
- **Jerarquía:** H1(32px), H2(24px), H3(20px), Body(16px), Small(14px)

### Componentes Rediseñados

**Botones:**
- Rounded corners (8px border-radius)
- Estados hover/active/disabled
- Iconos SVG integrados
- Diferentes tamaños (small, medium, large)

**Inputs:**
- Border focus states con color primary
- Validación visual en tiempo real
- Labels flotantes para mejor UX
- Error states con mensajes claros

**Tabla de Horarios:**
- Headers fijos al hacer scroll
- Zebra striping para legibilidad
- Responsive: convierte en cards en móvil
- Sorting por fecha/día

**Cards y Containers:**
- Sombras sutiles (box-shadow)
- Bordes redondeados consistentes
- Padding interno consistente (16px, 24px)

### Responsividad Móvil

**Breakpoints:**
- Mobile: < 640px
- Tablet: 640px - 1024px  
- Desktop: > 1024px

**Layout Adaptativo:**
- **Desktop:** Sidebar + main content
- **Tablet:** Navigation horizontal + content
- **Mobile:** Stack vertical + hamburger menu

**Optimizaciones Táctiles:**
- Botones mínimo 44px para touch
- Inputs de tiempo con teclado numérico
- Gestos swipe para navegación de meses
- Spacing aumentado entre elementos clickeables

## Corrección de Problemas Técnicos

### Bugs de Fechas Solucionados

**Problema identificado:**
- Cálculo incorrecto de días de la semana
- Zona horaria inconsistente
- Array DIAS con índices incorrectos

**Solución implementada:**
```javascript
// Corrección del array de días
const DIAS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

// Función corregida para generar mes
function generarMes(year, month) {
    // Usar zona horaria local correcta
    const fecha = new Date(year, month - 1, dia);
    const diaSemana = fecha.getDay(); // 0=Domingo, 6=Sábado
    
    // Validación adicional
    if (diaSemana < 0 || diaSemana > 6) {
        console.error('Día de semana inválido:', diaSemana);
        return;
    }
}
```

### Sistema de Guardado Inteligente

**Funcionalidades nuevas:**

1. **Filtrado de datos:** Solo guardar filas con horarios reales
```javascript
function obtenerFilasConDatos() {
    return filas.filter(fila => 
        fila.entrada || fila.pausa || fila.reanudacion || fila.salida
    );
}
```

2. **Modal de confirmación:** 
   - Lista visual de días que se guardarán
   - Resumen: "3 días con cambios encontrados"
   - Botones: "Cancelar" / "Guardar cambios"

3. **Indicadores de estado:**
   - Visual "datos sin guardar" cuando hay cambios
   - Progress bar durante guardado
   - Mensajes de éxito/error específicos

4. **Validación de horarios:**
   - Entrada < Salida
   - Pausa entre Entrada y Salida
   - Reanudación después de Pausa
   - Alertas para horarios ilógicos

### Optimizaciones de Performance

**Base de datos:**
- Batch inserts optimizados
- Solo enviar registros modificados/nuevos
- Indices en campos fecha para consultas rápidas

**Frontend:**
- Lazy loading de meses no actuales
- Debounce en inputs para evitar cálculos excesivos
- Cache local de datos frecuentes

## Estructura de Archivos Final

```
/
├── login.html              # Página de autenticación
├── app.html               # Dashboard principal (ex-index.html)
├── scripts/               # Scripts SQL para BD
│   ├── create_usuarios.sql
│   └── update_fichajes.sql
├── js/
│   ├── auth.js           # Módulo de autenticación
│   ├── app.js            # Lógica principal mejorada
│   ├── components.js     # Componentes reutilizables
│   ├── utils.js          # Utilidades y helpers
│   ├── supabase.js       # Cliente Supabase
│   └── config.js         # Configuración
├── css/
│   ├── main.css          # Estilos principales
│   ├── components.css    # Estilos de componentes
│   └── responsive.css    # Media queries
└── docs/superpowers/specs/ # Documentación
    └── 2026-04-10-intranet-horario-renovacion-design.md
```

## Plan de Implementación

1. **Preparación:** Crear scripts SQL y estructura de archivos
2. **Autenticación:** Implementar sistema de login
3. **Diseño:** Aplicar nueva identidad visual
4. **Corrección bugs:** Solucionar problemas de fechas
5. **Guardado inteligente:** Implementar nuevo sistema
6. **Testing:** Pruebas en múltiples dispositivos
7. **Migración:** Deployment y migración de datos

## Criterios de Éxito

- ✅ Diseño moderno y profesional
- ✅ Login seguro con credenciales cifradas  
- ✅ Fechas calculadas correctamente
- ✅ Guardado solo de días con datos + confirmación
- ✅ Responsive perfecto en móviles
- ✅ Performance optimizada
- ✅ Código mantenible y modular

## Riesgos y Mitigaciones

**Riesgo:** Pérdida de datos durante migración
**Mitigación:** Backup completo antes de cambios + testing en copia

**Riesgo:** Problemas de compatibilidad móvil
**Mitigación:** Testing en dispositivos reales + progressive enhancement

**Riesgo:** Complejidad del nuevo sistema de auth
**Mitigación:** Implementación gradual + fallback a sistema anterior si falla