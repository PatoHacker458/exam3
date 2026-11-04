# Portal Académico SII ITC — TecNM en Celaya (Examen 3)

Aplicación web Full-Stack que consume los servicios REST oficiales del **Sistema Integral de Información (SII) del Tecnológico Nacional de México en Celaya** (`https://sii.celaya.tecnm.mx/api`), implementando una **arquitectura de dos capas de Backend (BFF / Proxy Seguro)** y una interfaz reactiva moderna con **React + Vite + Tailwind CSS**.

---

## 1. Arquitectura del Sistema (Dos Capas de Backend)

```text
[ Navegador del Estudiante (React + Vite SPA :5173) ]
                         │
                         │  Peticiones HTTP + Header Authorization: Bearer <JWT>
                         ▼
[ Capa 1: Backend Local Propio / BFF (Node.js + Express :4000) ]
         ├── /api/sii/*   ──► [ Capa 2: API Institucional SII ITC (https://sii.celaya.tecnm.mx/api) ]
         └── /api/extra/* ──► [ Persistencia Propia Supabase + Edge Functions (Punto 5 - LinceHub) ]
```

### Decisiones Técnicas y Justificación del Stack
- **Frontend — React + Vite + Tailwind CSS**:
  - Elegido de la tabla oficial de tecnologías permitidas por su **arranque instantáneo con HMR (Hot Module Replacement)**, empaquetado optimizado con Rollup y ausencia de sobrecarga de configuración para Single Page Applications (SPA) altamente interactivas.
  - **React Router DOM v7**: Navegación fluida sin recargas de página entre `Login`, `Dashboard`, `Calificaciones`, `Kardex`, `Horarios` y `LinceHub`, con protección de rutas privadas mediante `ProtectedRoute`.
  - **Tailwind CSS v4 + Lucide React**: Diseño responsivo con identidad institucional Lince (TecNM Celaya), indicadores visuales tipo semáforo y componentes `Skeleton` de carga.
- **Backend Intermedio — Node.js + Express**:
  - Actúa como intermediario seguro entre el cliente web y `https://sii.celaya.tecnm.mx/api`, evitando problemas de CORS en el navegador, normalizando códigos de estado HTTP del SII (como respuestas `200 OK` cuyo payload interno reporta `status: 401`), aplicando cabeceras de seguridad (`Helmet`), control de tasa (`express-rate-limit`) y alojando la lógica de negocio adicional del Punto 5 (`/api/extra`).

---

## 2. Estructura del Monorepo y Flujo de Trabajo en Equipo (Sin Conflictos de Merge)

```text
/
├── docker-compose.yml
├── render.yaml
├── .env.example
├── README.md
├── supabase/
│   └── functions/
│       └── academic-advisor/
│           └── index.ts          # Cascarón listo para el Integrante 2 (Punto 5)
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── server.js             # Express app en puerto 4000, CORS, monta /api/sii y /api/extra
│       ├── config/
│       │   └── supabase.js       # Cliente de Supabase opcional con fallback si no hay keys
│       ├── middleware/
│       │   └── auth.middleware.js # Verifica header Authorization: Bearer <token>
│       └── routes/
│           ├── sii.routes.js     # Proxy completo hacia https://sii.celaya.tecnm.mx/api (INTEGRANTE 1)
│           └── extra.routes.js   # Cascarón con endpoints base para Punto 5 (INTEGRANTE 2)
└── frontend/
    ├── Dockerfile
    ├── nginx.conf                # Configuración Nginx con soporte SPA y cabeceras de seguridad
    ├── package.json
    ├── vite.config.js            # Puerto 5173, host: true para Docker
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx               # Define TODAS las rutas (Puntos 1 al 5)
        ├── index.css             # Tailwind CSS configurado
        ├── context/
        │   └── AuthContext.jsx   # Manejo de sesión, token JWT en localStorage, login, logout
        ├── services/
        │   └── api.js            # Instancia Axios hacia VITE_API_URL con interceptor Bearer
        ├── components/
        │   ├── ProtectedRoute.jsx
        │   ├── Navbar.jsx        # Navegación fluida a todas las secciones (Puntos 2 al 5)
        │   └── ui/
        │       └── Skeleton.jsx
        └── pages/
            ├── LoginPage.jsx          # INTEGRANTE 1 (Completo - Punto 1)
            ├── DashboardPage.jsx      # INTEGRANTE 1 (Completo - Punto 2)
            ├── CalificacionesPage.jsx # INTEGRANTE 1 (Completo - Punto 3)
            ├── KardexPage.jsx         # CASCARÓN PARA INTEGRANTE 2 (Punto 4)
            ├── HorariosPage.jsx       # CASCARÓN PARA INTEGRANTE 2 (Punto 4)
            └── ExtraFeaturePage.jsx   # CASCARÓN PARA INTEGRANTE 2 (Punto 5)
```

