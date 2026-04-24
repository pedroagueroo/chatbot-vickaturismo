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
  // Para pruebas en desarrollo, siempre estamos abiertos
  return true;
}

function invalidateCache() {
  memoryCache.data = null;
  memoryCache.expiresAt = 0;
}

module.exports = { getConfig, isBusinessHours, invalidateCache };
