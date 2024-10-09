const express = require('express');
const mysql = require('mysql2');
require('dotenv').config();
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const encryptC = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 3000; // Cambia a PORT en Railway

// Configuración de middleware
app.use(cors());
app.use(bodyParser.json());

// Configuración de Multer para manejar archivos
const storage = multer.memoryStorage(); // Guarda archivos en memoria
const upload = multer({ storage: storage });

// Configuración de la base de datos
const db = mysql.createConnection(process.env.MYSQL_PUBLIC_URL);

db.connect(err => {
  if (err) {
    console.error('Error conectando a la base de datos:', err);
    return;
  }
  console.log('Conectado a la base de datos MySQL');
});

// Ejemplo de ruta
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
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

// Obtener solo un personaje
app.get('/api/persons/:id', (req, res) => {
  const id = req.params.id; // Faltaba obtener el id del req.params
  db.query('SELECT * FROM People WHERE id = ?', [id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: 'Personaje no encontrado' });
    }
    res.json(results[0]); // Enviar solo el primer resultado
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

// Servir una imagen específica en base64
app.get('/api/persons/image64/:id', (req, res) => {
  const id = req.params.id;
  db.query('SELECT imagenUrl FROM People WHERE id = ?', [id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: 'Personaje no encontrado' });
    }
    const imagen = results[0].imagenUrl; // Aquí se obtiene el BLOB
    if (imagen) {
      // Convierte el buffer en base64
      const imagenBase64 = Buffer.from(imagen).toString('base64');
      res.json({ imagenUrl: imagenBase64 });
    } else {
      res.status(404).json({ error: 'Imagen no disponible' });
    }
  });
});

//Servir todas las imagene específicas en base64
app.get('/api/persons/image64', (req, res) => {
  db.query('SELECT imagenUrl FROM People', (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (results.length > 0) {
      // Mapear sobre los resultados para convertir cada imagen en base64
      const imagenesBase64 = results.map((row) => {
        const imagen = row.imagenUrl;
        return imagen ? Buffer.from(imagen).toString('base64') : null;
      });

      res.json({ imagenes: imagenesBase64 });
    } else {
      res.status(404).json({ error: 'No hay imágenes disponibles' });
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
      const token = jwt.sign({ id: user.id, usuario: user.usuario, admin: user.administrador }, SECRET_KEY, { expiresIn: '1hr' });
      res.json({ token, usuario: user.usuario });
    });
  });
});

