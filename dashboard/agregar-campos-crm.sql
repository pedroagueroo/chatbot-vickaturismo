-- Script para agregar campos de CRM (Email, DNI, Notas) a la tabla customers
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS dni VARCHAR(50),
ADD COLUMN IF NOT EXISTS notes TEXT;
