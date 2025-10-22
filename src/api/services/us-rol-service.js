const mongoose = require("mongoose");
const { getDatabase } = require("../../config/connectToCosmosDB.js");
const Rol = require("../models/mongodb/Rol.js");
const {
  BITACORA,
  DATA,
  AddMSG,
  OK,
  FAIL,
} = require("../../middlewares/respPWA.handler.js");
// conexión al container (equivalente a una colección en MongoDB)

// Función para establecer conexión con la base de datos según el servidor especificado
async function connectDB(DBServer) {
  try {
    switch (DBServer) {
      case "MongoDB":
        // Si no hay conexión activa con MongoDB, se conecta usando la URI configurada en variables de entorno
        if (mongoose.connection.readyState === 0) {
          await mongoose.connect(process.env.MONGO_URI);
          console.log("✅ Conectado a MongoDB local.");
        }
        break;

      case "AZURECOSMOS":
        // Azure Cosmos DB se conecta desde un archivo de configuración externo, no se vuelve a conectar aquí
        console.log("✅ CosmosDB ya está conectado desde el archivo de config.");
        break;

      default:
        // Error si el tipo de base de datos no es reconocido
        throw new Error(`DBServer no reconocido: ${DBServer}`);
    }
  } catch (error) {
    // Registro de error de conexión y relanzamiento
    console.error(`❌ Error al conectar a ${DBServer}:`, error.message);
    throw error;
  }
}

// Función para obtener todos los roles almacenados en la base de datos indicada
async function getRolAll(processType, dbServer, loggedUser) {
  const bitacora = BITACORA(); // Registro para trazabilidad
  bitacora.loggedUser = loggedUser;
  bitacora.process = `${processType} - Obtener todos los Roles`;

  let dataPaso = DATA(); // Objeto para recolectar información del paso
  dataPaso.process = `Consulta a ${dbServer} para obtener roles`;
  dataPaso.method = "GET";
  dataPaso.api = `crud?ProcessType=${processType}&DBServer=${dbServer}&LoggedUser=${loggedUser}`;
  dataPaso.dataReq = { processType, dbServer, loggedUser };

  try {
    let roles;
    if (dbServer === "MongoDB") {
      // Consulta usando Mongoose para obtener todos los documentos de la colección Rol
      roles = await Rol.find().lean();
    } else {
      // Consulta SQL para Cosmos DB, obtención de todos los items del container "ZTROL"
      const querySpec = {
        query: "SELECT * FROM c",
      };
      const contaRoles = getDatabase().container("ZTROL");
      const { resources } = await contaRoles.items.query(querySpec).fetchAll();
      roles = resources;
    }

    // Se almacenan los roles obtenidos y mensajes de éxito
    dataPaso.dataRes = roles;
    dataPaso.messageUSR = "Roles obtenidos exitosamente.";
    dataPaso.messageDEV = "OK - Roles obtenidos exitosamente";
    // Metadatos adicionales para el registro
    dataPaso.processType = processType;
    dataPaso.dbServer = dbServer;
    dataPaso.loggedUser = loggedUser;

    bitacora.processType = processType;
    bitacora.dbServer = dbServer;

    // Se añade mensaje de éxito al bitácora y se devuelve OK
    AddMSG(bitacora, dataPaso, "OK", 200);
    return OK(bitacora);
  } catch (error) {
    // En caso de error se registran mensajes de fallo y se devuelve FAIL
    dataPaso.messageDEV = error.message;
    dataPaso.messageUSR = "No se pudieron obtener los roles. Intente más tarde.";

    dataPaso.processType = processType;
    dataPaso.dbServer = dbServer;
    dataPaso.loggedUser = loggedUser;

    bitacora.processType = processType;
    bitacora.dbServer = dbServer;
    bitacora.loggedUser = loggedUser;

    AddMSG(bitacora, dataPaso, "FAIL", 500);
    return FAIL(bitacora);
  }
}

