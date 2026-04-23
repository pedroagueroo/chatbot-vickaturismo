const { getConfig: getConfigFromDB } = require('../models/BotConfig');
const logger = require('../utils/logger');

// Caché en memoria (ya que el usuario indicó no tener Redis local por ahora)
let memoryCache = {
  data: null,
  expiresAt: 0
};

const CACHE_TTL = 300 * 1000; // 5 minutos en milisegundos

async function getConfig() {
  const now = Date.now();
  if (memoryCache.data && memoryCache.expiresAt > now) {
    return memoryCache.data;
  }

  // Si no está en caché o expiró, buscar en DB
  try {
    const config = await getConfigFromDB();
    memoryCache.data = config;
    memoryCache.expiresAt = now + CACHE_TTL;
    return config;
  } catch (error) {
    logger.error('Error fetching config from DB', error);
    return {};
  }
}

function isBusinessHours(config) {
  const now = new Date(); // Asume que el servidor corre en el huso horario local (ej: Argentina)
  const day = ['sun','mon','tue','wed','thu','fri','sat'][now.getDay()];
  const hours = config.business_hours?.[day];
  
  // Si no hay horario definido, asumimos siempre abierto
  if (!hours || !hours.open || !hours.close) return true;

  const [openH, openM]   = hours.open.split(':').map(Number);
  const [closeH, closeM] = hours.close.split(':').map(Number);
  const currentMins = now.getHours() * 60 + now.getMinutes();
  const openMins    = openH * 60 + (openM || 0);
  const closeMins   = closeH * 60 + (closeM || 0);

  return currentMins >= openMins && currentMins <= closeMins;
}

function invalidateCache() {
  memoryCache.data = null;
  memoryCache.expiresAt = 0;
}

module.exports = { getConfig, isBusinessHours, invalidateCache };
