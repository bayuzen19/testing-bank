---
name: bank-cicd-kubernetes
description: Review GitHub CI/CD and prepare protected delivery to internal Kubernetes with reproducible builds, gated evidence and rollback.
---
# Internal CI/CD

Read workflows as privileged code. Trace triggers, checkout revision, tokens, secrets,
runner trust and artifacts across every job. Require full-SHA action pins, minimal
permissions, timeouts and immutable release provenance. Do not use pull_request_target
to execute PR code. Untrusted code must not reach privileged persistent runners.

Use ephemeral internal runners and protected environments configured outside the repo.
The runner label alone does not enforce isolation or approval. QA/security/Sonar gates
must explicitly pass for the same commit before generating release artifacts. An AI
review is advisory and does not replace deterministic checks or human approval.

For Kubernetes, build once, promote by digest, disable privilege escalation and service
account token mounting, drop capabilities, set resource bounds and probes, and load
secrets separately. Verify namespace RBAC, NetworkPolicy enforcement, DNS/database
egress, ingress TLS and image provenance. Validate with server dry-run on the actual
cluster before rollout. Apply through the protected deployment environment only when
the user authorized deployment. Record rollout status and immutable rollback images.

Discover docs/OPERATIONS.md, deploy/kubernetes.yaml or deploy/k8s, and the CI/CD workflows. Do not fill
unknown registry, cluster or secret values with invented production details. Templates
and local checks do not prove a deployed cluster works.
