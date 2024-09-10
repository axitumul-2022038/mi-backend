const { Sequelize } = require('sequelize');

// Configuración de la base de datos
const sequelize = new Sequelize('dbz', 'dbz', 'goku', {
  host: '127.0.0.1',
  dialect: 'mysql',
  port: 3306,
  logging: false // Desactiva los logs de SQL en la consola (opcional)
});

module.exports = sequelize;
