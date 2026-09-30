# Nanuk Outdoor

Web de Nanuk Outdoor (indumentaria y equipo outdoor, locales en Morón y Miramar). Hecha por Tu Negocio En Las Redes.

- El catálogo vive en `data/productos.json`. La compra sigue en su tienda de Empretienda: cada producto guarda su link.
- **Panel `/admin`**: se pega el link de un producto de Empretienda y `/api/empretienda` trae nombre, precio, stock, talles, colores y foto. Se elige categoría y se publica. (Demo: clave 1234, guarda en el navegador.)
- **Sincronización diaria**: `.github/workflows/sincronizar.yml` corre `scripts/sincronizar.js` a las 6 (AR) y actualiza precios, stock y talles; si un producto se borró en Empretienda, lo oculta. A mano: `npm run sincronizar`.
