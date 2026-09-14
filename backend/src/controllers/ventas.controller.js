const pool = require('../config/db');

function normalizeItems(items) {
  if (!Array.isArray(items) || items.length === 0) return null;

  const normalized = items.map((item) => ({
    producto_id: Number(item.id ?? item.producto_id),
    cantidad: Number(item.quantity ?? item.cantidad)
  }));

  if (normalized.some((item) => !Number.isInteger(item.producto_id) || !Number.isInteger(item.cantidad) || item.cantidad <= 0)) {
    return null;
  }

  return normalized;
}

async function createVenta(req, res, next) {
  const {
    metodo_pago: metodoPago,
    nit = '',
    razon_social: razonSocial = '',
    items
  } = req.body || {};

  const normalizedItems = normalizeItems(items);
  const allowedPaymentMethods = ['Efectivo', 'QR', 'Tarjeta'];

  if (!normalizedItems) {
    return res.status(400).json({
      message: 'El pedido debe contener al menos un producto valido.'
    });
  }

  if (!allowedPaymentMethods.includes(metodoPago)) {
    return res.status(400).json({
      message: 'El metodo de pago no es valido.'
    });
  }

  if (nit !== '' && (typeof nit !== 'string' || nit.length > 20)) {
    return res.status(400).json({
      message: 'El NIT no es valido.'
    });
  }

  if (
    razonSocial !== '' &&
    (typeof razonSocial !== 'string' || razonSocial.length > 100)
  ) {
    return res.status(400).json({
      message: 'La razon social no es valida.'
    });
  }

  /*
   * Agrupamos productos repetidos.
   * Por ejemplo:
   * producto 1 x2 + producto 1 x3 = producto 1 x5
   */
  const groupedItems = new Map();

  for (const item of normalizedItems) {
    const currentQuantity = groupedItems.get(item.producto_id) || 0;
    groupedItems.set(
      item.producto_id,
      currentQuantity + item.cantidad
    );
  }

  const finalItems = [...groupedItems.entries()].map(
    ([producto_id, cantidad]) => ({
      producto_id,
      cantidad
    })
  );

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    /*
     * Buscamos los productos y BLOQUEAMOS sus filas
     * mientras se procesa esta venta.
     *
     * Esto evita que dos ventas simultaneas puedan
     * descontar el mismo stock incorrectamente.
     */
    const productIds = finalItems.map((item) => item.producto_id);
    const placeholders = productIds.map(() => '?').join(', ');

    const [products] = await connection.execute(
      `SELECT
          Producto_ID,
          Nombre,
          Precio_Venta,
          Stock,
          Activo
       FROM Producto
       WHERE Producto_ID IN (${placeholders})
       FOR UPDATE`,
      productIds
    );

    /*
     * Verificamos que todos los productos existan.
     */
    if (products.length !== productIds.length) {
      await connection.rollback();

      return res.status(400).json({
        message: 'Uno o mas productos no existen.'
      });
    }

    const productMap = new Map(
      products.map((product) => [
        product.Producto_ID,
        product
      ])
    );

    /*
     * Verificamos disponibilidad y stock suficiente.
     */
    for (const item of finalItems) {
      const product = productMap.get(item.producto_id);

      if (!product.Activo || Number(product.Stock) <= 0) {
        await connection.rollback();

        return res.status(400).json({
          message: `${product.Nombre} ya no esta disponible.`
        });
      }

      if (item.cantidad > Number(product.Stock)) {
        await connection.rollback();

        return res.status(400).json({
          message: `No hay suficiente stock de ${product.Nombre}. Stock disponible: ${product.Stock}.`
        });
      }
    }

    /*
     * Preparamos los detalles de la venta
     * utilizando los precios directamente de la BD.
     */
    const detailItems = finalItems.map((item) => {
      const product = productMap.get(item.producto_id);

      return {
        producto_id: item.producto_id,
        nombre: product.Nombre,
        cantidad: item.cantidad,
        precio_unitario: Number(product.Precio_Venta),
        subtotal:
          Number(product.Precio_Venta) * item.cantidad
      };
    });

    /*
     * Calculamos el total en el backend.
     */
    const total = detailItems.reduce(
      (sum, item) => sum + item.subtotal,
      0
    );

    const nitValue = nit.trim() || '0';
    const razonSocialValue =
      razonSocial.trim() || 'Sin Nombre';

    /*
     * 1. Registramos la venta.
     */
    const [ventaResult] = await connection.execute(
      `INSERT INTO Venta
        (Fecha, Hora, Total, Metodo_Pago, NIT, Razon_Social)
       VALUES
        (CURDATE(), CURTIME(), ?, ?, ?, ?)`,
      [
        total.toFixed(2),
        metodoPago,
        nitValue,
        razonSocialValue
      ]
    );

    const ventaId = ventaResult.insertId;

    /*
     * 2. Registramos los productos vendidos.
     */
    for (const item of detailItems) {
      await connection.execute(
        `INSERT INTO DetalleVenta
          (Venta_ID, Producto_ID, Cantidad, Precio_Unitario)
         VALUES
          (?, ?, ?, ?)`,
        [
          ventaId,
          item.producto_id,
          item.cantidad,
          item.precio_unitario.toFixed(2)
        ]
      );
    }

    /*
     * 3. Descontamos el stock.
     *
     * Si después de la venta queda 0,
     * también ponemos Activo = 0.
     */
    for (const item of detailItems) {
      await connection.execute(
        `UPDATE Producto
         SET
           Stock = Stock - ?,
           Activo = CASE
             WHEN Stock - ? <= 0 THEN 0
             ELSE 1
           END
         WHERE Producto_ID = ?`,
        [
          item.cantidad,
          item.cantidad,
          item.producto_id
        ]
      );
    }

    /*
     * 4. Confirmamos TODO.
     */
    await connection.commit();

    /*
     * Recuperamos la venta guardada para enviarla
     * al frontend y mostrar la factura.
     */
    const [savedRows] = await connection.execute(
      `SELECT
          Venta_ID,
          Fecha,
          Hora,
          Total,
          Metodo_Pago,
          NIT,
          Razon_Social
       FROM Venta
       WHERE Venta_ID = ?`,
      [ventaId]
    );

    return res.status(201).json({
      message: 'Venta registrada correctamente.',
      venta: savedRows[0],
      items: detailItems
    });

  } catch (error) {
    /*
     * Si algo falla, deshacemos toda la operación.
     *
     * Así no queda una venta registrada sin descontar
     * stock, ni stock descontado sin registrar la venta.
     */
    await connection.rollback();
    return next(error);

  } finally {
    connection.release();
  }
}