// Función para obtener un rol específico a partir de su ID
async function getRolById(data, processType, dbServer, loggedUser) {
  const bitacora = BITACORA();
  bitacora.loggedUser = loggedUser;
  bitacora.process = `${processType} - Obtener un Rol por su ID`;

  let dataPaso = DATA();
  dataPaso.process = "Consulta a MongoDB para obtener un rol específico";

  try {
    const { ROLEID } = data;
    dataPaso.dataReq = { data, processType, dbServer, loggedUser };
    dataPaso.method = "GET";
    dataPaso.api = `crud?ProcessType=${processType}&DBServer=${dbServer}&LoggedUser=${loggedUser}`;

    // Consulta a MongoDB con el campo ROLEID
    const rol = await Rol.findOne({ ROLEID }).lean();

    // Si no se encuentra el rol, se registra y devuelve fallo
    if (!rol) {
      dataPaso.messageDEV = `No se encontró un rol con el ROLEID: ${ROLEID}`;
      dataPaso.messageUSR = "El rol que buscas no existe.";

      dataPaso.processType = processType;
      dataPaso.dbServer = dbServer;
      dataPaso.loggedUser = loggedUser;

      AddMSG(bitacora, dataPaso, "FAIL", 404);
      return FAIL(bitacora);
    }

    // Si se encuentra, se almacenan los datos y se responde con éxito
    dataPaso.dataRes = rol;
    dataPaso.messageUSR = "Rol obtenido exitosamente.";
    dataPaso.messageDEV = "OK - Roles obtenidos exitosamente";

    dataPaso.processType = processType;
    dataPaso.dbServer = dbServer;
    dataPaso.loggedUser = loggedUser;

    bitacora.processType = processType;
    bitacora.dbServer = dbServer;

    AddMSG(bitacora, dataPaso, "OK", 200);
    return OK(bitacora);
  } catch (error) {
    // Manejo de errores en la consulta
    dataPaso.messageDEV = error.message;
    dataPaso.messageUSR = "Ocurrió un error al buscar el rol.";

    dataPaso.processType = processType;
    dataPaso.dbServer = dbServer;
    dataPaso.loggedUser = loggedUser;

    AddMSG(bitacora, dataPaso, "FAIL", 500);
    return FAIL(bitacora);
  }
}

// Función que obtiene los procesos asociados a un rol específico
async function getProcessByRol(data, processType, dbServer, loggedUser) {
  const bitacora = BITACORA();
  bitacora.loggedUser = loggedUser;
  bitacora.process = `${processType} - Obtener procesos asociados a un Rol`;

  let dataPaso = DATA();
  dataPaso.method = "GET";
  dataPaso.api = `crud?ProcessType=${processType}&DBServer=${dbServer}&LoggedUser=${loggedUser}`;
  dataPaso.process = "Consulta a MongoDB para obtener los procesos de un rol";

  const { ROLEID } = data;
  dataPaso.dataReq = { processType, dbServer, loggedUser, ROLEID };

  try {
    // Se busca el rol por su ROLEID y solo se solicita el campo PROCESS
    const rol = await Rol.findOne({ ROLEID }, { PROCESS: 1 }).lean();

    // Si no se encuentra el rol o no tiene procesos asociados
    if (!rol || !rol.PROCESS) {
      dataPaso.messageDEV = `No se encontraron procesos asociados al ROLEID: ${ROLEID}`;
      dataPaso.messageUSR = "Este rol no tiene procesos asociados.";

      dataPaso.processType = processType;
      dataPaso.dbServer = dbServer;
      dataPaso.loggedUser = loggedUser;

      AddMSG(bitacora, dataPaso, "FAIL", 404);
      return FAIL(bitacora);
    }

    // Si hay procesos, se almacenan y se envía mensaje de éxito
    dataPaso.dataRes = rol.PROCESS;
    dataPaso.messageUSR = "Procesos obtenidos exitosamente.";
    dataPaso.messageDEV = "OK - Roles obtenidos exitosamente";

    dataPaso.processType = processType;
    dataPaso.dbServer = dbServer;
    dataPaso.loggedUser = loggedUser;

    bitacora.processType = processType;
    bitacora.dbServer = dbServer;

    AddMSG(bitacora, dataPaso, "OK", 200);
    return OK(bitacora);
  } catch (error) {
    // Manejo de errores en la obtención de procesos
    dataPaso.messageDEV = error.message;
    dataPaso.messageUSR = "Ocurrió un error al obtener los procesos.";

    dataPaso.processType = processType;
    dataPaso.dbServer = dbServer;
    dataPaso.loggedUser = loggedUser;

    AddMSG(bitacora, dataPaso, "FAIL", 500);
    return FAIL(bitacora);
  }
}

