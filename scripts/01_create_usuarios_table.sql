-- Create usuarios table for authentication system
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ultimo_acceso TIMESTAMP,
  CONSTRAINT email_validation CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

-- Create indexes for performance
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_fecha_creacion ON usuarios(fecha_creacion);

-- Default admin user (password must be set securely during deployment)
-- Password hash created with bcrypt (cost 12)
INSERT INTO usuarios (email, password_hash, nombre)
VALUES (
  'admin@example.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/HyXqNqaOrGhvgJGFO',
  'Administrador'
)
ON CONFLICT (email) DO NOTHING;
