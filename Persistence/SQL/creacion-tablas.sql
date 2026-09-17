-- TABLAS MAESTRAS (CATÁLOGOS)
CREATE TABLE Origen_Comercial (
    id SERIAL PRIMARY KEY,
    descripcion VARCHAR(100) NOT NULL
);

CREATE TABLE Estado_Cliente (
    id SERIAL PRIMARY KEY,
    descripcion VARCHAR(50) NOT NULL
);

CREATE TABLE Nivel_Ingles (
    id SERIAL PRIMARY KEY,
    descripcion VARCHAR(20) NOT NULL
);

CREATE TABLE Modalidad (
    id SERIAL PRIMARY KEY,
    descripcion VARCHAR(50) NOT NULL
);

CREATE TABLE Estado_Oportunidad (
    id SERIAL PRIMARY KEY,
    descripcion VARCHAR(50) NOT NULL
);

CREATE TABLE Motivo_Rechazo (
    id SERIAL PRIMARY KEY,
    descripcion VARCHAR(200) NOT NULL
);

CREATE TABLE Actividad (
    id SERIAL PRIMARY KEY,
    descripcion VARCHAR(100) NOT NULL
);

CREATE TABLE Usuario (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    correo VARCHAR(150) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    activo BOOLEAN DEFAULT true
);

CREATE TABLE Rol (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL,
    descripcion VARCHAR(200)
);

CREATE TABLE Permiso (
    id SERIAL PRIMARY KEY,
    descripcion VARCHAR(200) NOT NULL
);

CREATE TABLE Usuario_Rol (
    id_usuario INT REFERENCES Usuario(id),
    id_rol INT REFERENCES Rol(id),
    PRIMARY KEY (id_usuario, id_rol)
);

CREATE TABLE Permiso_Rol (
    id_rol INT REFERENCES Rol(id),
    id_permiso INT REFERENCES Permiso(id),
    PRIMARY KEY (id_rol, id_permiso)
);

CREATE TABLE Empresa (
    id SERIAL PRIMARY KEY,
    razon_social VARCHAR(150) NOT NULL,
    cuit VARCHAR(20),
    industria VARCHAR(100),
    correo VARCHAR(150),
    telefono VARCHAR(50),
    direccion TEXT,
    id_estado INT REFERENCES Estado_Cliente(id),
    id_origen INT REFERENCES Origen_Comercial(id),
    observaciones TEXT
);

CREATE TABLE Contacto (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    documento VARCHAR(20),
    cargo VARCHAR(100),
    correo VARCHAR(150) NOT NULL,
    telefono VARCHAR(50),
    id_estado INT REFERENCES Estado_Cliente(id),
    id_origen INT REFERENCES Origen_Comercial(id),
    id_empresa INT REFERENCES Empresa(id) ON DELETE SET NULL,
    observaciones TEXT
);

CREATE TABLE Servicio (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    precio_referencia DECIMAL(10, 2) NOT NULL,
    duracion_horas INT,
    id_nivel INT REFERENCES Nivel_Ingles(id),
    id_modalidad INT REFERENCES Modalidad(id),
    activo BOOLEAN DEFAULT true
);

CREATE TABLE Etapa_Comercial (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    orden INT NOT NULL
);

CREATE TABLE Oportunidad (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(150) NOT NULL,
    id_usuario INT REFERENCES Usuario(id),
    id_empresa INT REFERENCES Empresa(id),
    id_contacto INT REFERENCES Contacto(id),
    id_servicio INT REFERENCES Servicio(id),
    id_etapa INT REFERENCES Etapa_Comercial(id),
    fecha_estimada_cierre DATE,
    fecha_cierre TIMESTAMP,
    id_origen INT REFERENCES Origen_Comercial(id),
    id_estado INT REFERENCES Estado_Cliente(id),
    observaciones TEXT
);

CREATE TABLE Oportunidad_Item (
    id SERIAL PRIMARY KEY,
    id_oportunidad INT REFERENCES Oportunidad(id),
    id_servicio INT REFERENCES Servicio(id),
    cantidad INT DEFAULT 1,
    precio_unitario DECIMAL(10, 2),
    descuento DECIMAL(10, 2) DEFAULT 0
);

CREATE TABLE Historial_Etapas (
    id SERIAL PRIMARY KEY,
    id_oportunidad INT REFERENCES Oportunidad(id),
    id_etapa_anterior INT REFERENCES Etapa_Comercial(id),
    id_nueva_etapa INT REFERENCES Etapa_Comercial(id),
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    id_usuario INT REFERENCES Usuario(id),
    observacion TEXT
);

CREATE TABLE Actividad_Oportunidad (
    id SERIAL PRIMARY KEY,
    id_tipo_actividad INT REFERENCES Actividad(id),
    id_usuario INT REFERENCES Usuario(id),
    id_empresa INT REFERENCES Empresa(id),
    id_contacto INT REFERENCES Contacto(id),
    id_oportunidad INT REFERENCES Oportunidad(id),
    fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    descripcion TEXT,
    resultado VARCHAR(200)
);

CREATE TABLE Log_Oportunidad_Cambio (
    id SERIAL PRIMARY KEY,
    id_oportunidad INT REFERENCES Oportunidad(id),
    id_usuario INT REFERENCES Usuario(id),
    campo VARCHAR(100) NOT NULL,
    valor_anterior TEXT,
    valor_nuevo TEXT,
    fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SEEDS INICIALES
INSERT INTO Usuario (nombre, apellido, correo, username, password_hash) 
VALUES ('Vendedor', 'Demo', 'vendedor@academia.com', 'vendedor', '123456');

INSERT INTO Origen_Comercial (descripcion) VALUES ('Sitio Web'), ('Instagram'), ('Recomendación');
INSERT INTO Estado_Cliente (descripcion) VALUES ('Potencial'), ('Cliente'), ('Inactivo');
INSERT INTO Nivel_Ingles (descripcion) VALUES ('A1'), ('A2'), ('B1'), ('B2'), ('C1'), ('C2');
INSERT INTO Modalidad (descripcion) VALUES ('Grupal Online'), ('Individual 1-to-1'), ('In-Company');

INSERT INTO Servicio (nombre, descripcion, precio_referencia, duracion_horas, id_nivel, id_modalidad) VALUES 
('Inglés General B1', 'Curso semestral de nivelación', 45000.00, 60, 3, 1),
('Business English Corporate', 'Capacitación a medida para empresas', 120000.00, 40, 4, 3);

INSERT INTO Etapa_Comercial (nombre, descripcion, orden) VALUES 
('Consulta Recibida', 'Contacto inicial por la web', 1),
('Examen de Nivelación', 'Evaluación oral y escrita', 2),
('Propuesta Enviada', 'Cotización enviada', 3),
('Matrícula Abonada', 'Inscripción confirmada', 4);