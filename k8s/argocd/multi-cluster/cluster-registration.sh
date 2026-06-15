#!/usr/bin/env bash
# Register both Kubernetes clusters in Argo CD so the ApplicationSet can target them.
# Run this once after installing Argo CD on the management cluster.
#
# Requirements:
#   - argocd CLI installed and logged in: argocd login <argocd-server>
#   - kubectl contexts for both clusters present in your kubeconfig
#     Check with: kubectl config get-contexts
#
# Usage:
#   bash k8s/argocd/multi-cluster/cluster-registration.sh \
#     <us-east-1-context-name> \
#     <eu-west-1-context-name>

set -euo pipefail

US_CONTEXT="${1:?Usage: $0 <us-east-1-context> <eu-west-1-context>}"
EU_CONTEXT="${2:?Usage: $0 <us-east-1-context> <eu-west-1-context>}"

echo "Registering us-east-1 cluster (context: $US_CONTEXT)..."
argocd cluster add "$US_CONTEXT" --name us-east-1

echo "Registering eu-west-1 cluster (context: $EU_CONTEXT)..."
argocd cluster add "$EU_CONTEXT" --name eu-west-1

echo "Registered clusters:"
argocd cluster list
