// src/api/controllers/sec-app-privileges-controller.js
const cds = require('@sap/cds');
const { crudAppPrivileges } = require('../services/sec-app-privileges-service');

class AppPrivilegesController extends cds.ApplicationService {
  async init () {
    this.on('crud', req => crudAppPrivileges(req));
    return super.init();
  }
}

module.exports = AppPrivilegesController;