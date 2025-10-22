// src/api/services/sec-app-privileges-service.js
const ZTROL_APP_PRI_PRO = require('../models/mongodb/security/ztrol_app_pri_pro');
const { OK, FAIL, BITACORA, DATA, AddMSG } = require('../../middlewares/respPWA.handler');

const today = () => new Date().toISOString().slice(0, 10);
const nowHHMMSS = () => new Date().toISOString().slice(11, 19);

function buildFilter(q = {}) {
    const f = {};
    if (q.ROLEID)      f.ROLEID = String(q.ROLEID);
    if (q.APPID)       f.APPID = String(q.APPID);
    if (q.PRIVILEGEID) f.PRIVILEGEID = String(q.PRIVILEGEID);
    if (q.PROCESSID)   f.PROCESSID = String(q.PROCESSID);
    if (q.VIEWID)      f.VIEWID = String(q.VIEWID);
    return f;
}

async function crudAppPrivileges(req) {
  let bitacora = BITACORA();
  let data = DATA();
  try {
    const { ProcessType, LoggedUser } = req.req.query || {};
    const params = { query: req.req.query || {}, body: req.req.body || {} };

    bitacora.loggedUser = LoggedUser || 'SYSTEM';
    bitacora.processType = ProcessType;
    
    switch (ProcessType) {
      case 'GetByFilter': {
        const filter = buildFilter(params.query);
        const result = await ZTROL_APP_PRI_PRO.find({ ...filter, DELETED: false }).lean();
        data.dataRes = result;
        break;
      }
      case 'GrantPrivilege': {
        const payload = params.body?.data;
        if (!payload) throw { status: 400, message: 'Falta body.data' };
        const docs = (Array.isArray(payload) ? payload : [payload]).map(d => ({
            ...d, REGUSER: bitacora.loggedUser, REGDATE: today(), REGTIME: nowHHMMSS()
        }));
        const result = await ZTROL_APP_PRI_PRO.insertMany(docs);
        data.dataRes = JSON.parse(JSON.stringify(result));
        bitacora.status = 201;
        break;
      }
      case 'RevokePrivilege': { // Borrado Lógico
        const filter = buildFilter(params.query);
        if (Object.keys(filter).length === 0) throw { status: 400, message: 'Debe proveer al menos un filtro para revocar.' };
        const result = await ZTROL_APP_PRI_PRO.findOneAndUpdate(
            filter,
            { DELETED: true, MODUSER: bitacora.loggedUser, MODDATE: today(), MODTIME: nowHHMMSS() },
            { new: true }
        );
        if (!result) throw { status: 404, message: 'Privilegio no encontrado' };
        data.dataRes = JSON.parse(JSON.stringify(result));
        bitacora.status = 201;
        break;
      }
      default:
        throw { status: 400, message: `ProcessType no reconocido: ${ProcessType}` };
    }
    
    data.messageUSR = 'Proceso ejecutado con éxito.';
    bitacora = AddMSG(bitacora, data, 'OK', bitacora.status || 200, true);
    req._.res.status(bitacora.status);
    return OK(bitacora);

  } catch (error) {
    const status = error.status || 500;
    data.status = status;
    data.messageDEV = error.message;
    data.messageUSR = 'El proceso no se completó.';
    bitacora = AddMSG(bitacora, data, 'FAIL', status, true);
    req.error(status, error.message, bitacora);
    return FAIL(bitacora);
  }
}

module.exports = { crudAppPrivileges };