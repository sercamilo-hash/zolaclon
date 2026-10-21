# NYC ZoLa Clone & Zoning Resolution Generator

Este proyecto es un clon personalizado de **ZoLa (NYC Planning Labs)** diseñado específicamente para extraer datos catastrales y de zonificación oficiales de la Ciudad de Nueva York (**MapPLUTO** y **NYC GeoSearch**) y generar automáticamente tu formato exacto de **ZONING ANALYSIS** (CSV y Excel).

---

## 🚀 Cómo Iniciar la Aplicación

El servidor ya se encuentra en ejecución en tu máquina:
👉 **[http://localhost:3000](http://localhost:3000)**

Para iniciarlo manualmente en cualquier momento desde la terminal:
```bash
cmd /c npm start
# o directamente:
node server.js
```

---

## 🎯 ¿Qué hace este clon?

1. **Búsqueda en tiempo real (NYC GeoSearch API)**:
   - Permite buscar por cualquier dirección de NYC (ejemplo: `604 Union Street, Brooklyn`, `120 Broadway`, etc.) o ingresar directamente un código BBL de 10 dígitos (ej: `4161300035`).
2. **Extracción y normalización de datos de MapPLUTO (ZoLa)**:
   - Extrae automáticamente:
     - **Borough, Block, Lot (BBL)**
     - **Zoning Districts** (ej: `R6`, `M1-4/R7A`, `C5-5`, etc.)
     - **Special Purpose Districts** (ej: Gowanus Mixed-Use, Downtown Jamaica, Lower Manhattan, etc.)
     - **Total Lot Area, Lot Frontage, Lot Depth**
     - **Tipo de Lote** (*Interior, Corner, Through Lot*)
     - **Shallow Lot Check** (profundidad $\le 90$ pies)
     - **Riesgos y Designaciones** (*High Flood Risk, OER Hazmat/E-Designation, MIH Site, Transit Zone*)
3. **Cálculos de Zonificación Automáticos (City of Yes & UAP)**:
   - **Floor Area Ratio (FAR)**: Standard vs. UAP (+20% con bonus de vivienda asequible).
   - **Zoning Floor Area (ZFA)** máxima permitida y remanente.
   - **Deducción de amenidades permitidas (5%)** y **Recreación requerida (3%)**.
   - **Densidad máxima** (Dwelling Unit Factor de 680 sf/unidad).
   - **Estacionamiento vehicular y de bicicletas** (1 cada 2 unidades).
4. **Calculadora Interactiva de Edificios (Building A & Building B)**:
   - Nivel por nivel (Cellar, 1st, 2nd, ... Roof).
   - Deducciones automáticas: *Chase walls, Mechanical, Parking, Bike parking, Amenities, Corridors (50% hasta 100'), Refuse (3 sf/unidad)*.
   - Deducción del 5% de eficiencia energética (*5% Energy Deduction*).
   - Mix de unidades (*Studio, 1BR, 2BR, Total*).
   - Totales consolidados y estimación de unidades 485x / asequibles.
5. **Matriz de Cláusulas ZR (NYC Zoning Resolution)**:
   - Artículos precargados adaptados al distrito (ZR 123, ZR 22, ZR 32, ZR 23-12, ZR 23-22, ZR 23-432, ZR 25-211, ZR 27-10 UAP, etc.).
6. **Exportación al formato exacto**:
   - Botón **"Exportar CSV (Tu Formato)"**: genera el archivo con la estructura exacta que proporcionaste.
   - Botón **"Excel (.xlsx)"**: genera una hoja de cálculo formateada lista para compartir.
   - Botón **"Imprimir"**: ficha técnica lista para PDF.

---

## 📁 Archivos del Proyecto

- `server.js`: Servidor Express con endpoints de búsqueda, consulta de MapPLUTO y generador CSV.
- `zoningRules.js`: Motor de reglas y tablas de zonificación de NYC (alturas, bases, FAR standard y UAP, densidad).
- `csvExporter.js`: Generador que reproduce fielmente la disposición de filas y columnas de tu plantilla.
- `public/index.html`: Interfaz de usuario con mapa interactivo y pestañas de trabajo.
- `public/app.js`: Lógica cliente (búsqueda con autocompletado, interactividad del mapa y recálculos en vivo).
- `sample_zoning_analysis_template.csv`: Tu plantilla de referencia guardada en el proyecto.
