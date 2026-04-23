require('dotenv').config();
const express = require('express');
const webhookRoutes = require('./src/webhooks');
const adminRoutes = require('./src/admin/routes');
const { connectDB } = require('./src/config/database');
const logger = require('./src/utils/logger');

const app = express();
app.use(express.json());

app.use('/webhook', webhookRoutes);
app.use('/admin', adminRoutes);
app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;

(async () => {
  try {
    await connectDB();
    app.listen(PORT, () => logger.info(`Vicka Bot running on port ${PORT}`));
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
})();
