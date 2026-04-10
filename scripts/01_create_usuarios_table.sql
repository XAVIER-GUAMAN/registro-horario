-- Create usuarios table for authentication system
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  salt VARCHAR(255) NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ultimo_acceso TIMESTAMP,
  CONSTRAINT email_validation CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

-- Create indexes for performance
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_fecha_creacion ON usuarios(fecha_creacion);

-- Insert default admin user (email: admin@example.com, password: admin123)
-- Password hash created with bcrypt (cost 10)
INSERT INTO usuarios (email, password_hash, salt, nombre)
VALUES (
  'admin@example.com',
  '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36yY5e5a',
  '$2b$10$N9qo8uLOickgx2ZMRZoMye',
  'Administrador'
)
ON CONFLICT (email) DO NOTHING;
