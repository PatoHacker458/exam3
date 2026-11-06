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
         └── /api/extra/* ──► [ Supabase + Edge Functions (con respaldo local en memoria) ]
```

### Decisiones Técnicas y Justificación del Stack
- **Frontend — React + Vite + Tailwind CSS**:
  - Elegido de la tabla oficial de tecnologías permitidas por su **arranque instantáneo con HMR (Hot Module Replacement)**, empaquetado optimizado y ligereza para Single Page Applications (SPA).
  - **React Router DOM v7**: Navegación fluida sin recargas entre `Login`, `Dashboard`, `Calificaciones`, `Kardex`, `Horarios` y `LinceHub`, con protección de rutas privadas mediante `ProtectedRoute`.
  - **Tailwind CSS v4 + Lucide React**: Diseño responsivo con identidad institucional TecNM Celaya, indicadores visuales tipo semáforo y componentes `Skeleton` de carga.
- **Backend Intermedio — Node.js + Express**:
  - Intermediario seguro entre el cliente web y `https://sii.celaya.tecnm.mx/api` que evita bloqueos de CORS, normaliza respuestas de error del SII, aplica cabeceras de seguridad (`Helmet`), control de tasa (`express-rate-limit`) y gestiona la lógica de negocio del Punto 5 (`/api/extra`) conectada a **Supabase** y su **Edge Function** (`academic-advisor`), manteniendo un modo de respaldo en memoria en caso de desconexión.

---

## 2. Estructura del Monorepo

```text
/
├── docker-compose.yml
├── render.yaml
├── .env.example
├── README.md
├── supabase/
│   └── functions/
│       └── academic-advisor/
│           └── index.ts          # Edge Function de diagnóstico académico (Punto 5)
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── server.js             # Express app en puerto 4000, CORS, monta /api/sii y /api/extra
│       ├── config/
│       │   └── supabase.js       # Cliente de Supabase con respaldo en memoria
│       ├── middleware/
│       │   └── auth.middleware.js # Verifica header Authorization: Bearer <token>
│       └── routes/
│           ├── sii.routes.js     # Proxy hacia https://sii.celaya.tecnm.mx/api
│           └── extra.routes.js   # API de LinceHub (Asesorías y Diagnóstico)
└── frontend/
    ├── Dockerfile
    ├── nginx.conf                # Configuración Nginx con soporte SPA y cabeceras de seguridad
    ├── package.json
    ├── vite.config.js            # Configuración Vite en puerto 5173
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx               # Definición de rutas (Puntos 1 al 5)
        ├── index.css             # Tailwind CSS
        ├── context/
        │   └── AuthContext.jsx   # Manejo de sesión, token JWT en memoria privada, login y logout
        ├── services/
        │   └── api.js            # Instancia Axios hacia VITE_API_URL con interceptor Bearer
        ├── components/
        │   ├── ProtectedRoute.jsx
        │   ├── Navbar.jsx        # Navegación principal (Puntos 2 al 5)
        │   └── ui/
        │       └── Skeleton.jsx
        └── pages/
            ├── LoginPage.jsx          # Inicio de sesión institucional (Punto 1)
            ├── DashboardPage.jsx      # Expediente del estudiante (Punto 2)
            ├── CalificacionesPage.jsx # Calificaciones con semáforo (Punto 3)
            ├── KardexPage.jsx         # Historial académico (Punto 4)
            ├── HorariosPage.jsx       # Horario semanal de clases (Punto 4)
            └── ExtraFeaturePage.jsx   # LinceHub: Asesorías y diagnóstico (Punto 5)
```

### División de Archivos por Integrante
| Integrante | Responsabilidad | Archivos Asignados |
| :--- | :--- | :--- |
| **Integrante 1** | Arquitectura Docker/Render, Proxy SII completo, Punto 1 (Auth), Punto 2 (Dashboard Estudiante) y Punto 3 (Calificaciones con Semáforo). | `docker-compose.yml`, `render.yaml`, `backend/src/server.js`, `backend/src/routes/sii.routes.js`, `frontend/src/App.jsx`, `LoginPage.jsx`, `DashboardPage.jsx`, `CalificacionesPage.jsx` |
| **Integrante 2** | Punto 4 (Kardex y Horarios) y Punto 5 (Funcionalidad Adicional LinceHub + Supabase + Edge Function). | `frontend/src/pages/KardexPage.jsx`, `frontend/src/pages/HorariosPage.jsx`, `frontend/src/pages/ExtraFeaturePage.jsx`, `backend/src/routes/extra.routes.js`, `supabase/functions/academic-advisor/index.ts` |

---

## 3. Referencia de Endpoints del Backend Intermedio (`/api/sii`)

| Método | Ruta Backend Local | Endpoint Oficial SII ITC | Autenticación | Estado |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/sii/login` | `POST /api/login` | JSON `{ email, password }` | Completo |
| `GET` | `/api/sii/estudiante` | `GET /api/movil/estudiante` | `Bearer <token>` | Completo |
| `GET` | `/api/sii/calificaciones` | `GET /api/movil/estudiante/calificaciones` | `Bearer <token>` | Completo |
| `GET` | `/api/sii/kardex` | `GET /api/movil/estudiante/kardex` | `Bearer <token>` | Completo |
| `GET` | `/api/sii/horarios` | `GET /api/movil/estudiante/horarios` | `Bearer <token>` | Completo |

---

## 4. Capturas de Pantalla del Funcionamiento

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
