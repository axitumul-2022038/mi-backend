const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = 3000;

// Configuración de middleware
app.use(cors());
app.use(bodyParser.json());
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// Configuración de la base de datos
const db = mysql.createConnection({
  host: '127.0.0.1',
  user: 'dbz',
  password: 'goku',
  database: 'dbz'
});

db.connect(err => {
  if (err) {
    console.error('Error conectando a la base de datos:', err);
    return;
  }
  console.log('Conectado a la base de datos MySQL');
});

// Rutas CRUD

// Obtener todos los personajes
app.get('/api/persons', (req, res) => {
  db.query('SELECT * FROM People', (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// Crear un nuevo personaje
app.post('/api/persons', (req, res) => {
  const { nombre, poder, imagenUrl, funcion } = req.body;
  console.log('Datos recibidos:', { nombre, poder, imagenUrl, funcion });

  db.query('INSERT INTO People (nombre, poder, imagenUrl, funcion) VALUES (?, ?, ?, ?)', [nombre, poder, imagenUrl, funcion], (err, results) => {
    if (err) {
      console.log('Error al insertar:', err);
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ id: results.insertId, nombre, poder, imagenUrl, funcion });
  });
});


// Actualizar un personaje
app.put('/api/persons/:id', (req, res) => {
  const id = req.params.id;
  const { nombre, poder, imagenUrl, funcion } = req.body;
  const query = 'UPDATE People SET nombre = ?, poder = ?, imagenUrl = ?, funcion = ? WHERE id = ?';
  db.query(query, [nombre, poder, imagenUrl, funcion, id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });

    }
    res.json({ id, nombre, poder, imagenUrl, funcion });
  });
});

// Eliminar un personaje
app.delete('/api/persons/:id', (req, res) => {
  const id = req.params.id;
  db.query('DELETE FROM People WHERE id = ?', [id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(204).end();
  });
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
