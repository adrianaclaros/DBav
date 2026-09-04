/*
 Navicat Premium Data Transfer

 Source Server         : Conection_1
 Source Server Type    : MySQL
 Source Server Version : 80300
 Source Host           : 200.58.76.201:3307
 Source Schema         : Saltenieria

 Target Server Type    : MySQL
 Target Server Version : 80300
 File Encoding         : 65001

 Date: 03/09/2026 18:11:14
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for DetalleVenta
-- ----------------------------
DROP TABLE IF EXISTS `DetalleVenta`;
CREATE TABLE `DetalleVenta`  (
  `DetalleVenta_ID` int NOT NULL AUTO_INCREMENT,
  `Venta_ID` int NOT NULL,
  `Producto_ID` int NOT NULL,
  `Cantidad` int NOT NULL,
  `Precio_Unitario` decimal(10, 2) NOT NULL,
  PRIMARY KEY (`DetalleVenta_ID`) USING BTREE,
  INDEX `FK_DetalleVenta_Venta`(`Venta_ID` ASC) USING BTREE,
  INDEX `FK_DetalleVenta_Producto`(`Producto_ID` ASC) USING BTREE,
  CONSTRAINT `FK_DetalleVenta_Producto` FOREIGN KEY (`Producto_ID`) REFERENCES `Producto` (`Producto_ID`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `FK_DetalleVenta_Venta` FOREIGN KEY (`Venta_ID`) REFERENCES `Venta` (`Venta_ID`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 206 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for Producto
-- ----------------------------
DROP TABLE IF EXISTS `Producto`;
CREATE TABLE `Producto`  (
  `Producto_ID` int NOT NULL AUTO_INCREMENT,
  `Nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `Categoria` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `Precio_Venta` decimal(10, 2) NOT NULL,
  `Activo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`Producto_ID`) USING BTREE,
  INDEX `idx_Nombre_Producto`(`Nombre` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 17 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for Venta
-- ----------------------------
DROP TABLE IF EXISTS `Venta`;
CREATE TABLE `Venta`  (
  `Venta_ID` int NOT NULL AUTO_INCREMENT,
  `Fecha` date NOT NULL,
  `Hora` time NOT NULL,
  `Total` decimal(10, 2) NOT NULL,
  `Metodo_Pago` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `NIT` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT '0',
  `Razon_Social` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT 'Sin Nombre',
  PRIMARY KEY (`Venta_ID`) USING BTREE,
  INDEX `idx_Venta_Fecha_MetodoPago`(`Fecha` ASC, `Metodo_Pago` ASC) USING BTREE,
  INDEX `idx_Venta_MetodoPago_Total`(`Metodo_Pago` ASC, `Total` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 73 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- View structure for v_productos_disponibles
-- ----------------------------
DROP VIEW IF EXISTS `v_productos_disponibles`;
CREATE ALGORITHM = UNDEFINED SQL SECURITY DEFINER VIEW `v_productos_disponibles` AS select `Producto`.`Producto_ID` AS `Producto_ID`,`Producto`.`Nombre` AS `Nombre`,`Producto`.`Categoria` AS `Categoria`,`Producto`.`Precio_Venta` AS `Precio_Venta` from `Producto` where (`Producto`.`Activo` = 1);

-- ----------------------------
-- View structure for v_registro_venta
-- ----------------------------
DROP VIEW IF EXISTS `v_registro_venta`;
CREATE ALGORITHM = UNDEFINED SQL SECURITY DEFINER VIEW `v_registro_venta` AS select `v`.`Venta_ID` AS `Venta_ID`,`v`.`Fecha` AS `Fecha`,`v`.`Hora` AS `Hora`,`v`.`NIT` AS `NIT`,`v`.`Razon_Social` AS `Razon_Social`,`p`.`Nombre` AS `Producto`,`dv`.`Cantidad` AS `Cantidad`,`dv`.`Precio_Unitario` AS `Precio_Unitario`,(`dv`.`Cantidad` * `dv`.`Precio_Unitario`) AS `Subtotal`,`v`.`Metodo_Pago` AS `Metodo_Pago` from ((`Venta` `v` join `DetalleVenta` `dv` on((`v`.`Venta_ID` = `dv`.`Venta_ID`))) join `Producto` `p` on((`dv`.`Producto_ID` = `p`.`Producto_ID`)));

-- ----------------------------
-- View structure for v_resumen_ventas
-- ----------------------------
DROP VIEW IF EXISTS `v_resumen_ventas`;
CREATE ALGORITHM = UNDEFINED SQL SECURITY DEFINER VIEW `v_resumen_ventas` AS select `v`.`Fecha` AS `Fecha`,`v`.`Metodo_Pago` AS `Metodo_Pago`,count(distinct `v`.`Venta_ID`) AS `Cantidad_Ventas`,sum(`v`.`Total`) AS `Monto_Total_Vendido`,sum(`dv`.`Cantidad`) AS `Unidades_Vendidas`,sum((case when ((`v`.`NIT` is not null) and (`v`.`NIT` <> '0')) then 1 else 0 end)) AS `Cantidad_Ventas_Con_NIT` from (`Venta` `v` join `DetalleVenta` `dv` on((`v`.`Venta_ID` = `dv`.`Venta_ID`))) group by `v`.`Fecha`,`v`.`Metodo_Pago`;

SET FOREIGN_KEY_CHECKS = 1;
