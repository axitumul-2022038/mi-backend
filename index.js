const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const sequelize = require('./config/database');
const personRoutes = require('./Routes/personRoutes');

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Sincronizar modelos y arrancar servidor
sequelize.sync().then(() => {
  app.use('/api', personRoutes);
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}).catch(error => console.log('Error al sincronizar la base de datos:', error));
