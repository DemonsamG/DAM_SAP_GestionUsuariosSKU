// src/api/routes/sec-app-privileges-router.cds
namespace sec.appprivileges;

// --- Modelo ---
entity AppPrivileges {
    key ROLEID      : String(100);
    key APPID       : String(100);
    key PRIVILEGEID : String(100);
    key PROCESSID   : String(100);
    key VIEWID      : String(100);
    
    REGUSER   : String(20);
    REGDATE   : Date;
    // ...resto de campos de auditoría
    ACTIVED   : Boolean default true;
    DELETED   : Boolean default false;
}

// --- Servicio ---
using { sec.appprivileges as my } from './sec-app-privileges-router';

@impl: 'src/api/controllers/sec-app-privileges-controller.js'
service SecurityAppPrivilegesRoute @(path: '/api/security/app-privileges') {

  @cds.autoexpose
  entity AppPrivileges as projection on my.AppPrivileges;

  @path: 'crud'
  action crud(
    ProcessType : String,
    // Llaves para filtros
    ROLEID      : String,
    APPID       : String,
    PRIVILEGEID : String,
    PROCESSID   : String,
    VIEWID      : String,
    // Payload
    data        : Map
  ) returns array of AppPrivileges;
}