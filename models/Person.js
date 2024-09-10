const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Definición del modelo Person
const Person = sequelize.define('Person', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false
  },
  poder: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  imagenUrl: {
    type: DataTypes.BLOB,
    allowNull: true
  },
  funcion: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  timestamps: false // Desactiva los campos createdAt y updatedAt
});


module.exports = Person;
