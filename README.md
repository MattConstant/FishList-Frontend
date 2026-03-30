# FishList

FishList is a full-stack fishing log and social app where users can:
- register and log in,
- save fishing locations and catches,
- upload catch photos,
- browse a community feed,
- like/comment on catches,
- manage friends and filter posts,
- explore Ontario stocked-fish data via GeoHub on the map.

This repository contains both frontend and backend apps.

## Repository Structure

- `fishlist-frontend/` - Next.js frontend (TypeScript, React)
- `FishList/` - Spring Boot backend (Java)

## What This App Is

FishList helps anglers track fishing history and share it with others.

Core product goals:
- Keep personal catch records organized by location and date.
- Make posting catches simple from map-based workflows.
- Add social features (friends, feed, likes, comments).
- Keep backend validation, ownership rules, and API error handling strict and predictable.

## Current Tech Stack

### Frontend
- Next.js 16
- React 19
- TypeScript
- ESLint

### Backend
- Spring Boot
- Spring Security
- Spring Validation
- JPA repositories
- MinIO-compatible object storage for image uploads

### Tooling / Automation
- GitHub Actions workflows for frontend and backend CI

## Running Locally

### Prerequisites
- Node.js 20+
- npm
- Java 21
- Docker (optional, for services like MinIO)

### Frontend

```bash
cd fishlist-frontend
npm ci
npm run dev
```

Common scripts:
- `npm run lint`
- `npm run build`
- `npm run start`

### Backend

```bash
cd FishList
./mvnw spring-boot:run
```

On Windows PowerShell:

```powershell
cd FishList
.\mvnw.cmd spring-boot:run
```

### Docker Startup (Recommended for backend services)

Use Docker Compose to bring up the backend API and MinIO object storage:

```bash
cd FishList
docker compose up --build
```

Services started by compose:
- API: `http://localhost:8080`
- MinIO S3 API: `http://localhost:9000`
- MinIO Console: `http://localhost:9001`

Then run the frontend in a second terminal:

```bash
cd fishlist-frontend
npm ci
npm run dev
```

Frontend runs at:
- `http://localhost:3000`

---

## GeoHub Stocked Fish Data

The frontend map integrates Ontario GeoHub fish stocking data to display stocked waterbodies and trends.

Implementation details:
- Data source: ArcGIS GeoHub fish stocking feature service.
- Client utility: `src/lib/geohub.ts`.
- Map page integration: `src/app/map/page.tsx`.
- Data handling:
  - paginated fetch in chunks,
  - grouped by waterbody/coordinates,
  - filters for species, district, developmental stage, and recent-year windows.

This gives users both personal catch history and province-wide stocking context in one map experience.

## CI/CD and Security Roadmap

The sections below include what is already completed and what is next.

---

## 1) Security Scanning

### Completed
- Backend now enforces server-side validation and structured API errors.
- Image uploads now validate allowed file extensions, MIME types, and file signatures before storage.
- Frontend validates image file types before upload requests are sent.

### In Progress / Next
- Add dependency vulnerability scanning in CI:
  - `npm audit --production` (frontend)
  - OWASP dependency checks (backend)
- Add secret scanning and baseline policies.
- Add SAST checks for Java/TypeScript.
- Add container/image scanning for deployment artifacts.

---

## 2) Proper CI/CD Pipeline

### Completed
- Frontend CI workflow to install, lint, and build.
- Backend CI workflow to run Maven verification.
- ESLint workflow fixed to use project dependencies and avoid version conflicts.

### In Progress / Next
- Add branch protection requirements for CI checks.
- Add test jobs (unit/integration) as required checks.
- Add deployment workflow (dev/staging/prod environments).
- Add release tagging/versioning strategy.

---

## 2.1) Docker Progress

### Completed
- Docker Compose setup exists for backend + MinIO.
- MinIO init container creates the required bucket automatically.
- Backend container is wired to MinIO environment variables for image upload/presigned URLs.

### In Progress / Next
- Add frontend Docker service for full one-command local startup.
- Add healthchecks and startup dependency hardening.
- Add separate compose profiles for `dev` and `ci`.
- Add image publishing workflow for backend/frontend containers.

---

## 3) Frontend Build Pipeline

### Completed
- Frontend workflow runs:
  - `npm ci`
  - `npm run lint`
  - `npm run build`
- Uses Node setup and dependency caching in GitHub Actions.

### In Progress / Next
- Add preview deployments for pull requests.
- Add frontend test coverage thresholds.
- Add Lighthouse/performance budget checks.

---

## 4) Backend Build Pipeline

### Completed
- Backend workflow runs:
  - Java setup (Temurin 21)
  - Maven wrapper execution
  - `./mvnw -B verify`

### In Progress / Next
- Add backend test matrix and DB-backed integration test stage.
- Add API contract checks.
- Add artifact publishing and rollback strategy.

---

## 5) Auth Improvements

### Completed
- Basic auth flows working end-to-end with backend ownership checks.
- Improved error code handling from backend to frontend.
- Server-side validation expanded across key endpoints.

### In Progress / Next
- Move from basic auth session storage patterns to stronger token/session approach.
- Add account security controls:
  - password policy hardening,
  - lockout/rate limiting,
  - email verification and reset flows.
- Add audit logging for auth-sensitive operations.

---

## 6) Google Auth Implementation

### Planned
- OAuth 2.0 / OIDC login with Google.
- Link Google identity to FishList user accounts.
- Support account linking/unlinking.
- Keep authorization and ownership rules identical for social-login users.

### Target Deliverables
- Backend OAuth callback and token verification.
- Frontend Google sign-in UX.
- Migration strategy for existing users.

---

## 7) AWS Hosting

### Planned Architecture
- Frontend: Vercel or AWS CloudFront + S3 hosting.
- Backend: AWS ECS/Fargate or AWS Elastic Beanstalk.
- Database: Amazon RDS.
- Object storage: Amazon S3 (or keep MinIO for local/dev parity).
- Secrets: AWS Secrets Manager.
- Observability: CloudWatch logs/metrics + alerting.

### In Progress / Next
- Define environment strategy (dev/staging/prod).
- Infrastructure as Code (Terraform or AWS CDK).
- Set up secure networking, TLS, and WAF.
- Add automated deploy jobs from GitHub Actions.

---

## 8) Future Milestones and Features

### Product Features
- Advanced feed filters and search.
- Catch analytics (species trends, seasonal summaries).
- Location privacy controls (public/friends/private).
- Better media handling (image optimization, metadata stripping).
- Notifications (friend activity, comments, likes).

### Platform / Reliability
- Automated backups and disaster recovery runbooks.
- Expanded logging, tracing, and dashboards.
- Performance optimization on feed and map loading.
- Load testing and scaling plan.

## Suggested Milestone Timeline (High Level)

### Milestone A - Security + Pipeline Hardening
- Add security scans in CI
- Enforce branch protections
- Expand tests and quality gates

### Milestone B - Auth Modernization
- Token/session improvements
- Google Auth MVP
- Account recovery and verification

### Milestone C - Cloud Deployment
- AWS infrastructure setup
- Staging + production deployment automation
- Monitoring and incident alerting

### Milestone D - Product Expansion
- Analytics, notifications, and richer social features
- Performance and UX refinements

## Notes

- This README is intentionally roadmap-focused and will evolve as items move from planned to completed.
- If you want, this can be split into:
  - `README.md` (high-level overview),
  - `docs/roadmap.md` (detailed delivery plan),
  - `docs/architecture.md` (system design and deployment details).
