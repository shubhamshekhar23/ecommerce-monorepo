#!/usr/bin/env bash
# Creates a local kind cluster with ingress-nginx pre-installed.
# Run once. After this, use: kubectl apply -k k8s/overlays/local
set -euo pipefail

CLUSTER_NAME="ecommerce"

command -v kind >/dev/null 2>&1 || { echo "Install kind: https://kind.sigs.k8s.io/docs/user/quick-start/#installation"; exit 1; }
command -v kubectl >/dev/null 2>&1 || { echo "Install kubectl: https://kubernetes.io/docs/tasks/tools/"; exit 1; }

if kind get clusters 2>/dev/null | grep -q "^${CLUSTER_NAME}$"; then
  echo "Cluster '${CLUSTER_NAME}' already exists. Skipping creation."
else
  echo "Creating kind cluster '${CLUSTER_NAME}'..."
  # extraPortMappings expose ingress-nginx ports to localhost.
  cat <<EOF | kind create cluster --name "${CLUSTER_NAME}" --config=-
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
    kubeadmConfigPatches:
      - |
        kind: InitConfiguration
        nodeRegistration:
          kubeletExtraArgs:
            node-labels: "ingress-ready=true"
    extraPortMappings:
      - containerPort: 80
        hostPort: 80
        protocol: TCP
      - containerPort: 443
        hostPort: 443
        protocol: TCP
EOF
fi

echo "Installing ingress-nginx..."
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.10.1/deploy/static/provider/kind/deploy.yaml

echo "Installing Metrics Server (required for HPA)..."
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
# Patch Metrics Server to disable TLS verification (required for kind).
kubectl patch deployment metrics-server \
  -n kube-system \
  --type=json \
  -p='[{"op":"add","path":"/spec/template/spec/containers/0/args/-","value":"--kubelet-insecure-tls"}]'

echo "Waiting for ingress-nginx to be ready..."
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=120s

echo ""
echo "Cluster ready. Next steps:"
echo "  1. Create secrets:  bash k8s/scripts/create-dev-secrets.sh"
echo "  2. Apply manifests: kubectl apply -k k8s/overlays/local"
echo "  3. Add to /etc/hosts: 127.0.0.1 api.ecommerce.local"
echo "  4. Test: curl http://api.ecommerce.local/health"
