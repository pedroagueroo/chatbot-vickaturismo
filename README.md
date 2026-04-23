# Chat Bot Vicka Turismo

Sistema de chatbot omnicanal con Inteligencia Artificial diseñado para agencias de viajes. Integrado con las APIs de WhatsApp Business, Facebook Messenger e Instagram, procesando la lógica y las conversaciones con la IA de Claude (Anthropic).

## Arquitectura

- **Node.js + Express**: Webhooks de alta performance para Meta.
- **PostgreSQL**: Persistencia de conversaciones, configuración dinámica y respuestas predefinidas (FAQs).
- **Claude AI (Anthropic)**: Detección inteligente de intención de usuarios y generación contextualizada de respuestas basadas en historial.
- **JWT**: Panel de administración protegido.

## Requisitos Previos

- [Node.js](https://nodejs.org/en/) (v20 o superior recomendado)
- [PostgreSQL](https://www.postgresql.org/) corriendo localmente (o en la nube)
- Cuenta en Meta for Developers con accesos a WhatsApp/Messenger/Instagram API
- Cuenta en Anthropic (API Key válida)

## Configuración Local

1. Clonar el repositorio.
2. Instalar dependencias:
   ```bash
   npm install
   ```
3. Renombrar el archivo `.env.example` a `.env` y completar los valores requeridos.
4. Crear la base de datos en PostgreSQL (ej. `vicka_bot`).
5. Ejecutar las migraciones para crear la estructura de tablas y cargar los datos semilla de prueba:
   ```bash
   npm run migrate
   ```
6. Iniciar el servidor en modo desarrollo:
   ```bash
   npm run dev
   ```

## Estructura del Proyecto

- `src/webhooks`: Enrutador principal de eventos desde Meta.
- `src/channels`: Controladores específicos y senders para cada plataforma (WhatsApp, Instagram, FB Messenger).
- `src/core`: Lógica de procesamiento central, detección de intención (Claude), generación de respuestas (Claude) y escalamiento a humanos.
- `src/models`: Interacción directa con PostgreSQL (Pool).
- `src/admin`: Rutas del panel administrativo protegido por JWT.

## Testing

Existe un archivo de simulación en `src/utils/testConversations.js` que se puede ejecutar localmente para probar el procesamiento de la IA sin necesidad de conectar Meta aún. Descomentá la llamada al final del archivo y ejecutalo con Node.

---
*Este proyecto está preparado para hacer deploy continuo en plataformas modernas como Vercel o Railway.*
