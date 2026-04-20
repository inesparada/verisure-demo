# Mutua Madrileña - Centro de Control de Asistencia en Carretera

Panel de control en tiempo real para gestionar incidencias de asistencia en carretera. Desarrollado por HappyRobot para Mutua Madrileña.

## 🚀 Características

- **Centro de Control**: Visualización en tiempo real de incidencias recientes (configurables hasta X horas)
- **Histórico de Incidencias**: Listado completo de todas las incidencias con búsqueda y filtros
- **Mapa interactivo**: Visualización geolocalizada en España de incidencias confirmadas
- **Actualización en tiempo real**: Integración con Pusher + fallback de polling automático
- **Timeline de logs**: Seguimiento detallado de cada incidencia con registro de actividad
- **Panel de KPIs**: Métricas y estadísticas del servicio con gráficos
- **Integración HappyRobot**: Enlaces directos a las ejecuciones del agente de voz
- **Tema claro/oscuro**: Soporte completo para modo oscuro

## 📋 Requisitos Previos

- Node.js 18+
- PostgreSQL
- Cuenta de Pusher (opcional, para actualizaciones en tiempo real)
- Token de Mapbox (para el mapa)

## 🛠 Instalación

```bash
# Clonar e instalar dependencias
cd mutua-dashboard
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales

# Inicializar base de datos
npx prisma db push
npx prisma generate

# (Opcional) Poblar con datos de ejemplo
npm run db:seed

# Iniciar servidor de desarrollo
npm run dev
```

## 🔧 Variables de Entorno

```bash
# Base de datos PostgreSQL
DATABASE_URL="postgresql://user:password@host:port/database"

# Pusher (para actualizaciones en tiempo real)
PUSHER_APP_ID="your_app_id"
PUSHER_KEY="your_key"
PUSHER_SECRET="your_secret"
PUSHER_CLUSTER="eu"
NEXT_PUBLIC_PUSHER_KEY="your_key"
NEXT_PUBLIC_PUSHER_CLUSTER="eu"

# Mapbox (para el mapa)
NEXT_PUBLIC_MAPBOX_TOKEN="your_mapbox_token"

# Autenticación de webhooks (opcional)
WEBHOOK_API_KEY="your_secret_key"
```

---

## 📡 API Endpoints

Esta sección documenta todos los endpoints de la API que el agente de HappyRobot utiliza para enviar actualizaciones durante las llamadas.

### Autenticación

Todos los endpoints de escritura soportan autenticación opcional mediante header `X-API-KEY`. Si la variable de entorno `WEBHOOK_API_KEY` está configurada, las peticiones deben incluir este header.

```bash
curl -X POST https://your-app.vercel.app/api/incidents \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your_secret_key" \
  -d '{"customer_name": "Carlos García", ...}'
```

---

### 📌 Incidencias

El flujo típico de una llamada sigue estas fases:

```
GATHERING_INFO → INFO_COLLECTED → CONFIRMED → CRANE_ASSIGNED → RESOLVED
```

1. **Llamada recibida** → `POST /api/incidents` (crea ticket vacío con fase `GATHERING_INFO`)
2. **Póliza verificada** → `PATCH /api/incidents/[id]` (añade info cliente, fase pasa a `INFO_COLLECTED`)
3. **Detalles confirmados** → `PATCH /api/incidents/[id]/confirm` (geocodifica dirección, fase pasa a `CONFIRMED`, aparece en mapa)
4. **Grúa asignada** → `PATCH /api/incidents/[id]/crane` (asigna servicio, fase pasa a `CRANE_ASSIGNED`)
5. **Incidencia resuelta** → `PATCH /api/incidents/[id]` con `status: "RESOLVED"`

---

#### `POST /api/incidents` - Crear nueva incidencia (Inicio de llamada)

Llamar al inicio de una nueva llamada para crear un ticket vacío. El ticket se creará con la fase `GATHERING_INFO`.

