const pool = require('../config/db');

/*
 * Métodos de pago soportados por el sistema.
 * Se usan para completar con 0 los métodos que no
 * tuvieron ventas hoy (y así siempre devolver los 3).
 */
const METODOS_PAGO = ['Efectivo', 'QR', 'Tarjeta'];

async function getDashboard(req, res, next) {
  /*
   * Días a considerar para el gráfico de tendencia de ventas.
   * Por defecto 7, con un rango razonable de 1 a 90.
   */
  const diasTendencia = Math.min(
    Math.max(Number(req.query.dias) || 7, 1),
    90
  );

  /*
   * Ventana de tiempo para "producto más vendido" y el
   * gráfico de productos más vendidos. Por defecto 30 días.
   */
  const diasProductos = Math.min(
    Math.max(Number(req.query.diasProductos) || 30, 1),
    365
  );

  try {
    /*
     * 1. Ventas del día: total facturado y cantidad de pedidos.
     */
    const [[resumenHoy]] = await pool.query(
      `SELECT
          COUNT(*) AS cantidadPedidos,
          COALESCE(SUM(Total), 0) AS totalVendido
       FROM Venta
       WHERE Fecha = CURDATE()`
    );

    /*
     * 2. Total vendido por método de pago, solo del día de hoy.
     */
    const [pagosHoyRows] = await pool.query(
  `SELECT
      Metodo_Pago,
      COALESCE(SUM(Total), 0) AS total,
      COUNT(*) AS cantidadPagos
   FROM Venta
   WHERE Fecha = CURDATE()
   GROUP BY Metodo_Pago`
    );

    const pagosPorMetodo = Object.fromEntries(
  METODOS_PAGO.map((metodo) => [
    metodo,
    {
      total: 0,
      cantidadPagos: 0
    }
  ])
);

for (const row of pagosHoyRows) {
  if (Object.prototype.hasOwnProperty.call(pagosPorMetodo, row.Metodo_Pago)) {
    pagosPorMetodo[row.Metodo_Pago] = {
      total: Number(row.total),
      cantidadPagos: Number(row.cantidadPagos)
    };
  }
}

    /*
     * 3. Producto más vendido dentro de la ventana configurada
     *    (por defecto, Hoy), medido en unidades.
     */
    const [productoTopRows] = await pool.query(
  `SELECT p.Nombre, SUM(dv.Cantidad) AS unidades
   FROM DetalleVenta dv
   INNER JOIN Venta v ON v.Venta_ID = dv.Venta_ID
   INNER JOIN Producto p ON p.Producto_ID = dv.Producto_ID
   WHERE v.Fecha = CURDATE()
   GROUP BY p.Producto_ID, p.Nombre
   ORDER BY unidades DESC
   LIMIT 1`
    );

    const productoMasVendido = productoTopRows[0]
      ? {
          nombre: productoTopRows[0].Nombre,
          unidades: Number(productoTopRows[0].unidades)
        }
      : null;

    /*
     * 4. Ventas de los últimos N días para el gráfico de tendencia.
     *
     * Generamos la serie completa de fechas (incluso las que no
     * tuvieron ventas) con un CTE recursivo, para que el gráfico
     * no tenga huecos.
     */
    const [tendenciaRows] = await pool.query(
      `WITH RECURSIVE dias AS (
          SELECT DATE_SUB(CURDATE(), INTERVAL ? DAY) AS Fecha
          UNION ALL
          SELECT DATE_ADD(Fecha, INTERVAL 1 DAY)
          FROM dias
          WHERE Fecha < CURDATE()
       )
       SELECT
          d.Fecha,
          COALESCE(SUM(v.Total), 0) AS total,
          COUNT(v.Venta_ID) AS cantidadPedidos
       FROM dias d
       LEFT JOIN Venta v ON v.Fecha = d.Fecha
       GROUP BY d.Fecha
       ORDER BY d.Fecha`,
      [diasTendencia - 1]
    );

    const ventasUltimosDias = tendenciaRows.map((row) => ({
      fecha: row.Fecha,
      total: Number(row.total),
      cantidadPedidos: Number(row.cantidadPedidos)
    }));

    /*
     * 5. Top 5 productos más vendidos (en unidades) dentro de la
     *    misma ventana usada para "producto más vendido".
     */
    const [topProductosRows] = await pool.query(
      `SELECT p.Nombre, SUM(dv.Cantidad) AS unidades
       FROM DetalleVenta dv
       INNER JOIN Venta v ON v.Venta_ID = dv.Venta_ID
       INNER JOIN Producto p ON p.Producto_ID = dv.Producto_ID
       WHERE v.Fecha >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY p.Producto_ID, p.Nombre
       ORDER BY unidades DESC
       LIMIT 5`,
      [diasProductos]
    );

    const productosMasVendidos = topProductosRows.map((row) => ({
      nombre: row.Nombre,
      unidades: Number(row.unidades)
    }));

    return res.status(200).json({
      ventasHoy: {
        total: Number(resumenHoy.totalVendido),
        cantidadPedidos: Number(resumenHoy.cantidadPedidos)
      },
      pagosPorMetodo,
      productoMasVendido,
      ventasUltimosDias,
      productosMasVendidos,
      ventanaProductosDias: diasProductos
    });

  } catch (error) {
    return next(error);
  }
}

module.exports = { getDashboard };
