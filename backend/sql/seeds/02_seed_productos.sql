-- Catálogo inicial para una instalación nueva de Salteñas Cuzque.
-- INSERT IGNORE preserva productos existentes y no sobrescribe precios ni stock.
USE `Saltenieria`;

INSERT IGNORE INTO `Producto`
  (`Producto_ID`, `Nombre`, `Categoria`, `Precio_Venta`, `Stock`, `Activo`)
VALUES
  (1, 'Salteña de pollo/dulce', 'Salteña', 7.00, 30, 1),
  (2, 'Salteña de carne', 'Salteña', 7.00, 28, 1),
  (3, 'Salteña mixta', 'Salteña', 8.00, 20, 1),
  (4, 'Salteña picante', 'Salteña', 7.00, 25, 1),
  (5, 'Empanada de queso', 'Empanada', 6.00, 18, 1),
  (6, 'Empanada de pollo', 'Empanada', 6.00, 19, 1),
  (7, 'Pan', 'Pan', 1.00, 41, 1),
  (8, 'Coca-Cola Personal 300 ml', 'Gaseosa', 4.00, 18, 1),
  (9, 'Coca-Cola Familiar 2 L', 'Gaseosa', 12.00, 9, 1),
  (10, 'Fanta Personal 300 ml', 'Gaseosa', 4.00, 20, 1),
  (11, 'Fanta Familiar 2 L', 'Gaseosa', 12.00, 10, 1),
  (12, 'Mocochinchi', 'Jugo', 5.00, 13, 1),
  (13, 'Canela', 'Jugo', 5.00, 14, 1),
  (14, 'Cebada', 'Jugo', 5.00, 13, 1),
  (15, 'Salteña de fricase', 'Salteña', 8.00, 19, 1),
  (16, 'Salteña extra-picante', 'Salteña', 8.00, 20, 1);
