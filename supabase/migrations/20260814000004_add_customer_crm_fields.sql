-- Migración: Agregar campos de CRM a la tabla customers
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS dni VARCHAR(50),
ADD COLUMN IF NOT EXISTS notes TEXT;
