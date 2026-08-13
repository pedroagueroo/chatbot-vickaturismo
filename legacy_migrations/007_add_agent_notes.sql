-- Agregar columna de notas del agente y nombre del usuario si no existen
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS agent_notes TEXT;
