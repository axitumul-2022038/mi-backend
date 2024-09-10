const express = require('express');
const router = express.Router();
const personController = require('../Controllers/personController.js');

// Definir las rutas
router.post('/persons', personController.createPerson);
router.get('/persons', personController.getAllPersons);
router.get('/persons/:id', personController.getPersonById);
router.put('/persons/:id', personController.updatePerson);
router.delete('/persons/:id', personController.deletePerson);

module.exports = router;
