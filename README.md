# Salteñas Intiña

Aplicacion full stack para la salteñeria Salteñas Intiña. El proyecto incorpora autenticacion de usuarios para el proceso de registro de pedidos de mostrador, cuyo modelo de datos existente contempla productos, ventas y sus detalles.

## Estudiante

Adriana Guadalupe Claros Salazar

## Stack tecnico

- Backend: Node.js, Express, MySQL (`mysql2`), JWT y bcryptjs (compatible con bcrypt).
- Frontend: HTML, CSS y JavaScript nativo con `fetch`.
- Base de datos: MySQL 8+; base `Saltenieria`.

## Requisitos previos

- Node.js 18 o superior y npm.
- MySQL 8+ en ejecucion y acceso a la base de datos.

## Instalacion y configuracion

1. Copie `.env.example` a `.env` en la raiz del repositorio.
2. Complete las variables de conexion de MySQL y asigne un valor largo y aleatorio a `JWT_SECRET`. No comparta ni confirme este archivo.
3. Instale las dependencias:

```bash
cd backend && npm install
cd ../frontend && npm install
```

## Base de datos y migracion segura

El archivo SQL principal es `Saltenieria_nueva.sql`. Es una exportacion de la base `Saltenieria` que define las tablas `Producto`, `Venta` y `DetalleVenta`, sus claves foraneas y las vistas de consulta. Contiene `DROP TABLE`, por lo que **no debe ejecutarse sobre una base de datos existente con informacion que se desea conservar**.

La autenticacion se agrega con la migracion no destructiva `backend/sql/migrations/01_create_usuario.sql`. La exportacion original no contiene una tabla `Usuario` ni una equivalente. Ajuste usuario, host y puerto a su instalacion:

```bash
mysql -u TU_USUARIO -p -h TU_HOST -P 3307 Saltenieria < backend/sql/migrations/01_create_usuario.sql
```

La migracion solo crea `Usuario` si no existe y no modifica las tablas, vistas ni datos actuales. Si en la instancia real ya existe una tabla llamada `Usuario` con otro proposito o sin las columnas requeridas, no ejecute cambios automaticos: inspeccione primero `DESCRIBE Usuario;` y defina una migracion de adaptacion antes de continuar. El nombre de la base debe coincidir con `DB_NAME` en `.env`.

## Ejecutar el backend y frontend

En una terminal:

```bash
cd backend
npm run dev
```

El backend queda disponible en `http://localhost:3307` de forma predeterminada.

En otra terminal:

```bash
cd frontend
npm start
```

Abra la URL indicada por el servidor del frontend (por defecto `http://localhost:5173`). Si cambia el puerto o host del backend, actualice `frontend/config.js` y `CORS_ORIGIN` en `.env`.

## Endpoints y pruebas basicas

Estado de la aplicacion y conexion real a MySQL:

```bash
curl http://localhost:3307/api/health
```

Registro:

```bash
curl -X POST http://localhost:3307/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"usuario@ejemplo.com","password":"UnaClaveSegura123"}'
```

Inicio de sesion (copie el `token` devuelto):

```bash
curl -X POST http://localhost:3307/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"usuario@ejemplo.com","password":"UnaClaveSegura123"}'
```

La migracion crea el usuario de prueba `admin@saltenieria.com` con la contrasena `123456`. Se recomienda cambiarla o eliminarlo antes de usar el sistema fuera de desarrollo.

Perfil protegido:

```bash
curl http://localhost:3307/api/auth/me \
  -H "Authorization: Bearer TU_TOKEN"
```

## Estructura

```text
backend/
  src/config, src/controllers, src/middleware, src/routes
  sql/migrations/01_create_usuario.sql
frontend/
  index.html, styles.css, app.js, config.js
```