### División de Archivos por Integrante
| Integrante | Responsabilidad | Archivos Asignados |
| :--- | :--- | :--- |
| **Integrante 1** | Arquitectura Docker/Render, Proxy SII completo, Punto 1 (Auth), Punto 2 (Dashboard Estudiante) y Punto 3 (Calificaciones con Semáforo). | `docker-compose.yml`, `render.yaml`, `backend/src/server.js`, `backend/src/routes/sii.routes.js`, `frontend/src/App.jsx`, `LoginPage.jsx`, `DashboardPage.jsx`, `CalificacionesPage.jsx` |
| **Integrante 2** | Punto 4 (Kardex y Horarios) y Punto 5 (Funcionalidad Adicional LinceHub + Supabase + Edge Function). | `frontend/src/pages/KardexPage.jsx`, `frontend/src/pages/HorariosPage.jsx`, `frontend/src/pages/ExtraFeaturePage.jsx`, `backend/src/routes/extra.routes.js`, `supabase/functions/academic-advisor/index.ts` |

---

## 3. Instrucciones de Instalación y Ejecución

### Opción A: Ejecución con Docker Compose (Recomendada)

1. Clonar el repositorio y ubicarse en la raíz del proyecto:
   ```bash
   cp .env.example .env
   ```
2. Construir y levantar los contenedores:
   ```bash
   docker compose up --build
   ```
3. Acceder a los servicios:
   - **Frontend Web (React + Vite)**: `http://localhost:5173`
   - **Backend Intermedio (API Proxy + Healthcheck)**: `http://localhost:4000/api/health`

### Opción B: Ejecución Manual en Entorno Local

1. **Iniciar el Backend Intermedio (Puerto 4000)**:
   ```bash
   cd backend
   cp .env.example .env
   npm install
   npm run dev
   ```
2. **Iniciar el Frontend (Puerto 5173)**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

---

## 4. Referencia de Endpoints del Backend Intermedio (`/api/sii`)

| Método | Ruta Backend Local | Endpoint Oficial SII ITC | Autenticación | Estado |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/sii/login` | `POST /api/login` | JSON `{ email, password }` | Completo |
| `GET` | `/api/sii/estudiante` | `GET /api/movil/estudiante` | `Bearer <token>` | Completo |
| `GET` | `/api/sii/calificaciones` | `GET /api/movil/estudiante/calificaciones` | `Bearer <token>` | Completo |
| `GET` | `/api/sii/kardex` | `GET /api/movil/estudiante/kardex` | `Bearer <token>` | Proxy Listo |
| `GET` | `/api/sii/horarios` | `GET /api/movil/estudiante/horarios` | `Bearer <token>` | Proxy Listo |

---

## 5. Despliegue en la Nube (Render / Vercel)

El repositorio incluye el archivo Blueprint [`render.yaml`](./render.yaml) para desplegar automáticamente tanto el servicio web del Backend (`sii-itc-backend`) como el sitio estático del Frontend (`sii-itc-frontend`) en **Render**:
1. En Render Dashboard, seleccionar **New +** -> **Blueprint**.
2. Conectar el repositorio de GitHub.
3. Configurar la variable `VITE_API_URL` apuntando a la URL pública del backend desplegado y `CORS_ORIGIN` con la URL del frontend.

---

## 6. Capturas de Pantalla del Funcionamiento

> *(Espacio reservado para insertar las capturas de pantalla de la demostración en vivo con credenciales reales del SII ITC antes de la entrega final)*
>
> - **1. Inicio de Sesión Institucional (`/login`)**: Validación de campos, manejo de errores y obtención de JWT.
> - **2. Dashboard del Estudiante (`/dashboard`)**: Perfil institucional, tarjetas KPI, avance de créditos y skeleton loader.
> - **3. Calificaciones (`/calificaciones`)**: Filtrado en tiempo real por materia/periodo y semáforo de desempeño (Verde / Amarillo / Rojo).
> - **4. Kardex y Horario (`/kardex`, `/horarios`)**: Historial académico y agenda semanal.
> - **5. LinceHub (`/lince-hub`)**: Funcionalidad adicional estudiantil.

