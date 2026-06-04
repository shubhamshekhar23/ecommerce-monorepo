### Important: Kubernetes Does NOT Replace Docker

A common misconception:

```text id="1s5e9u"
Docker → Development
Kubernetes → Production
```

Not exactly.

The reality:

```text id="t7pj3m"
Docker = Package the app

Kubernetes = Run and manage the packaged app
```

---

### Local Development

```text id="bhykt4"
NestJS Code
    ↓
Docker Image
    ↓
Docker Compose
    ↓
Running Containers
```

Example:

```bash id="jl7iz3"
docker compose up
```

---

### Production

```text id="xmkc5j"
NestJS Code
    ↓
Docker Image
    ↓
Docker Registry (GHCR/Docker Hub/ECR)
    ↓
Kubernetes
    ↓
Running Pods
```

Example:

Build image:

```bash id="zq89u3"
docker build -t ghcr.io/company/backend:v1 .
docker push ghcr.io/company/backend:v1
```

Kubernetes Deployment:

```yaml id="f8d18x"
spec:
  replicas: 3

template:
  spec:
    containers:
      - image: ghcr.io/company/backend:v1
```

Kubernetes pulls that Docker image and starts Pods.

---

### Why Docker Is Still Necessary

Kubernetes does **not** run your source code directly.

It runs **container images**.

```text id="o13rhh"
❌ NestJS source code

✅ Docker image
```

So production flow is:

```text id="rmihv8"
Git Push
   ↓
CI/CD
   ↓
docker build
   ↓
docker push
   ↓
Kubernetes pulls image
   ↓
Pods start
```

---

### Repository Structure

```text id="8vvfhm"
repo/
├── Dockerfile              ← used by both local & prod
├── docker-compose.yml      ← local
├── docker-compose.prod.yml
├── k8s/
│   ├── deployment.yaml
│   ├── service.yaml
│   └── ingress.yaml
└── apps/backend
```

---

### Mental Model

```text id="gkz7hm"
Docker = Create the package

Kubernetes = Deploy, scale, heal, and update the package
```

Example:

```text id="a3jjyq"
NestJS
  ↓
Docker Image
  ↓
Kubernetes
  ↓
3 Pods
```

Without Docker image:

```text id="1v7f2h"
Kubernetes has nothing to run
```

That's why Docker (or another container image builder) remains a fundamental part of production deployments even when Kubernetes is used.
