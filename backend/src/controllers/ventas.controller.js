const pool = require('../config/db');


function normalizeItems(items) {

  if (
    !Array.isArray(items) ||
    items.length === 0
  ) {
    return null;
  }


  const normalized =
    items.map((item) => ({

      producto_id:
        Number(
          item.id ??
          item.producto_id
        ),

      cantidad:
        Number(
          item.quantity ??
          item.cantidad
        )

    }));


  if (
    normalized.some(
      (item) =>
        !Number.isInteger(
          item.producto_id
        ) ||
        !Number.isInteger(
          item.cantidad
        ) ||
        item.cantidad <= 0
    )
  ) {

    return null;

  }


  return normalized;

}


// ==========================================
// CREAR VENTA
// ==========================================

async function createVenta(
  req,
  res,
  next
) {

  const {
    metodo_pago: metodoPago,
    nit = '',
    razon_social: razonSocial = '',
    items
  } = req.body || {};


  const normalizedItems =
    normalizeItems(items);


  const allowedPaymentMethods =
    [
      'Efectivo',
      'QR',
      'Tarjeta'
    ];


  if (!normalizedItems) {

    return res.status(400).json({

      message:
        'El pedido debe contener al menos un producto valido.'

    });

  }


  if (
    !allowedPaymentMethods.includes(
      metodoPago
    )
  ) {

    return res.status(400).json({

      message:
        'El metodo de pago no es valido.'

    });

  }


  if (
    nit !== '' &&
    (
      typeof nit !== 'string' ||
      nit.length > 20
    )
  ) {

    return res.status(400).json({

      message:
        'El NIT no es valido.'

    });

  }


  if (
    razonSocial !== '' &&
    (
      typeof razonSocial !== 'string' ||
      razonSocial.length > 100
    )
  ) {

    return res.status(400).json({

      message:
        'La razon social no es valida.'

    });

  }


  // ========================================
  // AGRUPAR PRODUCTOS REPETIDOS
  // ========================================

  const groupedItems =
    new Map();


  for (
    const item of normalizedItems
  ) {

    const currentQuantity =
      groupedItems.get(
        item.producto_id
      ) || 0;


    groupedItems.set(
      item.producto_id,
      currentQuantity +
      item.cantidad
    );

  }


  const finalItems =
    [
      ...groupedItems.entries()
    ].map(
      (
        [
          producto_id,
          cantidad
        ]
      ) => ({

        producto_id,
        cantidad

      })
    );


  const connection =
    await pool.getConnection();


  try {

    await connection.beginTransaction();


    // ======================================
    // OBTENER PRODUCTOS Y BLOQUEARLOS
    // ======================================

    const productIds =
      finalItems.map(
        (item) =>
          item.producto_id
      );


    const placeholders =
      productIds
        .map(() => '?')
        .join(', ');


    const [products] =
      await connection.execute(

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


    if (
      products.length !==
      productIds.length
    ) {

      await connection.rollback();


      return res.status(400).json({

        message:
          'Uno o mas productos no existen.'

      });

    }


    const productMap =
      new Map(

        products.map(
          (product) => [

            product.Producto_ID,
            product

          ]
        )

      );


    // ======================================
    // VERIFICAR STOCK
    // ======================================

    for (
      const item of finalItems
    ) {

      const product =
        productMap.get(
          item.producto_id
        );


      if (
        !product.Activo ||
        Number(product.Stock) <= 0
      ) {

        await connection.rollback();


        return res.status(400).json({

          message:
            `${product.Nombre} ya no esta disponible.`

        });

      }


      if (
        item.cantidad >
        Number(product.Stock)
      ) {

        await connection.rollback();


        return res.status(400).json({

          message:
            `No hay suficiente stock de ${product.Nombre}. Stock disponible: ${product.Stock}.`

        });

      }

    }


    // ======================================
    // PREPARAR DETALLES
    // ======================================

    const detailItems =
      finalItems.map(
        (item) => {

          const product =
            productMap.get(
              item.producto_id
            );


          return {

            producto_id:
              item.producto_id,

            nombre:
              product.Nombre,

            cantidad:
              item.cantidad,

            precio_unitario:
              Number(
                product.Precio_Venta
              ),

            subtotal:
              Number(
                product.Precio_Venta
              ) *
              item.cantidad

          };

        }
      );


    // ======================================
    // CALCULAR TOTAL
    // ======================================

    const total =
      detailItems.reduce(
        (
          sum,
          item
        ) =>
          sum +
          item.subtotal,
        0
      );


    const nitValue =
      nit.trim() || '0';


    const razonSocialValue =
      razonSocial.trim() ||
      'Sin Nombre';


    // ======================================
    // INSERTAR VENTA
    // ======================================

    const [ventaResult] =
      await connection.execute(

        `INSERT INTO Venta
          (
            Fecha,
            Hora,
            Total,
            Metodo_Pago,
            NIT,
            Razon_Social
          )
         VALUES
          (
            CURDATE(),
            CURTIME(),
            ?,
            ?,
            ?,
            ?
          )`,

        [
          total.toFixed(2),
          metodoPago,
          nitValue,
          razonSocialValue
        ]

      );


    const ventaId =
      ventaResult.insertId;


    // ======================================
    // INSERTAR DETALLES
    // ======================================

    for (
      const item of detailItems
    ) {

      await connection.execute(

        `INSERT INTO DetalleVenta
          (
            Venta_ID,
            Producto_ID,
            Cantidad,
            Precio_Unitario
          )
         VALUES
          (
            ?,
            ?,
            ?,
            ?
          )`,

        [
          ventaId,
          item.producto_id,
          item.cantidad,
          item.precio_unitario.toFixed(2)
        ]

      );

    }


    // ======================================
    // DESCONTAR STOCK
    // ======================================

    for (
      const item of detailItems
    ) {

      await connection.execute(

        `UPDATE Producto
         SET
           Stock = Stock - ?,
           Activo = CASE
             WHEN Stock - ? <= 0
             THEN 0
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


    // ======================================
    // CONFIRMAR
    // ======================================

    await connection.commit();


    // ======================================
    // RECUPERAR VENTA
    // ======================================

    const [savedRows] =
      await connection.execute(

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

      message:
        'Venta registrada correctamente.',

      venta:
        savedRows[0],

      items:
        detailItems

    });


  } catch (error) {

    await connection.rollback();

    return next(error);


  } finally {

    connection.release();

  }

}


// ==========================================
// LISTAR / FILTRAR VENTAS
// ==========================================

async function listVentas(
  req,
  res,
  next
) {

  const type =
    String(
      req.query.type || 'dia'
    ).toLowerCase();


  const mode =
    String(
      req.query.mode || 'hoy'
    ).toLowerCase();


  const conditions = [];
  const params = [];


  // ========================================
  // MÉTODO DE PAGO
  // ========================================

  const metodoPago =
    String(
      req.query.metodo_pago || ''
    ).trim();


  if (metodoPago) {

    const allowedPaymentMethods =
      [
        'Efectivo',
        'QR',
        'Tarjeta'
      ];


    if (
      !allowedPaymentMethods.includes(
        metodoPago
      )
    ) {

      return res.status(400).json({

        message:
          'El metodo de pago no es valido.'

      });

    }


    conditions.push(
      'v.Metodo_Pago = ?'
    );


    params.push(
      metodoPago
    );

  }


  // ========================================
  // BÚSQUEDA GENERAL
  // ========================================

  const query =
    String(
      req.query.q || ''
    ).trim();


  if (query) {

    conditions.push(`(
      CAST(v.Venta_ID AS CHAR) LIKE ?
      OR v.NIT LIKE ?
      OR v.Razon_Social LIKE ?
    )`);


    const searchValue =
      `%${query}%`;


    params.push(
      searchValue,
      searchValue,
      searchValue
    );

  }


  // ========================================
  // FILTRO POR DÍA
  // ========================================

  if (type === 'dia') {


    // --------------------------------------
    // HOY
    // --------------------------------------

    if (mode === 'hoy') {

      conditions.push(
        'v.Fecha = CURDATE()'
      );

    }


    // --------------------------------------
    // AYER
    // --------------------------------------

    else if (mode === 'ayer') {

      conditions.push(
        `v.Fecha =
         DATE_SUB(
           CURDATE(),
           INTERVAL 1 DAY
         )`
      );

    }


    // --------------------------------------
    // OTRA FECHA
    // --------------------------------------

    else if (mode === 'custom') {

      const date =
        String(
          req.query.date || ''
        );


      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(
          date
        )
      ) {

        return res.status(400).json({

          message:
            'Debes seleccionar una fecha valida.'

        });

      }


      // IMPORTANTE:
      // Solo se filtra ese día.

      conditions.push(
        'v.Fecha = ?'
      );


      params.push(
        date
      );

    }


    else {

      return res.status(400).json({

        message:
          'La opcion de dia no es valida.'

      });

    }

  }


  // ========================================
  // FILTRO POR SEMANA
  // ========================================

  else if (
    type === 'semana'
  ) {


    // --------------------------------------
    // ESTA SEMANA
    // --------------------------------------

    if (
      mode === 'esta-semana'
    ) {

      conditions.push(`
        YEARWEEK(
          v.Fecha,
          1
        ) =
        YEARWEEK(
          CURDATE(),
          1
        )
      `);

    }


    // --------------------------------------
    // OTRA SEMANA
    // --------------------------------------

    else if (
      mode === 'custom'
    ) {

      const date =
        String(
          req.query.date || ''
        );


      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(
          date
        )
      ) {

        return res.status(400).json({

          message:
            'Debes seleccionar una fecha valida para la semana.'

        });

      }


      /*
       * La fecha seleccionada representa
       * cualquier día de la semana.
       *
       * YEARWEEK(..., 1):
       * la semana comienza el lunes.
       */

      conditions.push(`
        YEARWEEK(
          v.Fecha,
          1
        ) =
        YEARWEEK(
          ?,
          1
        )
      `);


      params.push(
        date
      );

    }


    else {

      return res.status(400).json({

        message:
          'La opcion de semana no es valida.'

      });

    }

  }


  // ========================================
  // FILTRO POR MES
  // ========================================

  else if (
    type === 'mes'
  ) {

    const month =
      String(
        req.query.month || ''
      ).trim();


    // --------------------------------------
    // ESTE MES
    // --------------------------------------

    if (!month) {

      conditions.push(`
        YEAR(v.Fecha) =
          YEAR(CURDATE())
        AND
        MONTH(v.Fecha) =
          MONTH(CURDATE())
      `);

    }


    // --------------------------------------
    // OTRO MES
    // --------------------------------------

    else {

      if (
        !/^\d{4}-\d{2}$/.test(
          month
        )
      ) {

        return res.status(400).json({

          message:
            'El mes seleccionado no es valido.'

        });

      }


      conditions.push(`
        DATE_FORMAT(
          v.Fecha,
          '%Y-%m'
        ) = ?
      `);


      params.push(
        month
      );

    }

  }


  // ========================================
  // FILTRO POR AÑO
  // ========================================

  else if (
    type === 'ano'
  ) {

    const year =
      String(
        req.query.year || ''
      ).trim();


    // --------------------------------------
    // ESTE AÑO
    // --------------------------------------

    if (!year) {

      conditions.push(
        'YEAR(v.Fecha) = YEAR(CURDATE())'
      );

    }


    // --------------------------------------
    // OTRO AÑO
    // --------------------------------------

    else {

      if (
        !/^\d{4}$/.test(
          year
        )
      ) {

        return res.status(400).json({

          message:
            'El año seleccionado no es valido.'

        });

      }


      conditions.push(
        'YEAR(v.Fecha) = ?'
      );


      params.push(
        Number(year)
      );

    }

  }


  // ========================================
  // RANGO DE FECHAS
  // ========================================

  else if (
    type === 'rango'
  ) {

    const from =
      String(
        req.query.from || ''
      ).trim();


    const to =
      String(
        req.query.to || ''
      ).trim();


    if (!from || !to) {

      return res.status(400).json({

        message:
          'Debes seleccionar una fecha inicial y una fecha final.'

      });

    }


    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(from) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(to)
    ) {

      return res.status(400).json({

        message:
          'Las fechas del rango no son validas.'

      });

    }


    if (from > to) {

      return res.status(400).json({

        message:
          'La fecha inicial no puede ser posterior a la fecha final.'

      });

    }


    conditions.push(
      'v.Fecha BETWEEN ? AND ?'
    );


    params.push(
      from,
      to
    );

  }


  // ========================================
  // TIPO DESCONOCIDO
  // ========================================

  else {

    return res.status(400).json({

      message:
        'El tipo de filtro no es valido.'

    });

  }


  // ========================================
  // CONSULTA FINAL
  // ========================================

  try {

    const [rows] =
      await pool.execute(

        `SELECT
            v.Venta_ID,
            v.Fecha,
            v.Hora,
            v.Total,
            v.Metodo_Pago,
            v.NIT,
            v.Razon_Social,
            COUNT(
              dv.DetalleVenta_ID
            ) AS Lineas

         FROM Venta v

         LEFT JOIN DetalleVenta dv
           ON dv.Venta_ID =
              v.Venta_ID

         WHERE
           ${conditions.join(' AND ')}

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

      ventas:
        rows

    });


  } catch (error) {

    return next(error);

  }

}


// ==========================================
// OBTENER UNA VENTA
// ==========================================

async function getVenta(
  req,
  res,
  next
) {

  const ventaId =
    Number(
      req.params.id
    );


  if (
    !Number.isInteger(ventaId) ||
    ventaId <= 0
  ) {

    return res.status(400).json({

      message:
        'El numero de venta no es valido.'

    });

  }


  try {

    const [ventas] =
      await pool.execute(

        `SELECT
            Venta_ID,
            Fecha,
            Hora,
            Total,
            Metodo_Pago,
            NIT,
            Razon_Social

         FROM Venta

         WHERE Venta_ID = ?

         LIMIT 1`,

        [ventaId]

      );


    if (!ventas[0]) {

      return res.status(404).json({

        message:
          'Venta no encontrada.'

      });

    }


    const [items] =
      await pool.execute(

        `SELECT
            dv.Producto_ID,
            p.Nombre,
            dv.Cantidad,
            dv.Precio_Unitario,
            (
              dv.Cantidad *
              dv.Precio_Unitario
            ) AS Subtotal

         FROM DetalleVenta dv

         INNER JOIN Producto p
           ON p.Producto_ID =
              dv.Producto_ID

         WHERE dv.Venta_ID = ?

         ORDER BY
            dv.DetalleVenta_ID`,

        [ventaId]

      );


    return res.status(200).json({

      venta:
        ventas[0],

      items

    });


  } catch (error) {

    return next(error);

  }

}


module.exports = {
  createVenta,
  listVentas,
  getVenta
};