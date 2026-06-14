## Docker vs Docker Compose vs Kubernetes

### Core Difference

A common misconception:

```text
Docker → Development
Kubernetes → Production
```

Not exactly.

```text
Docker = Build & package the application

Docker Compose = Run multiple containers on one machine

Kubernetes = Deploy, manage, scale, and heal containers across one or many machines
```

---

## Responsibilities

| Tool               | Purpose                                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------------------- |
| **Docker**         | Build and run container images                                                                          |
| **Docker Compose** | Orchestrate multiple containers on a single machine                                                     |
| **Kubernetes**     | Orchestrate containers across a cluster with scaling, self-healing, rolling updates, and load balancing |

---

## Docker Compose vs Kubernetes

| Docker Compose           | Kubernetes                                                                                         |
| ------------------------ | -------------------------------------------------------------------------------------------------- |
| One `docker-compose.yml` | Multiple Kubernetes manifests (Deployment, Service, Ingress, StatefulSet, ConfigMap, Secret, etc.) |
| Manual scaling           | Automatic scaling (HPA)                                                                            |
| Manual restart           | Self-healing Pods                                                                                  |
| `depends_on`             | Readiness Probes / Init Containers                                                                 |
| `ports`                  | Service / Ingress                                                                                  |
| `volumes`                | PersistentVolumeClaim (PVC)                                                                        |
| `environment`            | ConfigMap / Secret                                                                                 |
| `restart: always`        | Automatic Pod restart                                                                              |
| Single machine           | One or many machines (cluster)                                                                     |
| Manual rolling deploys   | Built-in rolling updates & rollbacks                                                               |
| Basic networking         | Built-in service discovery & load balancing                                                        |

---

## Local Development

```text
NestJS Code
    ↓
Dockerfile
    ↓
Docker Image
    ↓
Docker Compose
    ↓
Running Containers
```

```bash
docker compose up
```

Docker Compose is ideal for local development because it is simple and runs everything on one machine.

---

## Production

```text
NestJS Code
    ↓
Dockerfile
    ↓
Docker Image
    ↓
Docker Registry (GHCR/Docker Hub/ECR)
    ↓
Kubernetes
    ↓
Deployments
    ↓
Pods
```

Build & push image:

```bash
docker build -t ghcr.io/company/backend:v1 .
docker push ghcr.io/company/backend:v1
```

Deployment:

```yaml
spec:
  replicas: 3

template:
  spec:
    containers:
      - image: ghcr.io/company/backend:v1
```

Kubernetes pulls the Docker image and starts Pods.

---

## Why Docker Is Still Necessary

Kubernetes does **not** run source code.

It runs **container images**.

```text
❌ NestJS source code

✅ Docker image
```

Typical production pipeline:

```text
Git Push
   ↓
CI/CD
   ↓
docker build
   ↓
docker push
   ↓
Container Registry
   ↓
Kubernetes pulls image
   ↓
Pods start
```

Without a Docker image (or another OCI-compatible image), Kubernetes has nothing to deploy.

---

## Repository Structure

```text
repo/
├── Dockerfile              ← Required for local & production
├── docker-compose.yml      ← Local development
├── docker-compose.prod.yml ← Optional single-server deployment
├── k8s/
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── configmap.yaml
│   └── secret.yaml
└── apps/backend
```

---

## Mental Model

```text
Docker
  ↓
Creates the package (Image)

Docker Compose
  ↓
Runs multiple packages on one machine

Kubernetes
  ↓
Runs, scales, heals, and updates packages across a cluster
```

### Rule of Thumb

```text
Docker        = Package the application
Docker Compose = Run multiple containers locally/on one server
Kubernetes    = Run and manage containers in production at scale
```

> Docker and Kubernetes are complementary, not competing. Most companies use **Docker to build images** and **Kubernetes to deploy and manage those images**.
