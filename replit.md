# Volvo Car Service Intelligence System

## Overview

The Volvo Car Service Intelligence System is an AI-powered workshop management platform designed to optimize service center operations through predictive service time estimation, real-time resource allocation, and comprehensive analytics. The system manages the complete lifecycle of vehicle service requests—from initial customer intake through technician assignment, parts inventory management, and service completion tracking.

**Core Capabilities:**
- AI-driven service time prediction based on vehicle condition, service history, and workshop capacity
- Dynamic worker allocation across 20 technicians with specialized skills (Engine, Brake, AC, General Maintenance)
- Real-time workshop capacity management with 6 machine bays and queuing logic
- Parts inventory tracking and low-stock alerts
- Live dashboard for monitoring active services, worker utilization, and performance metrics

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server
- Wouter for lightweight client-side routing
- TanStack Query (React Query) for server state management with 5-second polling intervals
- React Hook Form with Zod validation for form handling

**UI Component Strategy:**
- Radix UI primitives as the foundation for accessible, unstyled components
- shadcn/ui component library (New York style) for pre-built, customizable components
- Tailwind CSS for utility-first styling with custom design tokens
- Material Design principles adapted for automotive enterprise context

**Design System:**
- Typography: Inter font family from Google Fonts
- Color scheme: Neutral base with Volvo-inspired blue primary (HSL 214 85% 42%)
- Spacing: Consistent Tailwind units (2, 4, 6, 8)
- Component patterns: Card-based layouts, data tables, stat cards in 4-column grids

**State Management Pattern:**
- Server state managed by React Query with aggressive refetching (5-10 second intervals)
- Form state isolated to React Hook Form controllers
- No global client state management—prefer server as source of truth
- Optimistic updates disabled; rely on automatic refetching for data freshness

### Backend Architecture

**Server Framework:**
- Express.js running on Node.js with ESM modules
- TypeScript for type safety across the entire stack
- RESTful API design with JSON responses

**API Structure:**
```
GET  /api/service-tasks      - Retrieve all available service task definitions
GET  /api/workers            - Fetch worker data (skills, availability, load)
GET  /api/active-services    - List all in-progress service requests
GET  /api/inventory          - Retrieve parts inventory with stock levels
GET  /api/analytics          - Get aggregated performance metrics
POST /api/predict-service    - Submit service request for AI time estimation
POST /api/complete-service/:id - Mark service as complete, free resources
POST /api/restock/:partName  - Add inventory stock (5 units)
GET  /api/dashboard-stats    - Real-time workshop statistics
```

**Business Logic Layer:**
- Service time prediction engine (simulated AI model in current implementation)
- Workshop scheduler that assigns workers and machine bays based on:
  - Worker skill matching (Engine, Brake, AC, General)
  - Current worker load percentage (max 3 concurrent jobs per worker)
  - Machine bay availability (max 6 simultaneous services, max 3 workers per bay)
  - Parts inventory availability
- Queue management when capacity (6 active services) is exceeded
- Resource allocation tracking and automatic cleanup on service completion

**Data Storage:**
- In-memory storage implementation (MemStorage class) for development
- Designed to be swappable with PostgreSQL via Drizzle ORM
- Schema-first approach using Drizzle table definitions

### Data Model

**Core Entities:**

1. **Workers**
   - Attributes: id, name, skill, experienceLevel, certifications[], rating, loadPercent, activeJobs[], status
   - Constraints: Max 3 active jobs per worker, status in ['Available', 'Busy', 'Offline']

2. **Machine Bays**
   - Attributes: id, bayNumber, bayType, isAvailable, assignedWorkers[], currentLoad, toolsPresent[]
   - Constraints: Max 3 workers per bay, max 6 total active services system-wide

3. **Inventory**
   - Attributes: id, partName (unique), quantity, minimumStock
   - Operations: Stock deduction on service creation, restock in increments of 5

4. **Service Tasks**
   - Predefined catalog: Engine Oil Change, Brake Inspection, AC Service, etc.
   - Attributes: id, name, baseTimeHours, category, requiredParts[]

5. **Active Services**
   - Attributes: id, carNumber, carModel, serviceType, status, assignedWorkers[], assignedMachine, predictedHours, progress, queuePosition
   - Lifecycle: Queued → In Progress → Completing → Completed (removed from active list)

**Service Request Flow:**
1. User submits vehicle details + selected service tasks via `/request` page
2. Backend calculates predicted service time using vehicle condition factors
3. System allocates workers (skill-matched, lowest load first) and machine bay
4. If capacity full (6 services), request enters queue with position number
5. Service appears on dashboard with real-time progress tracking
6. Completion triggers resource cleanup and analytics update

### External Dependencies

**Third-Party UI Libraries:**
- @radix-ui/* (19 packages): Accessible component primitives (dialogs, dropdowns, popovers, etc.)
- lucide-react: Icon library for consistent iconography
- date-fns: Date manipulation and formatting
- embla-carousel-react: Carousel components (if needed for future features)
- cmdk: Command palette component
- vaul: Drawer component for mobile interactions

**Backend Dependencies:**
- @neondatabase/serverless: PostgreSQL client compatible with serverless environments
- drizzle-orm: Type-safe SQL query builder and ORM
- drizzle-kit: Schema migration tool
- connect-pg-simple: PostgreSQL session store for Express

**Development Tools:**
- @replit/vite-plugin-*: Replit-specific development plugins (error overlay, cartographer, dev banner)
- tsx: TypeScript execution for development server
- esbuild: Production build bundler for server code

**Form & Validation:**
- react-hook-form: Performant form state management
- @hookform/resolvers: Zod resolver integration
- zod: Runtime type validation and schema definition
- drizzle-zod: Auto-generate Zod schemas from Drizzle tables

**Database Configuration:**
- PostgreSQL as the production database (configured via DATABASE_URL environment variable)
- Drizzle migrations stored in `/migrations` directory
- Schema definitions in `shared/schema.ts` shared between client and server
- Connection pooling via Neon serverless driver for edge compatibility

**Key Integration Points:**
- No external AI services currently integrated (prediction logic is simulated)
- No authentication/authorization system implemented yet
- No real-time WebSocket connections (using HTTP polling instead)
- No email/SMS notification services for customer updates
- No payment processing or CRM integrations

**Environment Variables Required:**
- `DATABASE_URL`: PostgreSQL connection string (throws error if missing in production)
- `NODE_ENV`: Environment flag (development/production)