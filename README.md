# Salteñas Cuzque

## Estudiante

Adriana Guadalupe Claros Salazar

## Descripción del proyecto

La aplicación permite al personal de mostrador registrar los pedidos de los clientes y completar el proceso de venta.

Entre las principales funciones se encuentran:

- Inicio de sesión de usuarios.
- Autenticación mediante JWT.
- Registro de pedidos de mostrador.
- Selección de productos y cantidades.
- Selección del método de pago.
- Registro opcional de NIT y razón social.
- Validación de stock antes de registrar una venta.
- Descuento automático del stock después de una venta.
- Consulta del historial de ventas.
- Búsqueda de ventas por número de pedido, NIT o razón social.
- Filtrado de ventas por:
  - Día.
  - Semana.
  - Mes.
  - Año.
  - Rango de fechas.
  - Método de pago.
- Consulta del comprobante de cada venta.
- Visualización de los productos, cantidades, precios y total del comprobante.
- Opción de impresión del comprobante.
- Cierre de sesión.
- Menú lateral de navegación entre las diferentes secciones del sistema.

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

## Base de datos y migración segura

El archivo SQL principal es `Saltenieria_nueva.sql`. Es un script de reconstrucción de la base `Saltenieria`; contiene las tablas `Producto` (incluido `Stock`), `Usuario`, `Venta` y `DetalleVenta`, sus claves foráneas y las vistas `v_productos_disponibles`, `v_registro_venta`, `v_resumen_ventas`, `v_transacciones_qr` y `v_reporte_ventas_producto`. Contiene sentencias `DROP`, por lo que **no debe ejecutarse sobre una base existente con información que se desea conservar**.

Para una base nueva, ejecute primero el script principal y luego la migración de usuario de prueba. Para la base existente, ejecute únicamente la migración no destructiva `backend/sql/migrations/01_create_usuario.sql`; no altera `Producto`, `Venta`, `DetalleVenta` ni las vistas.

```bash
mysql -u TU_USUARIO -p -h TU_HOST -P 3307 < Saltenieria_nueva.sql
mysql -u TU_USUARIO -p -h TU_HOST -P 3307 Saltenieria < backend/sql/seeds/02_seed_productos.sql
mysql -u TU_USUARIO -p -h TU_HOST -P 3307 Saltenieria < backend/sql/migrations/01_create_usuario.sql
```

El seed `02_seed_productos.sql` agrega un catálogo demostrativo de 16 productos con `INSERT IGNORE`; no sobrescribe productos ya existentes. La migración solo crea `Usuario` si no existe y no modifica las tablas, vistas ni datos actuales. Si en la instancia real ya existe una tabla llamada `Usuario` con otro propósito o sin las columnas requeridas, no ejecute cambios automáticos: inspeccione primero `DESCRIBE Usuario;` y defina una migración de adaptación antes de continuar. El nombre de la base debe coincidir con `DB_NAME` en `.env`.

## Ejecutar el backend y frontend

En una terminal:

```bash
cd backend
npm run dev
```

<<<<<<< HEAD
El backend se ejecuta en el puerto configurado mediante la variable PORT del archivo `.env`.
Por ejemplo: `http://localhost:3000`
=======
El backend queda disponible en `http://localhost:3000` de forma predeterminada. El puerto `3307` corresponde a MySQL en esta configuración, no al backend Express.
>>>>>>> bab4ce3 (Finaliza autenticacion ventas y documentacion)

En otra terminal:

```bash
cd frontend
npm start
```

Abra la URL indicada por el servidor del frontend (por defecto `http://localhost:5173`). Si cambia el puerto o host del backend, actualice `frontend/config.js` y `CORS_ORIGIN` en `.env`.

## Endpoints y pruebas basicas

Estado de la aplicacion y conexion real a MySQL:

```bash
curl http://localhost:3000/api/health
```

Registro:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"usuario@ejemplo.com","password":"UnaClaveSegura123"}'
```

Inicio de sesion (copie el `token` devuelto):

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"usuario@ejemplo.com","password":"UnaClaveSegura123"}'
```

La migración crea el usuario de prueba `admin@saltenieria.com` con la contraseña `ad123456`. Se recomienda cambiarla o eliminarlo antes de usar el sistema fuera de desarrollo.

Perfil protegido:

```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer TU_TOKEN"
```

Productos disponibles, con el stock actual:

```bash
curl http://localhost:3000/api/productos \
  -H "Authorization: Bearer TU_TOKEN"
```

La interfaz usa además los endpoints protegidos `POST /api/ventas`, `GET /api/ventas` y `GET /api/dashboard` para registrar ventas, consultar comprobantes y mostrar indicadores y gráficos.

## Estructura

```text
backend/
  src/config, src/controllers, src/middleware, src/routes
  sql/migrations/01_create_usuario.sql
  sql/seeds/02_seed_productos.sql
frontend/
  index.html, styles.css, app.js, config.js
```
