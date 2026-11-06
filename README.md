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
         └── /api/extra/* ──► [ Supabase + Edge Functions; fallback local en memoria ]
```

### Decisiones Técnicas y Justificación del Stack
- **Frontend — React + Vite + Tailwind CSS**:
  - Elegido de la tabla oficial de tecnologías permitidas por su **arranque instantáneo con HMR (Hot Module Replacement)**, empaquetado optimizado con Rollup y ausencia de sobrecarga de configuración para Single Page Applications (SPA) altamente interactivas.
  - **React Router DOM v7**: Navegación fluida sin recargas de página entre `Login`, `Dashboard`, `Calificaciones`, `Kardex`, `Horarios` y `LinceHub`, con protección de rutas privadas mediante `ProtectedRoute`.
  - **Tailwind CSS v4 + Lucide React**: Diseño responsivo con identidad institucional Lince (TecNM Celaya), indicadores visuales tipo semáforo y componentes `Skeleton` de carga.
- **Backend Intermedio — Node.js + Express**:
  - Actúa como intermediario seguro entre el cliente web y `https://sii.celaya.tecnm.mx/api`, evitando problemas de CORS en el navegador, normalizando códigos de estado HTTP del SII (como respuestas `200 OK` cuyo payload interno reporta `status: 401`), aplicando cabeceras de seguridad (`Helmet`), control de tasa (`express-rate-limit`) y alojando la lógica de negocio adicional del Punto 5 (`/api/extra`). Las asesorías y el diagnóstico académico siguen disponibles mediante datos en memoria cuando Supabase o su Edge Function no están disponibles; esos cambios no persisten al reiniciar el backend.

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

> - **1. Inicio de Sesión Institucional (`/login`)**: Validación de campos, manejo de errores y obtención de JWT.
<img width="1279" height="652" alt="image" src="https://github.com/user-attachments/assets/db9fa934-0b71-4be5-aa38-2843144e2e61" />

> - **2. Dashboard del Estudiante (`/dashboard`)**: Perfil institucional, tarjetas KPI, avance de créditos y skeleton loader.
<img width="1694" height="945" alt="image" src="https://github.com/user-attachments/assets/f4d53dbf-cb17-40f2-9189-b5dac7acab88" />
<img width="1635" height="918" alt="image" src="https://github.com/user-attachments/assets/5c54fc23-2d3d-434f-8d57-b5ac36c6b54c" />

> - **3. Calificaciones (`/calificaciones`)**: Filtrado en tiempo real por materia/periodo y semáforo de desempeño (Verde / Amarillo / Rojo).
<img width="1625" height="951" alt="image" src="https://github.com/user-attachments/assets/ca5e257f-4a71-4fcd-ae2b-30c591da9546" />

> - **4. Kardex y Horario (`/kardex`, `/horarios`)**: Historial académico y agenda semanal.
<img width="1633" height="918" alt="image" src="https://github.com/user-attachments/assets/56b2856e-9a49-4410-8fd2-09d7562d63e7" />
<img width="1650" height="942" alt="image" src="https://github.com/user-attachments/assets/66b9e3ee-75df-4d4b-b2af-2e65d73297bd" />
<img width="1658" height="938" alt="image" src="https://github.com/user-attachments/assets/f6d82230-2fa5-4951-9b49-2da68bd0340e" />
<img width="1674" height="744" alt="image" src="https://github.com/user-attachments/assets/9efb57f3-0416-473b-822c-54b0ded2da83" />




> - **5. LinceHub (`/lince-hub`)**: Funcionalidad adicional estudiantil.
<img width="1661" height="939" alt="image" src="https://github.com/user-attachments/assets/cefe9c3c-29ba-4e29-b7b0-f4f88dfd8cb2" />
<img width="1668" height="672" alt="image" src="https://github.com/user-attachments/assets/3072a196-edab-468d-afb1-b6ad4895ffad" />
<img width="1616" height="878" alt="image" src="https://github.com/user-attachments/assets/5bb26fbe-c6bc-4367-ac6a-1b07e81d7b07" />
<img width="1517" height="613" alt="image" src="https://github.com/user-attachments/assets/12f68dc9-2a76-4a98-aab3-7dcd12098da8" />
<img width="1614" height="922" alt="image" src="https://github.com/user-attachments/assets/16da814a-48ed-4816-b77d-d438557a5c12" />
<img width="1639" height="719" alt="image" src="https://github.com/user-attachments/assets/03cf42bc-d75b-437a-8007-da28266e801a" />






