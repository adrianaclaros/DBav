/*
  Salteñas Cuzque - esquema de reconstrucción
  Base de datos: Saltenieria

  ADVERTENCIA: este script elimina las tablas y vistas listadas antes de
  recrearlas. Úselo solamente en una base nueva o cuando exista un respaldo.
*/

CREATE DATABASE IF NOT EXISTS `Saltenieria`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE `Saltenieria`;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Las vistas se eliminan antes de reconstruir las tablas que consultan.
DROP VIEW IF EXISTS `v_productos_disponibles`;
DROP VIEW IF EXISTS `v_registro_venta`;
DROP VIEW IF EXISTS `v_resumen_ventas`;
DROP VIEW IF EXISTS `v_transacciones_qr`;
DROP VIEW IF EXISTS `v_reporte_ventas_producto`;

-- Primero las tablas dependientes, luego sus tablas padre.
DROP TABLE IF EXISTS `DetalleVenta`;
DROP TABLE IF EXISTS `Venta`;
DROP TABLE IF EXISTS `Usuario`;
DROP TABLE IF EXISTS `Producto`;

CREATE TABLE `Producto` (
  `Producto_ID` INT NOT NULL AUTO_INCREMENT,
  `Nombre` VARCHAR(100) NOT NULL,
  `Categoria` VARCHAR(50) NOT NULL,
  `Precio_Venta` DECIMAL(10, 2) NOT NULL,
  `Stock` INT NOT NULL DEFAULT 0,
  `Activo` TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`Producto_ID`),
  INDEX `idx_Nombre_Producto` (`Nombre`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE `Usuario` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(255) NOT NULL,
  `password_hash` VARCHAR(60) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_usuario_email` (`email`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE `Venta` (
  `Venta_ID` INT NOT NULL AUTO_INCREMENT,
  `Fecha` DATE NOT NULL,
  `Hora` TIME NOT NULL,
  `Total` DECIMAL(10, 2) NOT NULL,
  `Metodo_Pago` VARCHAR(20) NOT NULL,
  `NIT` VARCHAR(20) NULL DEFAULT '0',
  `Razon_Social` VARCHAR(100) NULL DEFAULT 'Sin Nombre',
  PRIMARY KEY (`Venta_ID`),
  INDEX `idx_Venta_Fecha_MetodoPago` (`Fecha`, `Metodo_Pago`),
  INDEX `idx_Venta_MetodoPago_Total` (`Metodo_Pago`, `Total`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE `DetalleVenta` (
  `DetalleVenta_ID` INT NOT NULL AUTO_INCREMENT,
  `Venta_ID` INT NOT NULL,
  `Producto_ID` INT NOT NULL,
  `Cantidad` INT NOT NULL,
  `Precio_Unitario` DECIMAL(10, 2) NOT NULL,
  PRIMARY KEY (`DetalleVenta_ID`),
  INDEX `FK_DetalleVenta_Venta` (`Venta_ID`),
  INDEX `FK_DetalleVenta_Producto` (`Producto_ID`),
  CONSTRAINT `FK_DetalleVenta_Producto`
    FOREIGN KEY (`Producto_ID`) REFERENCES `Producto` (`Producto_ID`)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `FK_DetalleVenta_Venta`
    FOREIGN KEY (`Venta_ID`) REFERENCES `Venta` (`Venta_ID`)
    ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

-- Productos activos, con stock disponible para el módulo de pedidos.
CREATE VIEW `v_productos_disponibles` AS
SELECT
  `Producto_ID`,
  `Nombre`,
  `Categoria`,
  `Precio_Venta`,
  `Stock`
FROM `Producto`
WHERE `Activo` = 1;

-- Detalle legible de los comprobantes de venta.
CREATE VIEW `v_registro_venta` AS
SELECT
  v.`Venta_ID`, v.`Fecha`, v.`Hora`, v.`NIT`, v.`Razon_Social`,
  p.`Nombre` AS `Producto`, dv.`Cantidad`, dv.`Precio_Unitario`,
  (dv.`Cantidad` * dv.`Precio_Unitario`) AS `Subtotal`, v.`Metodo_Pago`
FROM `Venta` v
INNER JOIN `DetalleVenta` dv ON dv.`Venta_ID` = v.`Venta_ID`
INNER JOIN `Producto` p ON p.`Producto_ID` = dv.`Producto_ID`;

-- Resumen diario por método de pago.
CREATE VIEW `v_resumen_ventas` AS
SELECT
  v.`Fecha`, v.`Metodo_Pago`,
  COUNT(DISTINCT v.`Venta_ID`) AS `Cantidad_Ventas`,
  SUM(v.`Total`) AS `Monto_Total_Vendido`,
  SUM(dv.`Cantidad`) AS `Unidades_Vendidas`,
  SUM(CASE WHEN v.`NIT` IS NOT NULL AND v.`NIT` <> '0' THEN 1 ELSE 0 END) AS `Cantidad_Ventas_Con_NIT`
FROM `Venta` v
INNER JOIN `DetalleVenta` dv ON dv.`Venta_ID` = v.`Venta_ID`
GROUP BY v.`Fecha`, v.`Metodo_Pago`;

-- Vista solicitada para identificar productos vendidos mediante QR.
CREATE VIEW `v_transacciones_qr` AS
SELECT
  v.`Venta_ID`, p.`Nombre`, p.`Categoria`, v.`Metodo_Pago`
FROM `Venta` v
INNER JOIN `DetalleVenta` d ON d.`Venta_ID` = v.`Venta_ID`
INNER JOIN `Producto` p ON p.`Producto_ID` = d.`Producto_ID`
WHERE v.`Metodo_Pago` = 'QR';

-- Vista solicitada para el reporte acumulado por producto.
CREATE VIEW `v_reporte_ventas_producto` AS
SELECT
  p.`Producto_ID`, p.`Nombre`,
  COALESCE(SUM(d.`Cantidad`), 0) AS `Total_Unidades_Vendidas`,
  COALESCE(SUM(d.`Cantidad` * d.`Precio_Unitario`), 0) AS `Total_Facturado`
FROM `Producto` p
LEFT JOIN `DetalleVenta` d ON d.`Producto_ID` = p.`Producto_ID`
GROUP BY p.`Producto_ID`, p.`Nombre`;

SET FOREIGN_KEY_CHECKS = 1;