// Función para obtener privilegios asociados a un rol y proceso específicos
async function getPrivilegesByRol(data, processType, dbServer, loggedUser) {
  const bitacora = BITACORA();
  bitacora.loggedUser = loggedUser;

  let dataPaso = DATA();
  dataPaso.method = "GET";
  dataPaso.api = `crud?ProcessType=${processType}&DBServer=${dbServer}&LoggedUser=${loggedUser}`;
  bitacora.process = `${processType} - Obtener privilegios asociados a un Rol y Proceso`;
  dataPaso.process = "Consulta a MongoDB para obtener privilegios de un proceso específico";

  const { ROLEID, PROCESSID } = data;
  dataPaso.dataReq = { ROLEID, PROCESSID };

  try {
    // Se busca el rol y se recuperan solo sus procesos
    const rol = await Rol.findOne({ ROLEID }, { PROCESS: 1 }).lean();

    // Si no se encuentra el rol o no tiene procesos
    if (!rol || !rol.PROCESS) {
      dataPaso.messageDEV = `No se encontraron procesos para el ROLEID: ${ROLEID}`;
      dataPaso.messageUSR = "El rol no tiene procesos asociados.";

      dataPaso.processType = processType;
      dataPaso.dbServer = dbServer;
      dataPaso.loggedUser = loggedUser;

      AddMSG(bitacora, dataPaso, "FAIL", 404);
      return FAIL(bitacora);
    }

    // Se busca el proceso correspondiente dentro del arreglo PROCESS
    const proceso = rol.PROCESS.find((p) => p.PROCESSID === PROCESSID);

    // Si no se encuentra el proceso o no tiene privilegios
    if (!proceso || !proceso.PRIVILEGE) {
      dataPaso.messageDEV = `No se encontró el proceso con ID: ${PROCESSID}`;
      dataPaso.messageUSR = "El proceso no tiene privilegios registrados.";

      dataPaso.processType = processType;
      dataPaso.dbServer = dbServer;
      dataPaso.loggedUser = loggedUser;

      AddMSG(bitacora, dataPaso, "FAIL", 404);
      return FAIL(bitacora);
    }

    // Se devuelven los privilegios encontrados
    dataPaso.dataRes = proceso.PRIVILEGE;
    dataPaso.messageUSR = "Privilegios obtenidos exitosamente.";

    dataPaso.processType = processType;
    dataPaso.dbServer = dbServer;
    dataPaso.loggedUser = loggedUser;

    bitacora.processType = processType;
    bitacora.dbServer = dbServer;

    AddMSG(bitacora, dataPaso, "OK", 200);
    return OK(bitacora);
  } catch (error) {
    // Manejo de error al obtener privilegios
    dataPaso.messageDEV = error.message;
    dataPaso.messageUSR = "Ocurrió un error al obtener los privilegios.";

    dataPaso.processType = processType;
    dataPaso.dbServer = dbServer;
    dataPaso.loggedUser = loggedUser;

    AddMSG(bitacora, dataPaso, "FAIL", 500);
    return FAIL(bitacora);
  }
}

async function postRol(data, processType, dbServer, loggedUser) {
  const bitacora = BITACORA();
  bitacora.loggedUser = loggedUser;
  bitacora.process = `${processType} - Crear un nuevo Rol`;
  let dataPaso = DATA();
  dataPaso.process = `Guardado de nuevo rol en ${dbServer}`;
  dataPaso.method = "POST";
  dataPaso.api = `crud?ProcessType=${processType}&DBServer=${dbServer}&LoggedUser=${loggedUser}`;
  dataPaso.dataReq = { processType, dbServer, loggedUser, data };
  try {
    let roles;
    if (dbServer === "MongoDB") {
      const newRol = new Rol(data);
      roles = await newRol.save();
      roles = roles.toObject();
    } else {
      // Cosmos requiere que cada item tenga un "id"
      if (!data.id) {
        data.id = data.ROLEID;
      }
      const contaRoles = getDatabase().container("ZTROL");
      const { resources } = await contaRoles.items.create(data);
      roles = resources;
    }
    dataPaso.dataRes = roles;
    dataPaso.messageUSR = "Rol creado exitosamente.";
    dataPaso.messageDEV = "OK - Roles creado exitosamente";

    dataPaso.processType = processType;
    dataPaso.dbServer = dbServer;
    dataPaso.loggedUser = loggedUser;

    bitacora.processType = processType;
    bitacora.dbServer = dbServer;

    AddMSG(bitacora, dataPaso, "OK", 201);
    return OK(bitacora, 201);
  } catch (error) {
    dataPaso.messageDEV = error.message;
    dataPaso.messageUSR =
      "No se pudo crear el rol. Verifique que los datos sean correctos.";

    dataPaso.processType = processType;
    dataPaso.dbServer = dbServer;
    dataPaso.loggedUser = loggedUser;

    AddMSG(bitacora, dataPaso, "FAIL", 400);
    return FAIL(bitacora);
  }
}

