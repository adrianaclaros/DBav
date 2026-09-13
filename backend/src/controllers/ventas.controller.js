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
    return res.status(400).json({ message: 'El pedido debe contener al menos un producto valido.' });
  }

  if (!allowedPaymentMethods.includes(metodoPago)) {
    return res.status(400).json({ message: 'El metodo de pago no es valido.' });
  }

  if (nit !== '' && (typeof nit !== 'string' || nit.length > 20)) {
    return res.status(400).json({ message: 'El NIT no es valido.' });
  }

  if (razonSocial !== '' && (typeof razonSocial !== 'string' || razonSocial.length > 100)) {
    return res.status(400).json({ message: 'La razon social no es valida.' });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const productIds = [...new Set(normalizedItems.map((item) => item.producto_id))];
    const placeholders = productIds.map(() => '?').join(', ');
    const [products] = await connection.execute(
      `SELECT Producto_ID, Nombre, Precio_Venta FROM Producto WHERE Activo = 1 AND Producto_ID IN (${placeholders})`,
      productIds
    );

    if (products.length !== productIds.length) {
      await connection.rollback();
      return res.status(400).json({ message: 'Uno o mas productos ya no estan disponibles.' });
    }

    const productMap = new Map(products.map((product) => [product.Producto_ID, product]));
    const detailItems = normalizedItems.map((item) => {
      const product = productMap.get(item.producto_id);
      return {
        producto_id: item.producto_id,
        nombre: product.Nombre,
        cantidad: item.cantidad,
        precio_unitario: Number(product.Precio_Venta),
        subtotal: Number(product.Precio_Venta) * item.cantidad
      };
    });

    const total = detailItems.reduce((sum, item) => sum + item.subtotal, 0);
    const nitValue = nit.trim() || '0';
    const razonSocialValue = razonSocial.trim() || 'Sin Nombre';

    const [ventaResult] = await connection.execute(
      `INSERT INTO Venta (Fecha, Hora, Total, Metodo_Pago, NIT, Razon_Social)
       VALUES (CURDATE(), CURTIME(), ?, ?, ?, ?)`,
      [total.toFixed(2), metodoPago, nitValue, razonSocialValue]
    );

    const ventaId = ventaResult.insertId;

    for (const item of detailItems) {
      await connection.execute(
        `INSERT INTO DetalleVenta (Venta_ID, Producto_ID, Cantidad, Precio_Unitario)
         VALUES (?, ?, ?, ?)`,
        [ventaId, item.producto_id, item.cantidad, item.precio_unitario.toFixed(2)]
      );
    }

    await connection.commit();

    const [savedRows] = await connection.execute(
      `SELECT Venta_ID, Fecha, Hora, Total, Metodo_Pago, NIT, Razon_Social
       FROM Venta WHERE Venta_ID = ?`,
      [ventaId]
    );

    return res.status(201).json({
      message: 'Venta registrada correctamente.',
      venta: savedRows[0],
      items: detailItems
    });
  } catch (error) {
    await connection.rollback();
    return next(error);
  } finally {
    connection.release();
  }
}

async function listVentas(req, res, next) {
  const range = String(req.query.range || 'dia').toLowerCase();
  const conditions = [];
  const params = [];

  if (range === 'dia') {
    conditions.push('v.Fecha = CURDATE()');
  } else if (range === 'semana') {
    conditions.push('YEARWEEK(v.Fecha, 1) = YEARWEEK(CURDATE(), 1)');
  } else if (range === 'mes') {
    conditions.push('YEAR(v.Fecha) = YEAR(CURDATE()) AND MONTH(v.Fecha) = MONTH(CURDATE())');
  } else if (range === 'ano' || range === 'año') {
    conditions.push('YEAR(v.Fecha) = YEAR(CURDATE())');
  } else {
    return res.status(400).json({ message: 'El filtro de periodo no es valido.' });
  }

  try {
    const [rows] = await pool.execute(
      `SELECT v.Venta_ID, v.Fecha, v.Hora, v.Total, v.Metodo_Pago, v.NIT, v.Razon_Social,
              COUNT(dv.DetalleVenta_ID) AS Lineas
       FROM Venta v
       LEFT JOIN DetalleVenta dv ON dv.Venta_ID = v.Venta_ID
       WHERE ${conditions.join(' AND ')}
       GROUP BY v.Venta_ID, v.Fecha, v.Hora, v.Total, v.Metodo_Pago, v.NIT, v.Razon_Social
       ORDER BY v.Fecha DESC, v.Hora DESC, v.Venta_ID DESC`,
      params
    );

    return res.status(200).json({ ventas: rows });
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
