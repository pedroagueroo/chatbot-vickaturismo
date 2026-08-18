-- Script para unificar conversaciones duplicadas del mismo cliente

WITH duplicadas AS (
  SELECT id, customer_id, created_at, status
  FROM conversations
  WHERE customer_id IN (
    SELECT customer_id 
    FROM conversations 
    GROUP BY customer_id 
    HAVING COUNT(*) > 1
  )
),
principal AS (
  -- Elegimos la más antigua como principal
  SELECT DISTINCT ON (customer_id) id as main_id, customer_id
  FROM duplicadas
  ORDER BY customer_id, created_at ASC
)
-- 1. Actualizamos todos los mensajes para que apunten a la conversación principal
UPDATE messages
SET conversation_id = p.main_id
FROM duplicadas d
JOIN principal p ON d.customer_id = p.customer_id
WHERE messages.conversation_id = d.id AND d.id != p.main_id;

-- 2. Aseguramos que si la duplicada estaba escalada, la principal herede el estado
WITH duplicadas AS (
  SELECT id, customer_id, created_at, status
  FROM conversations
  WHERE customer_id IN (
    SELECT customer_id 
    FROM conversations 
    GROUP BY customer_id 
    HAVING COUNT(*) > 1
  )
),
principal AS (
  SELECT DISTINCT ON (customer_id) id as main_id, customer_id
  FROM duplicadas
  ORDER BY customer_id, created_at ASC
)
UPDATE conversations c
SET status = 'escalated'
FROM duplicadas d
JOIN principal p ON d.customer_id = p.customer_id
WHERE c.id = p.main_id AND d.id != p.main_id AND d.status = 'escalated';

-- 3. Borramos las conversaciones duplicadas vacías
WITH duplicadas AS (
  SELECT id, customer_id, created_at, status
  FROM conversations
  WHERE customer_id IN (
    SELECT customer_id 
    FROM conversations 
    GROUP BY customer_id 
    HAVING COUNT(*) > 1
  )
),
principal AS (
  SELECT DISTINCT ON (customer_id) id as main_id, customer_id
  FROM duplicadas
  ORDER BY customer_id, created_at ASC
)
DELETE FROM conversations
USING duplicadas d
JOIN principal p ON d.customer_id = p.customer_id
WHERE conversations.id = d.id AND d.id != p.main_id;