async function UpdateRol(data, processType, dbServer, loggedUser) {
  const bitacora = BITACORA();
  bitacora.loggedUser = loggedUser;
  bitacora.process = `${processType} - Actualizar un Rol`;
  let dataPaso = DATA();
  dataPaso.process = `Actualizacion de un rol en ${dbServer}`; // Mensaje dinámico
  dataPaso.method = "PUT";
  dataPaso.api = `crud?ProcessType=${processType}&DBServer=${dbServer}&LoggedUser=${loggedUser}`;
  dataPaso.dataReq = { processType, dbServer, loggedUser, data };

  try {
    const { ROLEID } = data;

    // 1. Validar que el ROLEID venga en la data (común para ambas DB)
    if (!ROLEID) {
      dataPaso.messageDEV = "El campo 'ROLEID' es requerido para actualizar.";
      dataPaso.messageUSR = "No se proporcionó el identificador del rol.";
      // ... (código de error)
      AddMSG(bitacora, dataPaso, "FAIL", 400);
      return FAIL(bitacora);
    }

    let updatedRol; // Variable para almacenar el resultado

    // 2. Lógica separada por tipo de base de datos
    if (dbServer === "MongoDB") {
      // --- LÓGICA PARA MONGODB ---
      updatedRol = await Rol.findOneAndUpdate({ ROLEID: ROLEID }, data, {
        new: true,
      });
      if (updatedRol) {
        updatedRol = updatedRol.toObject(); // Convertir a objeto plano
      }
    } else {

      const contaRoles = getDatabase().container("ZTROL");

      const querySpec = {
        query: "SELECT * FROM c WHERE c.ROLEID = @roleId",
        parameters: [
          {
            name: "@roleId",
            value: ROLEID,
          },
        ],
      };

      const { resources: items } = await contaRoles.items
        .query(querySpec)
        .fetchAll();

      if (items.length === 0) {
        finalUpdatedRol = null;
      } else {
        const rolToUpdate = items[0];

        const updatedData = { ...rolToUpdate, ...data };

        const { resource: replacedItem } = await contaRoles
          .item(rolToUpdate.id, rolToUpdate.ROLEID)
          .replace(updatedData);
        finalUpdatedRol = replacedItem;
        updatedRol = true;
      }
    }

    // 3. Manejar el caso si no se encuentra el rol para actualizar
    if (!updatedRol) {
      dataPaso.messageDEV = `No se encontró un rol con ROLEID: ${ROLEID}`;
      dataPaso.messageUSR = "El rol que intenta actualizar no existe.";
      // ... (código de error)
      AddMSG(bitacora, dataPaso, "FAIL", 404);
      return FAIL(bitacora);
    }

    // 4. Éxito: El rol fue actualizado
    dataPaso.dataRes = updatedRol;
    dataPaso.messageUSR = "Rol actualizado exitosamente.";
    dataPaso.messageDEV = "OK - Roles actualizado exitosamente";

    // ... (código de éxito)
    dataPaso.processType = processType;
    dataPaso.dbServer = dbServer;
    dataPaso.loggedUser = loggedUser;
    bitacora.processType = processType;
    bitacora.dbServer = dbServer;

    AddMSG(bitacora, dataPaso, "OK", 200);
    return OK(bitacora);
  } catch (error) {
    // El catch manejará errores de conexión o si el item no existe en Cosmos DB
    dataPaso.messageDEV = error.message;
    dataPaso.messageUSR =
      "No se pudo actualizar el rol. Verifique que los datos sean correctos.";

    // ... (código de error)
    dataPaso.processType = processType;
    dataPaso.dbServer = dbServer;
    dataPaso.loggedUser = loggedUser;

    AddMSG(bitacora, dataPaso, "FAIL", 400);
    return FAIL(bitacora);
  }
}

