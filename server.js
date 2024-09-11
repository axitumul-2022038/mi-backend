const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const app = express();
const port = 3000;

// Configuración de middleware
app.use(cors());
app.use(bodyParser.json());

// Configuración de Multer para manejar archivos
const storage = multer.memoryStorage(); // Guarda archivos en memoria
const upload = multer({ storage: storage });

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

// Crear un nuevo personaje con imagen
app.post('/api/persons', upload.single('imagen'), (req, res) => {
  const { nombre, poder, funcion } = req.body;
  const imagen = req.file ? req.file.buffer : null;

  db.query('INSERT INTO People (nombre, poder, imagenUrl, funcion) VALUES (?, ?, ?, ?)', [nombre, poder, imagen, funcion], (err, results) => {
    if (err) {
      console.log('Error al insertar:', err);
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ id: results.insertId, nombre, poder, funcion });
  });
});

// Actualizar un personaje
app.put('/api/persons/:id', upload.single('imagen'), (req, res) => {
  const id = req.params.id;
  const { nombre, poder, funcion } = req.body;
  const imagen = req.file ? req.file.buffer : null;

  const query = 'UPDATE People SET nombre = ?, poder = ?, imagenUrl = ?, funcion = ? WHERE id = ?';
  db.query(query, [nombre, poder, imagen, funcion, id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ id, nombre, poder, funcion });
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


// Servir una imagen específica por ID
app.get('/api/persons/image/:id', (req, res) => {
  const id = req.params.id;
  db.query('SELECT imagenUrl FROM People WHERE id = ?', [id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: 'Personaje no encontrado' });
    }
    const imagen = results[0].imagenUrl;
    if (imagen) {
      res.set('Content-Type', 'image/jpeg'); // Ajusta según el formato de imagen
      res.send(Buffer.from(imagen, 'base64')); // Si la imagen está en base64
    } else {
      res.status(404).json({ error: 'Imagen no disponible' });
    }
  });
});
