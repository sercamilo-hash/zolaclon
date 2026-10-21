# Z.R.⁺ | NYC ZONING RESOLUTION PLUS

**Z.R.+** es una plataforma de inteligencia y análisis urbanístico para la Ciudad de Nueva York, diseñada con estética minimalista de **hoja de cálculo monocromática (estilo Excel)**, cero radios y tipografía Arial. Integra datos catastrales oficiales de **MapPLUTO**, capas de distritos de zonificación de **NYC Planning Labs** y genera análisis técnicos conforme a las regulaciones de **City of Yes for Housing Opportunity (UAP)**.

---

## 🏛️ Logo & Identidad

```text
┌──────────────────────────────────────────────┐
│  Z.R.⁺  |  ZONING RESOLUTION PLUS           │
└──────────────────────────────────────────────┘
```

---

## ⚡ Características Principales

1. **Búsqueda Instantánea (NYC GeoSearch)**: Búsqueda por dirección postal de NYC o código BBL directo de 10 dígitos.
2. **Mapa Catastral con Capas ZoLa**:
   - Polígono geométrico exacto del lote (`ST_AsGeoJSON` de MapPLUTO).
   - Capa de **Zoning Districts** (distritos R, C, M y mixtos circundantes con etiquetas).
   - Selector de vistas: Monocromático (Carto Positron), Satélite de alta resolución (Esri) y OpenStreetMap.
3. **Cálculos Automáticos de Zonificación**:
   - Floor Area Ratio (FAR): Standard vs. UAP (+20% con bonus de vivienda asequible).
   - Deducción permitida para amenidades (5%) y recreación requerida (3%).
   - Densidad máxima permitida (factor 680 sf/unidad).
   - Dotación requerida de estacionamiento vehicular y para bicicletas.
4. **Calculadora Nivel por Nivel (Building A & Building B)**:
   - Deducciones por ductos (chase walls), cuartos mecánicos, parqueaderos, bodegas de basura (3 sf/unidad) y pasillos.
   - Deducción del 5% de eficiencia energética (*5% Energy Deduction*).
   - Mix de unidades (Studio, 1BR, 2BR, Total).
   - Cálculo del programa 485x / unidades asequibles.
5. **Matriz de Cláusulas ZR**:
   - Tabla con los artículos oficiales de la NYC Zoning Resolution (ZR 123, ZR 22, ZR 23, ZR 25, ZR 27 UAP, etc.).
6. **Exportación 1:1 a Hoja de Cálculo**:
   - `ZR_PLUS_ANALYSIS_[BLOCK]_[LOT].csv`: Idéntico al formato oficial personalizado.
   - `ZR_PLUS_ANALYSIS_[BLOCK]_[LOT].xlsx`: Libro de Microsoft Excel.

---

## 🚀 Despliegue en Vercel

1. Entra a [https://vercel.com/new](https://vercel.com/new) con tu cuenta de GitHub.
2. Importa el repositorio **`sercamilo-hash/zr-plus`**.
3. Haz clic en **Deploy**.
