-- Migración no destructiva para la base de datos existente Saltenieria.
-- No modifica las tablas Producto, Venta ni DetalleVenta.

CREATE TABLE IF NOT EXISTS `Usuario` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(255) UNIQUE NOT NULL,
  `password_hash` VARCHAR(60) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

-- Usuario de prueba: contraseña 123456 (hash bcrypt de 60 caracteres).
-- La condición evita duplicarlo si el script se ejecuta más de una vez.
INSERT INTO `Usuario` (`email`, `password_hash`)
SELECT 'admin@saltenieria.com', '$2a$12$GeQ7EKkHT5M.4ZCYpZaf6uGWFdaoxv.zOyyaTnu.1H33gt3lbwdwq'
WHERE NOT EXISTS (
  SELECT 1 FROM `Usuario` WHERE `email` = 'admin@saltenieria.com'
);