async function listVentas(req, res, next) {
  const type = String(req.query.type || 'dia').toLowerCase();
  const mode = String(req.query.mode || 'hoy').toLowerCase();

  const conditions = [];
  const params = [];

  /*
   * Búsqueda general:
   * N° de venta, NIT o Razón Social.
   */
  const query = String(req.query.q || '').trim();

  if (query) {
    conditions.push(`(
      CAST(v.Venta_ID AS CHAR) LIKE ?
      OR v.NIT LIKE ?
      OR v.Razon_Social LIKE ?
    )`);

    const searchValue = `%${query}%`;

    params.push(
      searchValue,
      searchValue,
      searchValue
    );
  }

  /*
   * FILTRO POR DÍA
   *
   * dia + hoy
   * dia + ayer
   * dia + custom + date=YYYY-MM-DD
   */
  if (type === 'dia') {

    if (mode === 'hoy') {

      conditions.push('v.Fecha = CURDATE()');

    } else if (mode === 'ayer') {

      conditions.push(
        'v.Fecha = DATE_SUB(CURDATE(), INTERVAL 1 DAY)'
      );

    } else if (mode === 'custom') {
  const date = String(req.query.date || '');

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({
      message: 'Debes seleccionar una fecha valida para la semana.'
    });
  }

  conditions.push(`
    v.Fecha BETWEEN ? AND DATE_ADD(?, INTERVAL 6 DAY)
  `);

  params.push(date, date);
} else {

      return res.status(400).json({
        message: 'La opcion de dia no es valida.'
      });
    }
  }

  /*
   * FILTRO POR SEMANA
   *
   * semana + esta-semana
   * semana + custom + date=YYYY-MM-DD
   *
   * La semana comienza el lunes.
   */
  else if (type === 'semana') {

    if (mode === 'esta-semana') {

      conditions.push(`
        YEARWEEK(v.Fecha, 1) = YEARWEEK(CURDATE(), 1)
      `);

    } else if (mode === 'custom') {

      const date = String(req.query.date || '');

      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({
          message: 'Debes seleccionar una fecha valida para la semana.'
        });
      }

      /*
       * Semana que contiene la fecha seleccionada:
       * lunes 00:00 hasta domingo 23:59.
       */
      conditions.push(`
        YEARWEEK(v.Fecha, 1) = YEARWEEK(?, 1)
      `);

      params.push(date);

    } else {

      return res.status(400).json({
        message: 'La opcion de semana no es valida.'
      });
    }
  }

  /*
   * FILTRO POR MES
   *
   * mes + sin month = este mes
   * mes + month=YYYY-MM = mes específico
   */
  else if (type === 'mes') {

    const month = String(req.query.month || '').trim();

    if (!month) {

      conditions.push(`
        YEAR(v.Fecha) = YEAR(CURDATE())
        AND MONTH(v.Fecha) = MONTH(CURDATE())
      `);

    } else {

      if (!/^\d{4}-\d{2}$/.test(month)) {
        return res.status(400).json({
          message: 'El mes seleccionado no es valido.'
        });
      }

      conditions.push(`
        DATE_FORMAT(v.Fecha, '%Y-%m') = ?
      `);

      params.push(month);
    }
  }

  /*
   * FILTRO POR AÑO
   *
   * ano + sin year = este año
   * ano + year=2025 = año específico
   */
  else if (type === 'ano') {

    const year = String(req.query.year || '').trim();

    if (!year) {

      conditions.push(
        'YEAR(v.Fecha) = YEAR(CURDATE())'
      );

    } else {

      if (!/^\d{4}$/.test(year)) {
        return res.status(400).json({
          message: 'El año seleccionado no es valido.'
        });
      }

      conditions.push('YEAR(v.Fecha) = ?');
      params.push(Number(year));
    }
  }

  /*
   * FILTRO POR RANGO DE FECHAS
   *
   * from=YYYY-MM-DD
   * to=YYYY-MM-DD
   */
  else if (type === 'rango') {

    const from = String(req.query.from || '').trim();
    const to = String(req.query.to || '').trim();

    if (!from || !to) {
      return res.status(400).json({
        message: 'Debes seleccionar una fecha inicial y una fecha final.'
      });
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(from) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(to)
    ) {
      return res.status(400).json({
        message: 'Las fechas del rango no son validas.'
      });
    }

    if (from > to) {
      return res.status(400).json({
        message: 'La fecha inicial no puede ser posterior a la fecha final.'
      });
    }

    conditions.push(
      'v.Fecha BETWEEN ? AND ?'
    );

    params.push(from, to);
  }

  /*
   * Si llega un tipo de filtro que no conocemos.
   */
  else {

    return res.status(400).json({
      message: 'El tipo de filtro no es valido.'
    });
  }

  try {

    const [rows] = await pool.execute(
      `SELECT
          v.Venta_ID,
          v.Fecha,
          v.Hora,
          v.Total,
          v.Metodo_Pago,
          v.NIT,
          v.Razon_Social,
          COUNT(dv.DetalleVenta_ID) AS Lineas
       FROM Venta v
       LEFT JOIN DetalleVenta dv
         ON dv.Venta_ID = v.Venta_ID
       WHERE ${conditions.join(' AND ')}
       GROUP BY
          v.Venta_ID,
          v.Fecha,
          v.Hora,
          v.Total,
          v.Metodo_Pago,
          v.NIT,
          v.Razon_Social
       ORDER BY
          v.Fecha DESC,
          v.Hora DESC,
          v.Venta_ID DESC`,
      params
    );

    return res.status(200).json({
      ventas: rows
    });

  } catch (error) {
    return next(error);
  }
}


async function getVenta(req, res, next) {
  const ventaId = Number(req.params.id);
  if (!Number.isInteger(ventaId) || ventaId <= 0) {
    return res.status(400).json({ message: 'El numero de venta no es valido.' });
  }

  try {
    const [ventas] = await pool.execute(
      `SELECT Venta_ID, Fecha, Hora, Total, Metodo_Pago, NIT, Razon_Social
       FROM Venta WHERE Venta_ID = ? LIMIT 1`,
      [ventaId]
    );

    if (!ventas[0]) return res.status(404).json({ message: 'Venta no encontrada.' });

    const [items] = await pool.execute(
      `SELECT dv.Producto_ID, p.Nombre, dv.Cantidad, dv.Precio_Unitario,
              (dv.Cantidad * dv.Precio_Unitario) AS Subtotal
       FROM DetalleVenta dv
       INNER JOIN Producto p ON p.Producto_ID = dv.Producto_ID
       WHERE dv.Venta_ID = ?
       ORDER BY dv.DetalleVenta_ID`,
      [ventaId]
    );

    return res.status(200).json({ venta: ventas[0], items });
  } catch (error) {
    return next(error);
  }
}

module.exports = { createVenta, listVentas, getVenta };
