const express = require('express');

const app = express();

// Assign template variables to valid JS strings to prevent IDE syntax errors
const COMPONENT_ID = '${{ values.component_id }}';
const OWNER = '${{ values.owner }}';
const PORT = process.env.PORT || parseInt('${{ values.port }}', 10);

app.use(express.json());

// Healthcheck endpoint for Kubernetes probes & GitOps monitoring
app.get('/healthz', (req, res) => {
  res.json({
    status: 'healthy',
    service: COMPONENT_ID,
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (req, res) => {
  res.json({
    message: `Hello from ${COMPONENT_ID}! Managed via GitOps Nexus.`,
    owner: OWNER,
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[${COMPONENT_ID}] Listening on port ${PORT}`);
  });
}

module.exports = app;
