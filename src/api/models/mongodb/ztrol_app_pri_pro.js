// src/api/models/mongodb/security/ztrol_app_pri_pro.js
const { Schema, model } = require('mongoose');

const ZTRolAppPriProSchema = new Schema({
  ROLEID:      { type: String, required: true, maxlength: 100 },
  APPID:       { type: String, required: true, maxlength: 100 },
  PRIVILEGEID: { type: String, required: true, maxlength: 100 },
  PROCESSID:   { type: String, required: true, maxlength: 100 },
  VIEWID:      { type: String, required: true, maxlength: 100 },
  
  // Auditoría
  REGUSER:     { type: String, maxlength: 20 },
  REGDATE:     { type: String }, // YYYY-MM-DD
  REGTIME:     { type: String }, // HH:MM:SS
  MODUSER:     { type: String, maxlength: 20 },
  MODDATE:     { type: String },
  MODTIME:     { type: String },
  
  // Flags
  ACTIVED:    { type: Boolean, default: true },
  DELETED:    { type: Boolean, default: false }
}, { collection: 'ZTROL_APP_PRI_PRO', versionKey: false });

// Índice compuesto para la llave primaria
ZTRolAppPriProSchema.index({ 
  ROLEID: 1, APPID: 1, PRIVILEGEID: 1, PROCESSID: 1, VIEWID: 1 
}, { unique: true });

module.exports = model('ZTROL_APP_PRI_PRO', ZTRolAppPriProSchema);