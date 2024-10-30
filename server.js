const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const encryptC = require('bcrypt');
const nodemailer = require('nodemailer');

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

// Conexión a la base de datos
db.connect(err => {
  if (err) {
    console.error('Error conectando a la base de datos:', err);
    return;
  }
  console.log('Conectado a la base de datos MySQL');
});

// Configuración del transportador de correo
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'contactodeusuarios@gmail.com', // Correo desde el que se enviará
    pass: 'Contacto2024',       // Contraseña de la cuenta
  },
});

// Ruta para enviar correo
app.post('/api/send-email', (req, res) => {
  const userEmail = req.body.email;
  const mailOptions = {
    from: 'contactodeusuarios@gmail.com',
    to: userEmail,  // Correo al que se enviará
    subject: 'Gracias por contactarnos',
    text: 'Nos pondremos en contacto contigo en breve.',
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return res.status(500).send({ message: 'Error al enviar el correo', error: error });
    }
    res.status(200).send({ message: 'Correo enviado con éxito' });
  });
});

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

    db.query(
      'INSERT INTO People (nombre, usuario, imagenUrl, contrasenia, administrador) VALUES (?, ?, ?, ?, ?)', 
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

// Hacer admin

app.put('/api/persons/admin/:id', (req, res) => {
  const id = req.params.id;

  const query = 'UPDATE People SET administrador = true WHERE id = ?';
  
  db.query(query, [id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (results.affectedRows === 0) {
      return res.status(404).json({ message: 'Persona no encontrada' });
    }

    res.json({ message: 'Administrador actualizado exitosamente', id });
  });
});



// ------------------------------------------------------------------------ Solicitudes ---------------------------------------------------------------------------
//todas la solis
app.get('/api/solicitudes', (req, res) => {
  db.query('SELECT * FROM SolicitudesAdm', (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});
 // solis pendientes
app.get('/api/solicitudes/pendientes', (req, res) => {
  db.query('SELECT * FROM SolicitudesAdm WHERE estadoSolicitud = "pendiente"', (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

//solis aceptadas
app.get('/api/solicitudes/aceptadas', (req, res) => {
  db.query('SELECT * FROM SolicitudesAdm WHERE estadoSolicitud = "aceptado"', (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// solis rechazadas
app.get('/api/solicitudes/rechazadas', (req, res) => {
  db.query('SELECT * FROM SolicitudesAdm WHERE estadoSolicitud = "rechazado"', (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

//mandar solis
app.post('/api/solicitudes/:id', (req, res)=> {
  const usuarioId = req.params.id;
  const query = 'INSERT INTO SolicitudesAdm (idusuario, solicitudAdmin, estadoSolicitud) VALUES (?, ?, ?)';
  
  db.query(query, [usuarioId, true, 'pendiente'], (err, results)=>{
    if(err){
      return res.status(500).json({error: err.message, message: 'No se pueden hacer varias solicitudes el mismo día'});
    }

    if(results.affectedRows === 0){
      return res.status(404).json({message: 'Usuario no encontrado'});
    }

    res.json({message: 'Solicitud agregada exitosamente'})
  })
})

// Aceptar solicitudes
app.put('/api/solicitudes/:id', (req, res) => {
  const solicitudId = req.params.id;
  const { idUsuarioResponsable } = req.body; // Asumimos que envías el ID del usuario responsable en el cuerpo

  // Asegúrate de que se envíe el ID del usuario responsable
  if (!idUsuarioResponsable) {
    return res.status(400).json({ message: 'El ID del usuario responsable es requerido.' });
  }

  const query = 'UPDATE SolicitudesAdm SET estadoSolicitud = ?, idUsuarioResponsable = ?, fechaRespuesta = NOW() WHERE id = ?';

  db.query(query, ['aceptado', idUsuarioResponsable, solicitudId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (results.affectedRows === 0) {
      return res.status(404).json({ message: 'Solicitud no encontrada' });
    }

    res.json({ message: 'Solicitud actualizada exitosamente' });
  });
});


//rechazar solis
app.put('/api/rechazarsolicitudes/:id', (req, res) => {
  const solicitudId = req.params.id;
  const { idUsuarioResponsable } = req.body; // Asumimos que envías el ID del usuario responsable en el cuerpo

  // Asegúrate de que se envíe el ID del usuario responsable
  if (!idUsuarioResponsable) {
    return res.status(400).json({ message: 'El ID del usuario responsable es requerido.' });
  }

  const query = 'UPDATE SolicitudesAdm SET estadoSolicitud = ?, idUsuarioResponsable = ?, fechaRespuesta = NOW() WHERE id = ?';

  db.query(query, ['rechazado', idUsuarioResponsable, solicitudId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (results.affectedRows === 0) {
      return res.status(404).json({ message: 'Solicitud no encontrada' });
    }

    res.json({ message: 'Solicitud actualizada exitosamente' });
  });
});

// motivo rechazo
app.post('/api/rechazosolicitudes', (req, res) => {
  const { idSolicitud, motivoRechazo, idUsuarioResponsable } = req.body;

  const query = 'INSERT INTO RechazoSolicitudes (idSolicitud, motivoRechazo, idUsuarioResponsable) VALUES (?, ?, ?)';

  db.query(query, [idSolicitud, motivoRechazo, idUsuarioResponsable], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.status(201).json({ message: 'Motivo de rechazo registrado exitosamente', id: results.insertId });
  });
});

app.get('/api/solicitudes/obtenerusuario/:id', (req, res) => {
  const idusuario = req.params.id;

  // Consulta para obtener las solicitudes del usuario junto con el motivo de rechazo
  const query = `
    SELECT 
      s.*, 
      r.motivoRechazo 
    FROM 
      SolicitudesAdm s 
    LEFT JOIN 
      RechazoSolicitudes r 
    ON 
      s.id = r.idSolicitud 
    WHERE 
      s.idusuario = ?
  `;

  db.query(query, [idusuario], (error, results) => {
    if (error) {
      console.error('Error al obtener las solicitudes:', error);
      return res.status(500).json({ message: 'Error en el servidor' });
    }

    // Devuelve las solicitudes al cliente
    return res.status(200).json(results);
  });
});


// ----------------------------------- Otros tipos de solicitudes -------------------------------------------------------

app.post('/api/solicitudes/otras/:id', (req, res) => {
  const idusuario = req.params.id;
  const { asunto, descripcion } = req.body;

  if (!asunto || !descripcion) {
    return res.status(400).json({ message: 'Asunto y descripción son requeridos.' });
  }

  const query = 'INSERT INTO SolicitudesInfo (idUsuario, asunto, descripcion) VALUES (?, ?, ?)';

  db.query(query, [idusuario, asunto, descripcion], (error, results) => {
    if (error) {
      console.error('Error al realizar una solicitud', error);
      return res.status(500).json({ message: 'Error con el servidor' });
    }

    return res.status(200).json({ message: 'Solicitud creada exitosamente', solicitudId: results.insertId });
  });
});


// Ruta para que el Administrador responda a una solicitud
app.post('/api/solicitudes/respuestas/admin/:idSolicitud', upload.single('archivo'), (req, res) => {
  const idSolicitud = req.params.idSolicitud;
  const { idRemitente, mensaje } = req.body; // Obtener idRemitente desde el cuerpo de la solicitud
  const archivo = req.file ? req.file.buffer : null;
  const tipoArchivo = req.file ? req.file.mimetype : null;

  // Insertar la respuesta en la tabla RespuestasSolicitudes
  const queryRespuesta = 'INSERT INTO RespuestasSolicitudes (idSolicitud, idRemitente, mensaje, archivo, tipoArchivo) VALUES (?, ?, ?, ?, ?)';
  db.query(queryRespuesta, [idSolicitud, idRemitente, mensaje, archivo, tipoArchivo], (err) => {
    if (err) {
      return res.status(500).json({ message: 'Error al insertar la respuesta del administrador', error: err });
    }

    // Actualizar el estado de la solicitud a respondida por el Admin
    const queryActualizarEstado = 'UPDATE SolicitudesInfo SET estadoSolicitudAdmin = "respondidaAdmin", idUsuarioResponsable = ?, fechaRespuesta = NOW() WHERE id = ?';
    db.query(queryActualizarEstado, [idRemitente, idSolicitud], (error) => {
      if (error) {
        return res.status(500).json({ message: 'Error al actualizar el estado de la solicitud', error });
      }

      return res.status(200).json({ message: 'Respuesta del administrador enviada y estado actualizado' });
    });
  });
});

// Ruta para que el Usuario responda a una solicitud
app.post('/api/solicitudes/respuestas/usuario/:idSolicitud', upload.single('archivo'), (req, res) => {
  const idSolicitud = req.params.idSolicitud;
  const { idRemitente, mensaje } = req.body; // Obtener idRemitente desde el cuerpo de la solicitud
  const archivo = req.file ? req.file.buffer : null;
  const tipoArchivo = req.file ? req.file.mimetype : null;

  // Insertar la respuesta en la tabla RespuestasSolicitudes
  const queryRespuesta = 'INSERT INTO RespuestasSolicitudes (idSolicitud, idRemitente, mensaje, archivo, tipoArchivo) VALUES (?, ?, ?, ?, ?)';
  db.query(queryRespuesta, [idSolicitud, idRemitente, mensaje, archivo, tipoArchivo], (err) => {
    if (err) {
      return res.status(500).json({ message: 'Error al insertar la respuesta del usuario', error: err });
    }

    // Actualizar el estado de la solicitud a respondida por el Usuario
    const queryActualizarEstado = 'UPDATE SolicitudesInfo SET estadoSolicitudUser = "respondidaUser", fechaRespuesta = NOW() WHERE id = ?';
    db.query(queryActualizarEstado, [idSolicitud], (error) => {
      if (error) {
        return res.status(500).json({ message: 'Error al actualizar el estado de la solicitud', error });
      }

      return res.status(200).json({ message: 'Respuesta del usuario enviada y estado actualizado' });
    });
  });
});


// Ruta para obtener todas las solicitudes con sus respuestas
app.get('/api/solicitudesOtras', (req, res) => {
  const querySolicitudes = `
    SELECT 
  s.id, 
  s.asunto, 
  s.descripcion, 
  s.estadoSolicitudAdmin, 
  s.estadoSolicitudUser,
  rAdmin.id AS idRespuestaAdmin,          -- Obtener el id de la respuesta del administrador
  rAdmin.mensaje AS respuestaAdmin, 
  rAdmin.archivo AS archivoAdmin, 
  rUsuario.id AS idRespuestaUsuario,       -- Obtener el id de la respuesta del usuario
  rUsuario.mensaje AS respuestaUsuario, 
  rUsuario.archivo AS archivoUsuario
FROM SolicitudesInfo s
LEFT JOIN RespuestasSolicitudes rAdmin 
  ON s.id = rAdmin.idSolicitud 
  AND rAdmin.idRemitente IN (SELECT id FROM People WHERE administrador = 1)
LEFT JOIN RespuestasSolicitudes rUsuario 
  ON s.id = rUsuario.idSolicitud 
  AND rUsuario.idRemitente NOT IN (SELECT id FROM People WHERE administrador = 1)
ORDER BY s.fechaSolicitud DESC`; // Ordenar por fecha de solicitud (opcional)

  db.query(querySolicitudes, (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Error al obtener las solicitudes', error: err });
    }
    return res.status(200).json(results);
  });
});

app.get('/api/solicitudes/usuario/:idUsuario', (req, res) => {
  const idUsuario = req.params.idUsuario;

  const querySolicitudes = `
    SELECT s.*, 
        rAdmin.id AS idRespuestaAdmin, 
        rAdmin.mensaje AS respuestaAdmin, 
        rAdmin.archivo AS archivoAdmin,
        rUsuario.id AS idRespuestaUsuario, 
        rUsuario.mensaje AS respuestaUsuario, 
        rUsuario.archivo AS archivoUsuario
  FROM SolicitudesInfo s
  LEFT JOIN RespuestasSolicitudes rAdmin 
        ON s.id = rAdmin.idSolicitud 
        AND rAdmin.idRemitente IN (SELECT id FROM People WHERE administrador = 1)
  LEFT JOIN RespuestasSolicitudes rUsuario 
        ON s.id = rUsuario.idSolicitud 
        AND rUsuario.idRemitente = ?
  WHERE s.idUsuario = ?
  ORDER BY s.fechaSolicitud DESC;`;

  db.query(querySolicitudes, [idUsuario, idUsuario], (err, results) => {
    if (err) {
      console.error('Error al obtener las solicitudes:', err);
      return res.status(500).json({ message: 'Error al obtener las solicitudes' });
    }
    return res.status(200).json(results);
  });
});


// Ruta para obtener el archivo de una respuesta
app.get('/api/solicitudes/archivo/:idRespuesta', (req, res) => {
  const idRespuesta = req.params.idRespuesta;

  const query = 'SELECT archivo, tipoArchivo FROM RespuestasSolicitudes WHERE id = ?';
  db.query(query, [idRespuesta], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Error al obtener el archivo' });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: 'Archivo no encontrado' });
    }

    const { archivo, tipoArchivo } = results[0];
    res.setHeader('Content-Type', tipoArchivo);
    res.send(archivo); // Enviar el archivo BLOB
  });
});

app.get('/api/solicitudes/:id', (req, res) => {
  const idSolicitud = req.params.id;

  const querySolicitud = `
    SELECT s.*, 
        rAdmin.id AS idRespuestaAdmin, 
        rAdmin.mensaje AS respuestaAdmin, 
        rAdmin.archivo AS archivoAdmin,
        rUsuario.id AS idRespuestaUsuario, 
        rUsuario.mensaje AS respuestaUsuario, 
        rUsuario.archivo AS archivoUsuario
    FROM SolicitudesInfo s
    LEFT JOIN RespuestasSolicitudes rAdmin 
        ON s.id = rAdmin.idSolicitud 
        AND rAdmin.idRemitente IN (SELECT id FROM People WHERE administrador = 1)
    LEFT JOIN RespuestasSolicitudes rUsuario 
        ON s.id = rUsuario.idSolicitud 
        AND rUsuario.idRemitente NOT IN (SELECT id FROM People WHERE administrador = 1)
    WHERE s.id = ?;`;

  db.query(querySolicitud, [idSolicitud], (err, results) => {
    if (err) {
      console.error('Error al obtener la solicitud:', err);
      return res.status(500).json({ message: 'Error al obtener la solicitud' });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ message: 'Solicitud no encontrada' });
    }
    
    return res.status(200).json(results[0]); // Devuelve solo una solicitud
  });
});
