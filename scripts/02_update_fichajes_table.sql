-- Add usuario_id column to fichajes table if it doesn't exist
ALTER TABLE IF EXISTS fichajes
ADD COLUMN IF NOT EXISTS usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_fichajes_usuario_id ON fichajes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_fichajes_fecha ON fichajes(fecha);
CREATE INDEX IF NOT EXISTS idx_fichajes_usuario_fecha ON fichajes(usuario_id, fecha);

-- Create validation trigger function
CREATE OR REPLACE FUNCTION validate_fichaje()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate time sequence: entrada < pausa < reanudacion < salida
  IF NEW.entrada IS NOT NULL AND NEW.pausa IS NOT NULL THEN
    IF NEW.entrada >= NEW.pausa THEN
      RAISE EXCEPTION 'La hora de entrada debe ser anterior a la hora de pausa';
    END IF;
  END IF;

  IF NEW.pausa IS NOT NULL AND NEW.reanudacion IS NOT NULL THEN
    IF NEW.pausa >= NEW.reanudacion THEN
      RAISE EXCEPTION 'La hora de pausa debe ser anterior a la hora de reanudación';
    END IF;
  END IF;

  IF NEW.reanudacion IS NOT NULL AND NEW.salida IS NOT NULL THEN
    IF NEW.reanudacion >= NEW.salida THEN
      RAISE EXCEPTION 'La hora de reanudación debe ser anterior a la hora de salida';
    END IF;
  END IF;

  -- Validate that entrada and salida are logically sound
  IF NEW.entrada IS NOT NULL AND NEW.salida IS NOT NULL THEN
    IF NEW.entrada >= NEW.salida THEN
      RAISE EXCEPTION 'La entrada debe ser anterior a la salida';
    END IF;
  END IF;

  -- Validate that all times are on the same day
  IF NEW.entrada IS NOT NULL AND NEW.salida IS NOT NULL THEN
    IF DATE(NEW.entrada) != DATE(NEW.salida) THEN
      RAISE EXCEPTION 'La entrada y salida deben estar en el mismo día';
    END IF;
  END IF;

  IF NEW.entrada IS NOT NULL AND NEW.pausa IS NOT NULL THEN
    IF DATE(NEW.entrada) != DATE(NEW.pausa) THEN
      RAISE EXCEPTION 'La entrada y pausa deben estar en el mismo día';
    END IF;
  END IF;

  IF NEW.entrada IS NOT NULL AND NEW.reanudacion IS NOT NULL THEN
    IF DATE(NEW.entrada) != DATE(NEW.reanudacion) THEN
      RAISE EXCEPTION 'La entrada y reanudación deben estar en el mismo día';
    END IF;
  END IF;

  -- Validate reasonable time ranges (0-24 hours)
  IF NEW.entrada IS NOT NULL THEN
    IF EXTRACT(HOUR FROM NEW.entrada) < 0 OR EXTRACT(HOUR FROM NEW.entrada) > 23 THEN
      RAISE EXCEPTION 'La hora de entrada debe estar entre 00:00 y 23:59';
    END IF;
  END IF;

  IF NEW.salida IS NOT NULL THEN
    IF EXTRACT(HOUR FROM NEW.salida) < 0 OR EXTRACT(HOUR FROM NEW.salida) > 23 THEN
      RAISE EXCEPTION 'La hora de salida debe estar entre 00:00 y 23:59';
    END IF;
  END IF;

  IF NEW.pausa IS NOT NULL THEN
    IF EXTRACT(HOUR FROM NEW.pausa) < 0 OR EXTRACT(HOUR FROM NEW.pausa) > 23 THEN
      RAISE EXCEPTION 'La hora de pausa debe estar entre 00:00 y 23:59';
    END IF;
  END IF;

  IF NEW.reanudacion IS NOT NULL THEN
    IF EXTRACT(HOUR FROM NEW.reanudacion) < 0 OR EXTRACT(HOUR FROM NEW.reanudacion) > 23 THEN
      RAISE EXCEPTION 'La hora de reanudación debe estar entre 00:00 y 23:59';
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
