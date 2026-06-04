Let's build a realistic production example from the Internet all the way to a NestJS pod.

# Infrastructure

Suppose you have:

```text id="jlwmzw"
Domain:
api.shop.com
```

Route53 DNS:

```text id="nd99ib"
api.shop.com
    ↓
AWS ALB
```

---

AWS created an ALB:

```text id="2ub5hy"
my-alb-123.ap-south-1.elb.amazonaws.com
```

Internally AWS currently has:

```text id="ylvqqb"
ALB Node A
52.66.10.11

ALB Node B
52.66.10.12

ALB Node C
52.66.10.13
```

---

Kubernetes cluster:

```text id="zv0x9h"
Ingress Nginx Pod 1
10.0.1.10

Ingress Nginx Pod 2
10.0.1.11

Ingress Nginx Pod 3
10.0.1.12
```

---

NestJS application pods:

```text id="v1gw4o"
api-pod-1
10.244.1.10

api-pod-2
10.244.1.11

api-pod-3
10.244.1.12

api-pod-4
10.244.1.13
```

---

Kubernetes Service:

```text id="q9k1r3"
api-service
```

which balances across:

```text id="h3pjlwm"
api-pod-1
api-pod-2
api-pod-3
api-pod-4
```

---

# Real User Request

John in Bangalore:

```text id="7isxgx"
IP:
49.207.115.23
```

opens:

```text id="h0zyhy"
https://api.shop.com/products
```

---

# Step 1: DNS Lookup

Browser asks:

```text id="9dm07n"
What is api.shop.com?
```

Route53 responds:

```text id="vmdzzx"
my-alb-123.ap-south-1.elb.amazonaws.com
```

AWS ALB DNS resolves to:

```text id="0n8ddh"
52.66.10.11
52.66.10.12
52.66.10.13
```

Chrome chooses:

```text id="s4s8iy"
52.66.10.12
```

(ALB Node B)

---

# Step 2: AWS Load Balancer

Request arrives:

```text id="kqkgr8"
John
49.207.115.23

      ↓

ALB Node B
52.66.10.12
```

ALB checks healthy targets:

```text id="a13b91"
Nginx Pod 1
Nginx Pod 2
Nginx Pod 3
```

Suppose it chooses:

```text id="eozc1p"
Nginx Pod 2
10.0.1.11
```

---

# Step 3: Nginx Ingress

Request arrives:

```text id="w96z97"
Nginx Pod 2
10.0.1.11
```

Nginx does:

```text id="3l8dh8"
SSL termination
Rate limiting
Security headers
Routing
```

Then forwards:

```nginx id="2nfp7e"
proxy_pass http://api-service;
```

---

# Step 4: Kubernetes Service

Request reaches:

```text id="8og3rd"
api-service
```

Kubernetes sees:

```text id="nm8y4l"
api-pod-1
api-pod-2
api-pod-3
api-pod-4
```

Suppose it chooses:

```text id="v6zlw7"
api-pod-3
10.244.1.12
```

---

# Step 5: Backend Pod

Request arrives:

```text id="ckpjnd"
api-pod-3
```

NestJS executes:

```ts id="7d4pgs"
GET / products;
```

Queries database.

Returns:

```json id="64b7po"
{
  "products": [...]
}
```

---

# Step 6: Response Back

```text id="6n5t0q"
api-pod-3
      ↓
api-service
      ↓
Nginx Pod 2
      ↓
ALB Node B
      ↓
John
```

---

# What Happens For Another User?

Alice from Delhi:

```text id="9v4p4d"
IP:
103.21.45.10
```

DNS might return:

```text id="1it2u7"
52.66.10.11
```

(ALB Node A)

ALB chooses:

```text id="8yl1ms"
Nginx Pod 1
```

Kubernetes chooses:

```text id="wsh0i4"
api-pod-4
```

Flow:

```text id="nwn9z0"
Alice
 ↓
ALB Node A
 ↓
Nginx Pod 1
 ↓
api-pod-4
```

---

# Why So Many Layers?

### AWS ALB

Balances traffic across Nginx instances:

```text id="zjzd30"
ALB
 ↓
Nginx-1
Nginx-2
Nginx-3
```

---

### Nginx

Handles:

```text id="7e9mvh"
HTTPS
Rate Limiting
Security
Routing
```

---

### Kubernetes Service

Balances traffic across application pods:

```text id="fw6g6f"
Service
 ↓
Pod1
Pod2
Pod3
Pod4
```

---

# Final Architecture

```text id="t1j3pd"
John
49.207.115.23

       ↓

Route53 DNS

       ↓

AWS ALB
52.66.10.11
52.66.10.12
52.66.10.13

       ↓

Ingress Nginx Pods
10.0.1.10
10.0.1.11
10.0.1.12

       ↓

Kubernetes Service

       ↓

NestJS Pods
10.244.1.10
10.244.1.11
10.244.1.12
10.244.1.13

       ↓

PostgreSQL
```

### Who load balances whom?

```text id="4t3zv2"
Route53
    ↓
ALB Nodes

ALB
    ↓
Nginx Pods

Kubernetes Service
    ↓
Backend Pods
```

Three separate layers of traffic distribution, each responsible for a different part of the system.