async function addProcessRol(data, processType, dbServer, loggedUser) {
  const bitacora = BITACORA();
  bitacora.loggedUser = loggedUser;
  bitacora.process = `${processType} - Añadir proceso a un Rol`;
  let dataPaso = DATA();
  dataPaso.process = "Añadir proceso dentro de un rol en MongoDB";
  dataPaso.method = "POST";
  dataPaso.api = `crud?ProcessType=${processType}&DBServer=${dbServer}&LoggedUser=${loggedUser}`;
  dataPaso.dataReq = { processType, dbServer, loggedUser, data };

  try {
    const { ROLEID, PROCESS } = data;
    const rol = await Rol.findOne({ ROLEID });
    if (!rol) {
      dataPaso.messageDEV = `No se encontró el rol con ROLEID: ${ROLEID}`;
      dataPaso.messageUSR = "Rol no encontrado.";

      dataPaso.processType = processType;
      dataPaso.dbServer = dbServer;
      dataPaso.loggedUser = loggedUser;

      AddMSG(bitacora, dataPaso, "FAIL", 404);
      return FAIL(bitacora);
    }
    const processExist = rol.PROCESS.some(
      (p) => p.PROCESSID === PROCESS[0].PROCESSID
    );
    if (processExist) {
      dataPaso.messageDEV = `El proceso con ID '${PROCESS[0].PROCESSID}' ya existe en este rol.`;
      dataPaso.messageUSR = "El proceso ya existe en el rol.";

      dataPaso.processType = processType;
      dataPaso.dbServer = dbServer;
      dataPaso.loggedUser = loggedUser;

      AddMSG(bitacora, dataPaso, "FAIL", 409);
      return FAIL(bitacora);
    }

    rol.PROCESS.push({
      NAMEAPP: PROCESS[0].NAMEAPP,
      PROCESSID: PROCESS[0].PROCESSID,
      PRIVILEGEID: PROCESS[0].PRIVILEGEID || [],
    });

    const updatedRol = await rol.save();
    dataPaso.dataRes = updatedRol.toObject();
    dataPaso.messageUSR = "Proceso añadido exitosamente.";

    dataPaso.processType = processType;
    dataPaso.dbServer = dbServer;
    dataPaso.loggedUser = loggedUser;

    bitacora.processType = processType;
    bitacora.dbServer = dbServer;

    AddMSG(bitacora, dataPaso, "OK", 200);
    return OK(bitacora);
  } catch (error) {
    dataPaso.messageDEV = error.message;
    dataPaso.messageUSR = "No se pudo añadir el proceso.";

    dataPaso.processType = processType;
    dataPaso.dbServer = dbServer;
    dataPaso.loggedUser = loggedUser;

    AddMSG(bitacora, dataPaso, "FAIL", 500);
    return FAIL(bitacora);
  }
}

async function addPrivilege(data, processType, dbServer, loggedUser) {
  const bitacora = BITACORA();
  bitacora.loggedUser = loggedUser;
  bitacora.process = `${processType} - Añadir privilegio a un proceso en Rol`;
  let dataPaso = DATA();
  dataPaso.process = "Añadir privilegio dentro de un proceso en MongoDB";
  dataPaso.method = "POST";
  dataPaso.api = `crud?ProcessType=${processType}&DBServer=${dbServer}&LoggedUser=${loggedUser}`;
  dataPaso.dataReq = { processType, dbServer, loggedUser, data };
  try {
    const { ROLEID, PROCESSID, PRIVILEGEID } = data;
    const rol = await Rol.findOne({ ROLEID });
    if (!rol) {
      dataPaso.messageDEV = `No se encontró el rol con ROLEID: ${ROLEID}`;
      dataPaso.messageUSR = "Rol no encontrado.";

      dataPaso.processType = processType;
      dataPaso.dbServer = dbServer;
      dataPaso.loggedUser = loggedUser;

      AddMSG(bitacora, dataPaso, "FAIL", 404);
      return FAIL(bitacora);
    }

    const targetProcess = rol.PROCESS.find((p) => p.PROCESSID === PROCESSID);
    if (!targetProcess) {
      dataPaso.messageDEV = `No se encontró el proceso con ID: ${PROCESSID}`;
      dataPaso.messageUSR = "Proceso no encontrado en el rol.";

      dataPaso.processType = processType;
      dataPaso.dbServer = dbServer;
      dataPaso.loggedUser = loggedUser;

      AddMSG(bitacora, dataPaso, "FAIL", 404);
      return FAIL(bitacora);
    }

    const privilegeExist = targetProcess.PRIVILEGE?.some(
      (priv) => priv.PRIVILEGEID === PRIVILEGEID
    );
    if (privilegeExist) {
      dataPaso.messageDEV = `El privilegio con ID '${PRIVILEGEID}' ya existe en este proceso.`;
      dataPaso.messageUSR = "El privilegio ya existe en el proceso.";

      dataPaso.processType = processType;
      dataPaso.dbServer = dbServer;
      dataPaso.loggedUser = loggedUser;

      AddMSG(bitacora, dataPaso, "FAIL", 409);
      return FAIL(bitacora);
    }

    if (!targetProcess.PRIVILEGE) targetProcess.PRIVILEGE = [];
    targetProcess.PRIVILEGE.push({ PRIVILEGEID });

    const updatedRol = await rol.save();
    dataPaso.dataRes = updatedRol.toObject();
    dataPaso.messageUSR = "Privilegio añadido exitosamente.";

    dataPaso.processType = processType;
    dataPaso.dbServer = dbServer;
    dataPaso.loggedUser = loggedUser;

    bitacora.processType = processType;
    bitacora.dbServer = dbServer;

    AddMSG(bitacora, dataPaso, "OK", 200);
    return OK(bitacora);
  } catch (error) {
    dataPaso.messageDEV = error.message;
    dataPaso.messageUSR = "No se pudo añadir el privilegio.";

    dataPaso.processType = processType;
    dataPaso.dbServer = dbServer;
    dataPaso.loggedUser = loggedUser;

    AddMSG(bitacora, dataPaso, "FAIL", 500);
    return FAIL(bitacora);
  }
}

