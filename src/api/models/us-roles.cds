namespace rol;

// Definición de la entidad ZTROL que representa un rol con sus procesos y privilegios asociados
entity ZTROL {
    ROLEID      : String;      // Identificador único del rol
    ROLENAME    : String;      // Nombre descriptivo del rol
    DESCRIPTION : String;      // Descripción del rol para mayor detalle
    // Arreglo de procesos asociados al rol, cada uno con nombre, ID y privilegios
    PROCESS     : array of {
        NAMEAPP     : String;  // Nombre o identificador de la aplicación o módulo del proceso
        PROCESSID   : String;  // Identificador único del proceso
        // Arreglo de privilegios específicos para este proceso
        PRIVILEGE : array of {
            PRIVILEGEID : String;  // Identificador único de cada privilegio
        };
    };
    ACTIVED     : Boolean;     // Indica si el rol está activo
    DELETED     : Boolean;     // Indica si el rol ha sido marcado como eliminado (lógico)
    // Detalle adicional relacionado a registros del rol
    DETAIL_ROW  : {
        // Arreglo de registros detallados relacionados al rol
        DETAIL_ROW_REG : array of {
            CURRENT : Boolean;  // Indica si este registro es el más actual
            REGDATE : DateTime; // Fecha y hora del registro
            REGUSER : String;   // Usuario que realizó el registro
        }
    };
};