**Request:**
```json
{
  "happyrobot_run_link": "https://v2.platform.happyrobot.ai/run/abc123"
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `happyrobot_run_link` | string | No | URL de ejecución en HappyRobot |

**Response (201):**
```json
{
  "success": true,
  "incident_id": "uuid-del-incidente",
  "ticket_number": "MM-2026-0042",
  "phase": "GATHERING_INFO"
}
```

---

#### `GET /api/incidents` - Listar incidencias

Obtiene la lista de todas las incidencias.

**Query Parameters:**
- `status` (optional): Filtrar por estado (`ACTIVE`, `RESOLVED`, `CANCELLED`)
- `limit` (optional): Limitar número de resultados

**Response (200):**
```json
[
  {
    "id": "uuid",
    "ticketNumber": "MM-2026-0001",
    "status": "ACTIVE",
    "customerName": "Carlos García",
    "latitude": 40.4168,
    "longitude": -3.7038,
    "severity": "MEDIUM",
    "createdAt": "2026-01-17T10:30:00Z",
    "logs": [...],
    "_count": { "logs": 5 }
  }
]
```

---

#### `GET /api/incidents/[id]` - Obtener incidencia

Obtiene una incidencia específica con todos sus logs.

**Response (200):**
```json
{
  "id": "uuid",
  "ticketNumber": "MM-2026-0001",
  "status": "ACTIVE",
  "customerName": "Carlos García",
  "logs": [
    {
      "id": "uuid",
      "message": "Llamada recibida",
      "source": "SYSTEM",
      "status": "INFO",
      "timestamp": "2026-01-17T10:30:00Z"
    }
  ]
}
```

---

#### `PATCH /api/incidents/[id]` - Actualizar incidencia (Info de cliente/póliza)

Llamar cuando se identifica al cliente y se verifica la póliza. La fase se actualiza automáticamente a `INFO_COLLECTED`.

**Request (ejemplo: verificación de póliza):**
```json
{
  "customer_name": "Carlos García",
  "customer_phone": "+34 612 345 678",
  "policy_number": "POL-2024-789456"
}
```

**Request (ejemplo: resolver incidencia):**
```json
{
  "status": "RESOLVED"
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `status` | enum | `ACTIVE`, `RESOLVED`, `CANCELLED` |
| `customer_name` | string | Nombre del cliente |
| `customer_phone` | string | Teléfono del cliente |
| `policy_number` | string | Número de póliza (actualiza fase a `INFO_COLLECTED`) |
| `vehicle_plate` | string | Matrícula |
| `vehicle_model` | string | Modelo |
| `vehicle_brand` | string | Marca |
| `description` | string | Descripción |
| `comments` | string | Notas de seguridad |
| `severity` | enum | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| `happyrobot_run_link` | string | URL de HappyRobot |

**Response (200):**
```json
{
  "success": true,
  "incident": { ... },
  "phase": "INFO_COLLECTED",
  "logs_created": 1
}
```

---

#### `PATCH /api/incidents/[id]/confirm` - Confirmar detalles del incidente

Llamar cuando se confirman los detalles del incidente: ubicación, vehículo, descripción y gravedad. Este endpoint hace que el incidente aparezca en el mapa.

**Coordenadas:** Puedes proporcionar coordenadas directamente (recomendado para autopistas con km) o dejar que el sistema geocodifique la dirección automáticamente.

**Request (con coordenadas - recomendado para autopistas):**
```json
{
  "description": "Avería mecánica - el coche no arranca",
  "address": "Autopista A6, kilómetro 50, dirección Madrid",
  "coordinates": {
    "latitude": 40.59,
    "longitude": -4.15
  },
  "vehicle_plate": "1234 ABC",
  "vehicle_model": "León",
  "vehicle_brand": "SEAT",
  "severity": "HIGH",
  "comments": "Cliente seguro fuera del vehículo"
}
```

**Request (sin coordenadas - usa geocoding):**
```json
{
  "description": "Avería mecánica",
  "address": "Calle Gran Vía 42, Madrid",
  "vehicle_plate": "1234 ABC",
  "severity": "MEDIUM"
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `address` | string | ✅ Sí | Dirección del incidente (texto para mostrar en el ticket) |
| `coordinates` | object | No | `{ latitude: number, longitude: number }` - Si se proporciona, se usa directamente (sin geocoding) |
| `description` | string | No | Descripción del incidente |
| `vehicle_plate` | string | No | Matrícula del vehículo |
| `vehicle_model` | string | No | Modelo del vehículo |
| `vehicle_brand` | string | No | Marca del vehículo |
| `severity` | enum | No | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` (default: `MEDIUM`) |
| `comments` | string | No | Notas de seguridad o comentarios |

**Response (200):**
```json
{
  "success": true,
  "incident": { ... },
  "coordinate_source": "provided",
  "coordinates": {
    "latitude": 40.59,
    "longitude": -4.15
  },
  "logs_created": 3
}
```

| `coordinate_source` | Descripción |
|---------------------|-------------|
| `"provided"` | Se usaron las coordenadas proporcionadas en el request |
| `"geocoded"` | Se geocodificó la dirección automáticamente |
| `"none"` | No se pudieron obtener coordenadas (incidente no aparece en mapa) |

**Logs generados automáticamente:**
1. "Incidente confirmado" (AGENT, SUCCESS)
2. "Localización confirmada: [dirección]" con metadata de coordenadas (AGENT, SUCCESS)
3. "Matrícula confirmada: [placa]" (AGENT, INFO) - solo si se proporciona

---

#### `PATCH /api/incidents/[id]/crane` - Asignar grúa

Llamar cuando el servicio de grúa confirma la asistencia.

**Request:**
```json
{
  "crane_company": "Grúas Madrid 24h",
  "crane_phone": "+34 911 234 567",
  "crane_eta": "2026-01-17T11:00:00Z"
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `crane_company` | string | ✅ Sí | Nombre de la empresa de grúa |
| `crane_phone` | string | No | Teléfono de contacto |
| `crane_eta` | datetime | No | Hora estimada de llegada (ISO 8601) |

**Response (200):**
```json
{
  "success": true,
  "incident": { ... },
  "crane": {
    "company": "Grúas Madrid 24h",
    "phone": "+34 911 234 567",
    "eta": "2026-01-17T11:00:00Z"
  }
}
```

**Log generado automáticamente:**
- "Grúa asignada: [empresa]" (AGENT, SUCCESS)

---

#### `PATCH /api/incidents/[id]/end-call` - Finalizar llamada

Llamar cuando la llamada con el cliente termina. Crea un log "Llamada finalizada".

**Request:** No requiere body.

**Response (200):**
```json
{
  "success": true,
  "log": {
    "id": "...",
    "message": "Llamada finalizada",
    "source": "AGENT",
    "status": "SUCCESS",
    "timestamp": "2026-01-17T10:50:00Z"
  }
}
```

**Log generado automáticamente:**
- "Llamada finalizada" (AGENT, SUCCESS)

---

### 📍 Ubicación

#### `PATCH /api/incidents/[id]/location` - Actualizar ubicación

Llamar cuando el cliente proporcione su ubicación durante la llamada.

**Request:**
```json
{
  "latitude": 40.4530,
  "longitude": -3.6883,
  "address": "Avenida de América 25, Madrid"
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `latitude` | number | ✅ Sí | Latitud |
| `longitude` | number | ✅ Sí | Longitud |
| `address` | string | No | Dirección legible |

**Response (200):**
```json
{
  "success": true,
  "incident": { ... }
}
```

---

### 📝 Logs

#### `GET /api/incidents/[id]/logs` - Obtener logs

Obtiene todos los logs de una incidencia.

**Response (200):**
```json
[
  {
    "id": "uuid",
    "incidentId": "incident-uuid",
    "message": "Cliente identificado correctamente",
    "source": "AGENT",
    "status": "SUCCESS",
    "timestamp": "2026-01-17T10:31:00Z"
  }
]
```

---

#### `POST /api/incidents/[id]/logs` - Añadir log

Añadir una entrada al timeline de la incidencia.

**Request:**
```json
{
  "message": "Cliente localizado en la M-30, km 15",
  "source": "AGENT",
  "status": "INFO",
  "metadata": {
    "location_method": "descripción verbal"
  }
}
```

| Campo | Tipo | Requerido | Valores | Descripción |
|-------|------|-----------|---------|-------------|
| `message` | string | ✅ Sí | - | Mensaje del log |
| `source` | string | No | `AGENT`, `SYSTEM`, `CRANE`, `CUSTOMER` | Origen del log (default: `AGENT`) |
| `status` | string | No | `INFO`, `SUCCESS`, `WARNING`, `ERROR` | Estado (default: `INFO`) |
| `metadata` | object | No | - | Datos adicionales (JSON) |

**Response (201):**
```json
{
  "success": true,
  "log_id": "uuid"
}
```

---

### ⚙️ Configuración

#### `GET /api/settings` - Obtener configuración

**Response (200):**
```json
{
  "id": "default",
  "defaultHappyRobotLink": "https://v2.platform.happyrobot.ai/mutua/workflow",
  "slaWarningMinutes": 15,
  "slaCriticalMinutes": 30,
  "controlTowerHours": 5
}
```

#### `PATCH /api/settings` - Actualizar configuración

**Request:**
```json
{
  "default_happyrobot_link": "https://v2.platform.happyrobot.ai/mutua/workflow",
  "sla_warning_minutes": 20,
  "sla_critical_minutes": 45,
  "control_tower_hours": 8
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `default_happyrobot_link` | string | URL base de HappyRobot |
| `sla_warning_minutes` | number | Minutos para advertencia de SLA |
| `sla_critical_minutes` | number | Minutos para SLA crítico |
| `control_tower_hours` | number | Horas de retención en Centro de Control (default: 5) |

---

## 🔄 Eventos Pusher

El dashboard se actualiza en tiempo real mediante los siguientes eventos en el canal `mutua-dashboard`:

| Evento | Payload | Descripción |
|--------|---------|-------------|
| `incident:created` | `{ incident }` | Nueva incidencia creada |
| `incident:updated` | `{ incident }` | Incidencia actualizada |
| `incident:deleted` | `{ incidentId }` | Incidencia eliminada |
| `incident:location-updated` | `{ incidentId, latitude, longitude, address }` | Ubicación actualizada |
| `incident-log:created` | `{ incidentId, log }` | Nuevo log añadido |

---

## 🗺️ Estructura del Proyecto

```
mutua-dashboard/
├── app/
│   ├── api/                    # API endpoints
│   │   ├── incidents/          # Gestión de incidencias
│   │   └── settings/           # Configuración
│   ├── incidents/              # Centro de Control (mapa + incidencias recientes)
│   ├── history/                # Histórico completo de incidencias
│   ├── summary/                # Dashboard de KPIs
│   ├── settings/               # Configuración
│   └── layout.tsx              # Layout raíz
├── components/
│   ├── IncidentMap.tsx         # Mapa interactivo
│   ├── IncidentDetailPanel.tsx # Panel de detalle
│   ├── Layout.tsx              # Sidebar y navegación
│   ├── PusherProvider.tsx      # Proveedor Pusher con estado de conexión
│   └── gsap/                   # Animaciones GSAP
├── hooks/                      # React hooks (SWR + fallback polling)
├── lib/                        # Utilidades
└── prisma/                     # Schema de base de datos
```

---

## 📊 Base de Datos

### Modelos

**Incident** - Incidencia de asistencia
- `id`, `ticketNumber`, `status`, `phase`, `severity`
- **Status**: `ACTIVE`, `RESOLVED`, `CANCELLED`
- **Phase**: `GATHERING_INFO`, `INFO_COLLECTED`, `CONFIRMED`, `CRANE_ASSIGNED`
- Información del cliente: `customerName`, `customerPhone`, `policyNumber`
- Ubicación: `latitude`, `longitude`, `address`
- Vehículo: `vehiclePlate`, `vehicleModel`, `vehicleBrand`
- Detalles: `description`, `comments`
- Grúa: `craneAssigned`, `craneCompany`, `cranePhone`, `craneETA`
- Timestamps: `createdAt`, `updatedAt`, `resolvedAt`

**IncidentLog** - Registro de actividad
- `id`, `incidentId`, `message`, `source`, `status`, `timestamp`, `metadata`
- **Source**: `AGENT`, `SYSTEM`, `CRANE`, `CUSTOMER`
- **Status**: `INFO`, `SUCCESS`, `WARNING`, `ERROR`

**Settings** - Configuración global
- `defaultHappyRobotLink`, `slaWarningMinutes`, `slaCriticalMinutes`, `controlTowerHours`

### Fases del Incidente

| Fase | Descripción | Se ve en mapa |
|------|-------------|---------------|
| `GATHERING_INFO` | Llamada recibida, recogiendo información | ❌ No |
| `INFO_COLLECTED` | Cliente y póliza verificados | ❌ No |
| `CONFIRMED` | Ubicación y detalles confirmados | ✅ Sí |
| `CRANE_ASSIGNED` | Grúa asignada y en camino | ✅ Sí |

---

## 🚀 Despliegue en Vercel

1. Conecta el repositorio a Vercel
2. Configura las variables de entorno en el dashboard de Vercel
3. La base de datos PostgreSQL puede estar en Railway, Supabase o Neon
4. El build automático ejecutará `prisma generate` antes de `next build`

---

## 📞 Soporte

Para soporte técnico, contactar con el equipo de HappyRobot.

---

**Desarrollado con ❤️ por [HappyRobot](https://happyrobot.ai)**