async function deleteRolHard(data, processType, dbServer, loggedUser) {
  const bitacora = BITACORA();
  bitacora.loggedUser = loggedUser;
  bitacora.process = `${processType} - Eliminación física de un Rol`;
  let dataPaso = DATA();
  const { ROLEID } = data;

  dataPaso.process = `Búsqueda y eliminación de rol en ${dbServer}`;
  dataPaso.api = `crud?ProcessType=${processType}&DBServer=${dbServer}&LoggedUser=${loggedUser}`;
  dataPaso.dataReq = { processType, dbServer, loggedUser, data };

  // 1. Validar que el ROLEID venga en la data (común para ambas DB)
  if (!ROLEID) {
    dataPaso.messageDEV = "El campo 'ROLEID' es requerido para eliminar.";
    dataPaso.messageUSR = "No se proporcionó el identificador del rol.";
    AddMSG(bitacora, dataPaso, "FAIL", 400);
    return FAIL(bitacora);
  }

  try {
    let deletedRol; // Variable para almacenar el resultado

    // 2. Lógica separada por tipo de base de datos
    if (dbServer === "MongoDB") {
      // --- LÓGICA PARA MONGODB ---
      const mongoResult = await Rol.findOneAndDelete({ ROLEID });
      if (mongoResult) {
        deletedRol = mongoResult.toObject();
      }
    } else {
      // --- LÓGICA PARA AZURE COSMOS DB ---
      const contaRoles = getDatabase().container("ZTROL");

      // a. Crear la consulta para buscar el documento por ROLEID
      const querySpec = {
        query: "SELECT * FROM c WHERE c.ROLEID = @roleId",
        parameters: [{ name: "@roleId", value: ROLEID }],
      };

      // b. Ejecutar la consulta para encontrar el documento
      const { resources: items } = await contaRoles.items
        .query(querySpec)
        .fetchAll();

      if (items.length > 0) {
        const rolToDelete = items[0]; // El documento a eliminar

        // c. Eliminar el documento usando su 'id' y su partition key ('ROLEID')
        await contaRoles.item(rolToDelete.id, rolToDelete.ROLEID).delete();
        
        // Guardamos el objeto que acabamos de eliminar para devolverlo en la respuesta
        deletedRol = rolToDelete; 
      }
    }

    // 3. Manejar el caso si no se encontró el rol para eliminar
    if (!deletedRol) {
      dataPaso.messageDEV = `No se encontró un rol con ROLEID: ${ROLEID}`;
      dataPaso.messageUSR = "El rol que intenta eliminar no existe.";
      AddMSG(bitacora, dataPaso, "FAIL", 404);
      return FAIL(bitacora);
    }

    // 4. Éxito: El rol fue eliminado
    dataPaso.dataRes = deletedRol;
    dataPaso.messageUSR = "Rol eliminado exitosamente.";
    dataPaso.messageDEV = "OK - Rol eliminado exitosamente";

    bitacora.processType = processType;
    bitacora.dbServer = dbServer;
    AddMSG(bitacora, dataPaso, "OK", 200);
    return OK(bitacora);
    
  } catch (error) {
    dataPaso.messageDEV = error.message;
    dataPaso.messageUSR = "Ocurrió un error al intentar eliminar el rol.";
    AddMSG(bitacora, dataPaso, "FAIL", 500);
    return FAIL(bitacora);
  }
}

