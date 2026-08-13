-- Seed Data para el primer cliente: Vicka Turismo

DO $$
DECLARE
  v_business_id UUID;
BEGIN
  -- Insertar o recuperar el negocio Vicka Turismo
  INSERT INTO businesses (name, status)
  VALUES ('Vicka Turismo', 'active')
  RETURNING id INTO v_business_id;

  -- Configuración inicial del Bot de Vicka Turismo
  INSERT INTO bot_config (
    business_id, agency_name, welcome_msg, out_of_hours_msg, business_hours, contact_info, bot_personality, escalation_keywords
  ) VALUES (
    v_business_id,
    'Vicka Turismo',
    '¡Hola! Soy el asistente virtual de Vicka Turismo. ¿En qué puedo ayudarte a planear tu próximo viaje?',
    'En este momento estamos fuera de nuestro horario de atención. Dejanos tu mensaje y un agente te contactará a la brevedad.',
    '{"mon":{"open":"09:00","close":"18:00"},"tue":{"open":"09:00","close":"18:00"},"wed":{"open":"09:00","close":"18:00"},"thu":{"open":"09:00","close":"18:00"},"fri":{"open":"09:00","close":"18:00"},"sat":{"open":"09:00","close":"13:00"}}',
    '{"phone":"+54 9 223 425-4253", "email":"contacto@vickaturismo.tur.ar"}',
    'Sos amigable, hablas en español rioplatense (voseo) y sos un experto en turismo apasionado por recomendar destinos increíbles. Tratas de generar interés y cerrar ventas.',
    ARRAY['hablar con alguien', 'agente', 'persona', 'humano', 'asesor', 'llamar']
  );

  -- FAQs iniciales de Vicka Turismo
  INSERT INTO faqs (business_id, question, answer, category) VALUES
  (v_business_id, '¿Cuáles son los medios de pago?', 'Aceptamos transferencias bancarias, tarjetas de crédito (Visa, Mastercard, Amex) con posibilidad de cuotas fijas, y pagos en dólares billete.', 'Pagos'),
  (v_business_id, '¿Qué pasa si tengo que cancelar mi viaje?', 'La política de cancelación depende del paquete contratado y de los proveedores involucrados (aerolíneas, hoteles). En general, las tarifas promocionales no son reembolsables. Siempre recomendamos contratar un seguro de cancelación.', 'Políticas'),
  (v_business_id, '¿Qué documentación necesito para viajar a Brasil?', 'Para ciudadanos argentinos, solo necesitás tu DNI tarjeta vigente y en buen estado. Si viajás con menores, necesitás la partida de nacimiento y la autorización de viaje si no viajan ambos padres.', 'Documentación'),
  (v_business_id, '¿Tienen seguro de viaje?', 'Sí, trabajamos con Assist Card y Universal Assistance. Te recomendamos fuertemente incluirlos en tu paquete para viajar tranquilo.', 'Seguros'),
  (v_business_id, '¿Arman viajes grupales o salidas acompañadas?', '¡Sí! Tenemos salidas grupales acompañadas desde Buenos Aires a destinos como Europa, Medio Oriente, Caribe y el Norte Argentino. Consultá las próximas fechas disponibles.', 'Grupos');

END $$;
