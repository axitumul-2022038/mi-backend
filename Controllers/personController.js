const Person = require('../models/Person.js');

// Crear una nueva persona
exports.createPerson = async (req, res) => {
  try {
    const { nombre, poder, imagenUrl, funcion } = req.body;
    
    // Verificar que los campos requeridos no sean nulos
    if (!nombre) {
      return res.status(400).json({ error: 'Faltan campos: nombre' });
    }if(!poder){
      return res.status(400).json({ error: 'Faltan campos: poder ' })
    }if(!funcion){
      return res.status(400).json({ error: 'Faltan campos: funcion' })
    }

    // Crear la persona
    const person = await Person.create({ nombre, poder, imagenUrl, funcion });
    res.status(201).json(person);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear la persona' });
    console.log(error);
  }
};


// Obtener todas las personas
exports.getAllPersons = async (req, res) => {
  try {
    const persons = await Person.findAll();
    res.json(persons);
    console.log("se obtuvo los personajes")
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener las personas' });
    console.log(error)
  }
};

// Obtener una persona por ID
exports.getPersonById = async (req, res) => {
  try {
    const person = await Person.findByPk(req.params.id);
    if (person) {
      res.json(person);
    } else {
      res.status(404).json({ error: 'Persona no encontrada' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener la persona' });
  }
};

// Actualizar una persona por ID
exports.updatePerson = async (req, res) => {
  try {
    const person = await Person.findByPk(req.params.id);
    if (person) {
      const { nombre, poder, imagenUrl, funcion } = req.body;
      person.nombre = nombre !== undefined ? nombre : person.nombre;
      person.poder = poder !== undefined ? poder : person.poder;
      person.imagenUrl = imagenUrl !== undefined ? imagenUrl : person.imagenUrl;
      person.funcion = funcion !== undefined ? funcion : person.funcion;
      await person.save();
      res.json(person);
    } else {
      res.status(404).json({ error: 'Persona no encontrada' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar la persona' });
  }
};

// Eliminar una persona por ID
exports.deletePerson = async (req, res) => {
  try {
    const person = await Person.findByPk(req.params.id);
    if (person) {
      await person.destroy();
      res.status(204).send();
    } else {
      res.status(404).json({ error: 'Persona no encontrada' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar la persona' });
  }
};
