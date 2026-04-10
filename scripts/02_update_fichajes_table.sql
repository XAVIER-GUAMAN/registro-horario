-- Add usuario_id column to fichajes table if it doesn't exist
ALTER TABLE IF EXISTS fichajes
ADD COLUMN IF NOT EXISTS usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_fichajes_usuario_id ON fichajes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_fichajes_fecha ON fichajes(fecha);
CREATE INDEX IF NOT EXISTS idx_fichajes_usuario_fecha ON fichajes(usuario_id, fecha);

-- Create validation trigger function
CREATE OR REPLACE FUNCTION validate_fichaje()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate that entrada and salida are logically sound
  IF NEW.entrada IS NOT NULL AND NEW.salida IS NOT NULL THEN
    IF NEW.entrada > NEW.salida THEN
      RAISE EXCEPTION 'La entrada no puede ser posterior a la salida';
    END IF;
  END IF;

  -- Validate that both entrada and salida are on the same day
  IF NEW.entrada IS NOT NULL AND NEW.salida IS NOT NULL THEN
    IF DATE(NEW.entrada) != DATE(NEW.salida) THEN
      RAISE EXCEPTION 'La entrada y salida deben estar en el mismo día';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to fichajes table
DROP TRIGGER IF EXISTS trg_validate_fichaje ON fichajes;
CREATE TRIGGER trg_validate_fichaje
BEFORE INSERT OR UPDATE ON fichajes
FOR EACH ROW
EXECUTE FUNCTION validate_fichaje();