async function removeProcess(data, processType, dbServer, loggedUser) {
  const bitacora = BITACORA();
  bitacora.loggedUser = loggedUser;
  bitacora.process = `${processType} - Eliminar proceso de un Rol`;
  let dataPaso = DATA();
  const { ROLEID } = data;
  const { PROCESSID } = data.PROCESS[0];
  dataPaso.process = "Eliminar proceso de rol en MongoDB";
  dataPaso.dataReq = { ROLEID, PROCESSID };

  try {
    const rol = await Rol.findOne({ ROLEID });
    if (!rol) {
      dataPaso.messageDEV = `El rol con ID '${ROLEID}' no fue encontrado.`;
      dataPaso.messageUSR = "Rol no encontrado.";

      dataPaso.processType = processType;
      dataPaso.dbServer = dbServer;
      dataPaso.loggedUser = loggedUser;

      AddMSG(bitacora, dataPaso, "FAIL", 404);
      return FAIL(bitacora);
    }
    const procesoExiste = rol.PROCESS.find((p) => p.PROCESSID === PROCESSID);
    if (!procesoExiste) {
      dataPaso.messageDEV = `El proceso con ID '${PROCESSID}' no existe en este rol.`;
      dataPaso.messageUSR = "Proceso no encontrado en el rol.";

      dataPaso.processType = processType;
      dataPaso.dbServer = dbServer;
      dataPaso.loggedUser = loggedUser;

      AddMSG(bitacora, dataPaso, "FAIL", 404);
      return FAIL(bitacora);
    }
    const updatedRol = await Rol.findOneAndUpdate(
      { ROLEID },
      { $pull: { PROCESS: { PROCESSID } } },
      { new: true }
    );
    dataPaso.dataRes = updatedRol ? updatedRol.toObject() : null;
    dataPaso.messageUSR = "Proceso eliminado exitosamente.";

    dataPaso.processType = processType;
    dataPaso.dbServer = dbServer;
    dataPaso.loggedUser = loggedUser;

    bitacora.processType = processType;
    bitacora.dbServer = dbServer;

    AddMSG(bitacora, dataPaso, "OK", 200);
    return OK(bitacora);
  } catch (error) {
    dataPaso.messageDEV = error.message;
    dataPaso.messageUSR = "Ocurrió un error al eliminar el proceso.";

    dataPaso.processType = processType;
    dataPaso.dbServer = dbServer;
    dataPaso.loggedUser = loggedUser;

    AddMSG(bitacora, dataPaso, "FAIL", 500);
    return FAIL(bitacora);
  }
}

async function removePrivilege(data, processType, dbServer, loggedUser) {
  const bitacora = BITACORA();
  bitacora.loggedUser = loggedUser;
  bitacora.process = `${processType} - Eliminar privilegio de un proceso en Rol`;
  let dataPaso = DATA();
  const { ROLEID } = data;
  const { PROCESSID } = data.PROCESS[0];
  const { PRIVILEGEID } = data.PROCESS[0].PRIVILEGE[0];
  dataPaso.process = "Eliminar privilegio dentro de proceso en MongoDB";
  dataPaso.dataReq = { ROLEID, PROCESSID, PRIVILEGEID };

  try {
    const rol = await Rol.findOne({ ROLEID });
    if (!rol) {
      dataPaso.messageDEV = `El rol con ID '${ROLEID}' no fue encontrado.`;
      dataPaso.messageUSR = "Rol no encontrado.";

      dataPaso.processType = processType;
      dataPaso.dbServer = dbServer;
      dataPaso.loggedUser = loggedUser;

      AddMSG(bitacora, dataPaso, "FAIL", 404);
      return FAIL(bitacora);
    }
    const procesoExiste = rol.PROCESS.find((p) => p.PROCESSID === PROCESSID);
    if (!procesoExiste) {
      dataPaso.messageDEV = `El proceso con ID '${PROCESSID}' no existe en este rol.`;
      dataPaso.messageUSR = "Proceso no encontrado en el rol.";

      dataPaso.processType = processType;
      dataPaso.dbServer = dbServer;
      dataPaso.loggedUser = loggedUser;

      AddMSG(bitacora, dataPaso, "FAIL", 404);
      return FAIL(bitacora);
    }
    const updatedRol = await Rol.findOneAndUpdate(
      { ROLEID },
      { $pull: { "PROCESS.$[proc].PRIVILEGE": { PRIVILEGEID } } },
      {
        arrayFilters: [{ "proc.PROCESSID": PROCESSID }],
        new: true,
      }
    );
    dataPaso.dataRes = updatedRol ? updatedRol.toObject() : null;
    dataPaso.messageUSR = "Privilegio eliminado exitosamente.";

    dataPaso.processType = processType;
    dataPaso.dbServer = dbServer;
    dataPaso.loggedUser = loggedUser;

    bitacora.processType = processType;
    bitacora.dbServer = dbServer;

    AddMSG(bitacora, dataPaso, "OK", 200);
    return OK(bitacora);
  } catch (error) {
    dataPaso.messageDEV = error.message;
    dataPaso.messageUSR = "Ocurrió un error al eliminar el privilegio.";

    dataPaso.processType = processType;
    dataPaso.dbServer = dbServer;
    dataPaso.loggedUser = loggedUser;

    AddMSG(bitacora, dataPaso, "FAIL", 500);
    return FAIL(bitacora);
  }
}

