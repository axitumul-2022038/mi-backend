const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const encryptC = require('bcrypt');

const app = express();
const port = 3000;
const jwt = require('jsonwebtoken');

// Replace 'your_secret_key' with a strong secret key
const SECRET_KEY = 'LLAVE_SECRETA_USUARIOS';

// Configuración de middleware
app.use(cors());
app.use(bodyParser.json());

// Configuración de Multer para manejar archivos
const storage = multer.memoryStorage(); // Guarda archivos en memoria
const upload = multer({ storage: storage });

// Configuración de la base de datos
const db = mysql.createConnection({
  host: '127.0.0.1',
  user: 'users',
  password: 'users',
  database: 'users'
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
  const { nombre, usuario, contrasenia } = req.body;

  // Encriptar la contraseña
  encryptC.hash(contrasenia, 10, (err, hashedPassword) => {
    if (err) {
      return res.status(500).json({ error: 'Error al encriptar la contraseña' });
    }

    const administrador = false;
    const imagen = req.file ? req.file.buffer : null;

    db.query('INSERT INTO People (nombre, usuario, imagenUrl, contrasenia, administrador) VALUES (?, ?, ?, ?, ?)', 
      [nombre, usuario, imagen, hashedPassword, administrador], 
      (err, results) => {
        if (err) {
          console.log('Error al insertar:', err);
          return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ id: results.insertId, nombre, usuario });
      }
    );
  });
});

// Actualizar un personaje
app.put('/api/persons/:id', upload.single('imagen'), (req, res) => {
  const id = req.params.id;
  const { nombre, usuario, contraseniaU, administrador } = req.body;

  const updates = { nombre, usuario, administrador };
  const values = [];

  if (contraseniaU) {
    encryptC.hash(contraseniaU, 10, (err, hashedPasswordU) => {
      if (err) {
        return res.status(500).json({ error: 'Error al encriptar la contraseña' });
      }
      values.push(updates.nombre, updates.usuario, updates.administrador, id);
      const query = 'UPDATE People SET nombre = ?, usuario = ?,  administrador = ? WHERE id = ?';
      db.query(query, values, (err, results) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json({ id, ...updates });
      });
    });
  } else {
    values.push(updates.nombre, updates.usuario, updates.administrador, id);
    const query = 'UPDATE People SET nombre = ?, usuario = ?, administrador = ? WHERE id = ?';
    db.query(query, values, (err, results) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ id, ...updates });
    });
  }
});

// Actualizar Contraseña
app.put('/api/persons/password/:id', (req, res) => {
  const id = req.params.id;
  const { contraseniaAntigua, contraseniaU } = req.body;

  if (!contraseniaAntigua || !contraseniaU) {
    console.log('Contrasena antigua o nueva faltante:', { contraseniaAntigua, contraseniaU });
    return res.status(400).json({ error: 'Se requieren ambas contraseñas' });
}

  // Primero, obtenemos la contraseña actual del usuario
  const queryGetPassword = 'SELECT contrasenia FROM People WHERE id = ?';
  db.query(queryGetPassword, [id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const hashedPassword = results[0].contrasenia;

    // Verificar la contraseña antigua
    encryptC.compare(contraseniaAntigua, hashedPassword, (err, isMatch) => {
      if (err) {
        return res.status(500).json({ error: 'Error al verificar la contraseña' });
      }
      if (!isMatch) {
        return res.status(401).json({ error: 'La contraseña antigua es incorrecta' });
      }

      // Encriptar la nueva contraseña
      encryptC.hash(contraseniaU, 10, (err, hashedPasswordU) => {
        if (err) {
          return res.status(500).json({ error: 'Error al encriptar la nueva contraseña' });
        }

        // Actualizar la contraseña en la base de datos
        const queryUpdatePassword = 'UPDATE People SET contrasenia = ? WHERE id = ?';
        db.query(queryUpdatePassword, [hashedPasswordU, id], (err, results) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          res.json({ message: 'Contraseña actualizada con éxito' });
        });
      });
    });
  });
});

// Actualizar la imagen de un personaje
app.put('/api/persons/image/:id', upload.single('imagen'), (req, res) => {
  const id = req.params.id;
  const imagen = req.file ? req.file.buffer : null;

  const query = 'UPDATE People SET imagenUrl = ? WHERE id = ?';
  db.query(query, [imagen, id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ id});
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


// Login
app.post('/api/login', (req, res) => {
  const { usuario, contrasenia } = req.body;

  db.query('SELECT * FROM People WHERE usuario = ?', [usuario], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

    const user = results[0];

    encryptC.compare(contrasenia, user.contrasenia, (err, isMatch) => {
      if (err) return res.status(500).json({ error: 'Error al verificar la contraseña' });
      if (!isMatch) return res.status(401).json({ error: 'Contraseña incorrecta' });

      // Generate a token
      const token = jwt.sign({ id: user.id, usuario: user.usuario, admin: user.administrador }, SECRET_KEY, { expiresIn: '1h' });
      res.json({ token, usuario: user.usuario });
    });
  });
});

