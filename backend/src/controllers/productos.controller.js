const pool = require('../config/db');

async function listProductosDisponibles(req, res, next) {
  try {
    const [productos] = await pool.execute(`
      SELECT
        Producto_ID,
        Nombre,
        Categoria,
        Precio_Venta,
        Stock
      FROM v_productos_disponibles
      ORDER BY Producto_ID
    `);

    return res.status(200).json({ productos });
  } catch (error) {
    return next(error);
  }
}

module.exports = { listProductosDisponibles };