// Dispatcher centralizado que maneja las diferentes solicitudes relacionadas con roles
async function crudRol(req) {
  // Inicializa registro de bitácora para trazabilidad y estructura de datos temporal
  let bitacora = BITACORA();
  let data = DATA();

  // Extrae parámetros clave del request: tipo de proceso, usuario y servidor DB
  let { ProcessType, LoggedUser, DBServer } = req.req.query;
  const body = req.req.body.rol;
  console.log(body); // Muestra el cuerpo recibido para depuración

  // Asigna datos a la bitácora para seguimiento
  bitacora.loggedUser = LoggedUser;
  bitacora.processType = ProcessType;
  bitacora.dbServer = DBServer;

  // Establece conexión a la base de datos especificada
  await connectDB(DBServer);

  // Maneja la solicitud según el tipo de proceso recibido
  switch (ProcessType) {
    case "getAll":
      // Solicita obtener todos los roles
      bitacora = await getRolAll(ProcessType, DBServer, LoggedUser);
      break;
    case "getById":
      // Solicita obtener un rol por su ID
      bitacora = await getRolById(body, ProcessType, DBServer, LoggedUser);
      break;
    case "getProcess":
      // Solicita obtener procesos asociados a un rol
      bitacora = await getProcessByRol(body, ProcessType, DBServer, LoggedUser);
      break;
    case "getPrivileges":
      // Solicita obtener privilegios de un rol y proceso específico
      bitacora = await getPrivilegesByRol(body, ProcessType, DBServer, LoggedUser);
      break;
    case "postRol":
      // Solicita crear un nuevo rol
      bitacora = await postRol(body, ProcessType, DBServer, LoggedUser);
      break;
    case "addProcessRol":
      // Solicita añadir un proceso a un rol existente
      bitacora = await addProcessRol(body, ProcessType, DBServer, LoggedUser);
      break;
    case "addPrivilege":
      // Solicita añadir un privilegio a un proceso dentro de un rol
      bitacora = await addPrivilege(body, ProcessType, DBServer, LoggedUser);
      break;
    case "deleteRol":
      // Solicita eliminar físicamente un rol
      bitacora = await deleteRolHard(body, ProcessType, DBServer, LoggedUser);
      break;
    case "removeProcess":
      // Solicita eliminar un proceso de un rol
      bitacora = await removeProcess(body, ProcessType, DBServer, LoggedUser);
      break;
    case "removePrivilege":
      // Solicita eliminar un privilegio de un proceso en un rol
      bitacora = await removePrivilege(body, ProcessType, DBServer, LoggedUser);
      break;
    case "updateOne":
      // Solicita actualizar un rol existente
      bitacora = await UpdateRol(body, ProcessType, DBServer, LoggedUser);
      break;
    default:
      // Caso para proceso no reconocido: se registra error y se lanza excepción
      data.status = 400;
      data.messageDEV = `Proceso no reconocido: ${ProcessType}`;
      data.messageUSR = "Tipo de proceso inválido";
      data.dataRes = null;
      throw new Error(data.messageDEV);
  }

  // Marca la operación como exitosa y devuelve la bitácora con resultado OK
  bitacora.success = true;
  req.res.status(bitacora.status).send(bitacora);
  return OK(bitacora);
}

// Exportación de funciones+ para uso externo
module.exports = {
  crudRol,
  connectDB,
};