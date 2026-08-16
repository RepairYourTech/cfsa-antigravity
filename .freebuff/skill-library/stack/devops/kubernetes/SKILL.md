---
name: kubernetes
description: "Comprehensive Kubernetes patterns guide covering Pod design, Deployments, Services, Ingress, ConfigMaps, Secrets, PersistentVolumes, Helm charts, resource management, health probes, autoscaling, RBAC, NetworkPolicies, namespaces, Kustomize, GitOps with ArgoCD/Flux, debugging, and monitoring with Prometheus and Grafana. Use when deploying applications to Kubernetes, designing cluster architecture, or troubleshooting workloads."
version: 1.0.0
---

# Kubernetes

## 1. Philosophy

Kubernetes is a **container orchestration platform** that automates deployment, scaling, and management of containerized applications. You declare the desired state of your workloads, and Kubernetes continuously reconciles actual state to match.

**Key principles**:
- Declarative over imperative. Define what you want, not how to get there.
- Immutable deployments. Never patch running containers -- build a new image and roll it out.
- Labels and selectors are the glue. Every relationship in Kubernetes is label-based.
- Resource limits are mandatory. A container without limits can starve the entire node.
- Health checks are not optional. Without probes, Kubernetes cannot manage your application.

---

## 2. Pod Design Patterns

### Single-Container Pod

The simplest unit. One container, one concern.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: web-server
  labels:
    app: web
    tier: frontend
spec:
  containers:
    - name: web
      image: nginx:1.25-alpine
      ports:
        - containerPort: 80
      resources:
        requests:
          cpu: "100m"
          memory: "128Mi"
        limits:
          cpu: "250m"
          memory: "256Mi"
```

### Init Containers

Init containers run before app containers start. Use them for setup tasks like database migrations, config generation, or waiting for dependencies.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-init
spec:
  initContainers:
    - name: wait-for-db
      image: busybox:1.36
      command: ["sh", "-c"]
      args:
        - |
          until nc -z database-svc 5432; do
            echo "Waiting for database..."
            sleep 2
          done
    - name: run-migrations
      image: myapp:latest
      command: ["node", "migrate.js"]
      envFrom:
        - secretRef:
            name: db-credentials
  containers:
    - name: app
      image: myapp:latest
      ports:
        - containerPort: 3000
```

### Sidecar Containers

Sidecars augment the main container with supporting functionality.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-sidecar
spec:
  containers:
    - name: app
      image: myapp:latest
      ports:
        - containerPort: 3000
      volumeMounts:
        - name: shared-logs
          mountPath: /var/log/app

    - name: log-shipper
      image: fluent/fluent-bit:latest
      volumeMounts:
        - name: shared-logs
          mountPath: /var/log/app
          readOnly: true
        - name: fluentbit-config
          mountPath: /fluent-bit/etc/

  volumes:
    - name: shared-logs
      emptyDir: {}
    - name: fluentbit-config
      configMap:
        name: fluentbit-config
```

---

## 3. Deployments

### Rolling Updates

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-app
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1    # At most 1 pod down during update
      maxSurge: 1           # At most 1 extra pod during update
  template:
    metadata:
      labels:
        app: web-app
        version: v2.1.0
    spec:
      containers:
        - name: app
          image: myapp:2.1.0
          ports:
            - containerPort: 3000
          resources:
            requests:
              cpu: "200m"
              memory: "256Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
          readinessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 15
            periodSeconds: 20
```

### Rollbacks

```bash
# Check rollout history
kubectl rollout history deployment/web-app

# Undo the last deployment
kubectl rollout undo deployment/web-app

# Roll back to a specific revision
kubectl rollout undo deployment/web-app --to-revision=3

# Watch rollout progress
kubectl rollout status deployment/web-app
```

---

## 4. Services

### ClusterIP (Internal)

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-app-svc
spec:
  type: ClusterIP    # Default -- only reachable within the cluster
  selector:
    app: web-app
  ports:
    - port: 80
      targetPort: 3000
      protocol: TCP
```

### NodePort (Development/Testing)

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-app-nodeport
spec:
  type: NodePort
  selector:
    app: web-app
  ports:
    - port: 80
      targetPort: 3000
      nodePort: 30080    # Accessible on every node at this port
```

### LoadBalancer (Cloud)

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-app-lb
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
spec:
  type: LoadBalancer
  selector:
    app: web-app
  ports:
    - port: 443
      targetPort: 3000
```

### Headless Service (StatefulSets)

```yaml
apiVersion: v1
kind: Service
metadata:
  name: database-headless
spec:
  clusterIP: None     # No load balancing -- DNS returns all pod IPs
  selector:
    app: database
  ports:
    - port: 5432
```

---

## 5. Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-ingress
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/rate-limit-rps: "10"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - app.example.com
        - api.example.com
      secretName: app-tls-cert
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend-svc
                port:
                  number: 80
    - host: api.example.com
      http:
        paths:
          - path: /v1
            pathType: Prefix
            backend:
              service:
                name: api-svc
                port:
                  number: 80
```

---

## 6. ConfigMaps and Secrets

### ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  APP_ENV: "production"
  LOG_LEVEL: "info"
  MAX_CONNECTIONS: "100"

  # Multi-line config file
  nginx.conf: |
    server {
      listen 80;
      location / {
        proxy_pass http://localhost:3000;
      }
    }
```

### Secrets

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
type: Opaque
# Values must be base64 encoded
data:
  username: cG9zdGdyZXM=          # echo -n "postgres" | base64
  password: c3VwZXJzZWNyZXQ=      # echo -n "supersecret" | base64
```

### Using in Pods

```yaml
spec:
  containers:
    - name: app
      image: myapp:latest
      # Individual environment variables
      env:
        - name: DB_HOST
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: APP_ENV
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: password
      # All keys as environment variables
      envFrom:
        - configMapRef:
            name: app-config
        - secretRef:
            name: db-credentials
      # Mount as files
      volumeMounts:
        - name: config-volume
          mountPath: /etc/nginx/conf.d
  volumes:
    - name: config-volume
      configMap:
        name: app-config
        items:
          - key: nginx.conf
            path: default.conf
```

---

## 7. Persistent Volumes

```yaml
# PersistentVolumeClaim
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: gp3
  resources:
    requests:
      storage: 50Gi

---
# StatefulSet with persistent storage
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  serviceName: postgres-headless
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: postgres:16-alpine
          ports:
            - containerPort: 5432
          envFrom:
            - secretRef:
                name: postgres-credentials
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: gp3
        resources:
          requests:
            storage: 50Gi
```

---

## 8. Helm Charts

### Chart Structure

```
mychart/
  Chart.yaml         # Chart metadata
  values.yaml        # Default configuration
  templates/
    deployment.yaml  # Deployment template
    service.yaml     # Service template
    ingress.yaml     # Ingress template
    _helpers.tpl     # Template helpers
    NOTES.txt        # Post-install notes
```

### Chart.yaml

```yaml
apiVersion: v2
name: myapp
description: My application Helm chart
version: 1.0.0
appVersion: "2.1.0"
dependencies:
  - name: postgresql
    version: "~13.0"
    repository: "https://charts.bitnami.com/bitnami"
    condition: postgresql.enabled
```

### Templating

```yaml
# templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "myapp.fullname" . }}
  labels:
    {{- include "myapp.labels" . | nindent 4 }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      {{- include "myapp.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "myapp.selectorLabels" . | nindent 8 }}
    spec:
      containers:
        - name: {{ .Chart.Name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
          ports:
            - containerPort: {{ .Values.service.targetPort }}
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
          {{- if .Values.livenessProbe.enabled }}
          livenessProbe:
            httpGet:
              path: {{ .Values.livenessProbe.path }}
              port: {{ .Values.service.targetPort }}
          {{- end }}
```

### Helm Commands

```bash
# Install a chart
helm install myapp ./mychart -f values-prod.yaml -n production

# Upgrade a release
helm upgrade myapp ./mychart -f values-prod.yaml -n production

# Rollback
helm rollback myapp 2 -n production

# Uninstall
helm uninstall myapp -n production

# Template rendering (dry-run)
helm template myapp ./mychart -f values-prod.yaml

# Show computed values
helm get values myapp -n production
```

---

## 9. Resource Limits and Requests

```yaml
resources:
  # Requests: guaranteed minimum resources for scheduling
  requests:
    cpu: "200m"      # 200 millicores = 0.2 CPU cores
    memory: "256Mi"  # 256 MiB
  # Limits: maximum resources the container can use
  limits:
    cpu: "500m"      # Throttled beyond this
    memory: "512Mi"  # OOMKilled beyond this
```

**Guidelines**:

| Resource | Request | Limit | Reasoning |
|----------|---------|-------|-----------|
| CPU | Set based on average usage | 2-3x request or omit | CPU is compressible -- throttling is better than eviction |
| Memory | Set based on baseline usage | 1.5-2x request | Memory is not compressible -- exceeding limit causes OOMKill |

---

## 10. Health Probes

### Liveness Probe

Determines if the container is running. Failure causes a restart.

```yaml
livenessProbe:
  httpGet:
    path: /healthz
    port: 3000
  initialDelaySeconds: 15
  periodSeconds: 20
  failureThreshold: 3
  timeoutSeconds: 5
```

### Readiness Probe

Determines if the container can receive traffic. Failure removes it from the Service.

```yaml
readinessProbe:
  httpGet:
    path: /ready
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 10
  failureThreshold: 3
```

### Startup Probe

For slow-starting containers. Disables liveness/readiness checks until it succeeds.

```yaml
startupProbe:
  httpGet:
    path: /healthz
    port: 3000
  failureThreshold: 30     # 30 * 10s = 5 minutes to start
  periodSeconds: 10
```

---

## 11. Horizontal Pod Autoscaler (HPA)

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web-app-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-app
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Pods
          value: 2
          periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 10
          periodSeconds: 60
```

---

## 12. RBAC

```yaml
# Role -- namespace-scoped permissions
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: pod-reader
  namespace: production
rules:
  - apiGroups: [""]
    resources: ["pods", "pods/log"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "list"]

---
# RoleBinding -- assigns role to a user or service account
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: read-pods
  namespace: production
subjects:
  - kind: ServiceAccount
    name: monitoring-sa
    namespace: production
  - kind: User
    name: developer@example.com
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io

---
# ClusterRole -- cluster-wide permissions
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: node-reader
rules:
  - apiGroups: [""]
    resources: ["nodes"]
    verbs: ["get", "list", "watch"]
```

---

## 13. Network Policies

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-network-policy
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes:
    - Ingress
    - Egress
  ingress:
    # Allow traffic from frontend pods only
    - from:
        - podSelector:
            matchLabels:
              app: frontend
      ports:
        - protocol: TCP
          port: 3000
  egress:
    # Allow DNS
    - to:
        - namespaceSelector: {}
      ports:
        - protocol: UDP
          port: 53
    # Allow database access
    - to:
        - podSelector:
            matchLabels:
              app: database
      ports:
        - protocol: TCP
          port: 5432
```

---

## 14. Kustomize

```
base/
  kustomization.yaml
  deployment.yaml
  service.yaml
overlays/
  dev/
    kustomization.yaml
    replica-count.yaml
  prod/
    kustomization.yaml
    replica-count.yaml
    hpa.yaml
```

```yaml
# base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml

# overlays/prod/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
  - hpa.yaml
patches:
  - path: replica-count.yaml
namespace: production
commonLabels:
  environment: production
images:
  - name: myapp
    newTag: "2.1.0"
```

```bash
# Preview the output
kubectl kustomize overlays/prod

# Apply directly
kubectl apply -k overlays/prod
```

---

## 15. GitOps with ArgoCD

```yaml
# ArgoCD Application
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: web-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/k8s-manifests.git
    targetRevision: main
    path: overlays/prod
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true        # Delete resources removed from git
      selfHeal: true     # Revert manual changes
    syncOptions:
      - CreateNamespace=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        maxDuration: 3m0s
        factor: 2
```

---

## 16. Debugging

```bash
# Check pod status and events
kubectl describe pod <pod-name>

# View logs
kubectl logs <pod-name> -c <container-name>
kubectl logs <pod-name> --previous     # Logs from crashed container
kubectl logs -f <pod-name>              # Stream logs
kubectl logs -l app=web-app --all-containers  # All pods with label

# Execute into a running container
kubectl exec -it <pod-name> -- /bin/sh

# Port forward for local debugging
kubectl port-forward svc/web-app-svc 8080:80

# Check resource usage
kubectl top pods -n production
kubectl top nodes

# Get events sorted by time
kubectl get events --sort-by='.lastTimestamp' -n production

# Debug with an ephemeral container (K8s 1.25+)
kubectl debug <pod-name> -it --image=busybox:1.36 --target=app
```

---

## 17. Monitoring

### Prometheus ServiceMonitor

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: web-app-monitor
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      app: web-app
  endpoints:
    - port: http
      path: /metrics
      interval: 15s
```

### Grafana Dashboard (JSON Model Snippet)

```json
{
  "title": "Web App Dashboard",
  "panels": [
    {
      "title": "Request Rate",
      "targets": [
        {
          "expr": "rate(http_requests_total{app=\"web-app\"}[5m])",
          "legendFormat": "{{method}} {{status}}"
        }
      ]
    },
    {
      "title": "P99 Latency",
      "targets": [
        {
          "expr": "histogram_quantile(0.99, rate(http_request_duration_seconds_bucket{app=\"web-app\"}[5m]))",
          "legendFormat": "p99"
        }
      ]
    }
  ]
}
```

### Common PromQL Queries

```promql
# Request rate per second
rate(http_requests_total{namespace="production"}[5m])

# Error rate percentage
sum(rate(http_requests_total{status=~"5.."}[5m]))
/ sum(rate(http_requests_total[5m])) * 100

# Memory usage percentage
container_memory_working_set_bytes{namespace="production"}
/ container_spec_memory_limit_bytes{namespace="production"} * 100

# Pod restart count
increase(kube_pod_container_status_restarts_total{namespace="production"}[1h])

# CPU throttling
rate(container_cpu_cfs_throttled_seconds_total[5m])
```

---

## 18. Anti-Patterns

### NEVER

- Run containers as root -- use `securityContext.runAsNonRoot: true`
- Deploy without resource requests and limits
- Use `latest` tag for container images -- always pin versions
- Store secrets in ConfigMaps -- use Secrets (or external secret managers)
- Skip health probes -- Kubernetes cannot manage unhealthy pods without them
- Use `kubectl apply` directly in production -- use GitOps (ArgoCD, Flux)
- Create privileged containers unless absolutely necessary
- Ignore Pod Disruption Budgets for critical services
- Deploy single-replica stateful services without backup strategies
- Hardcode namespace names in manifests -- use Kustomize overlays

### ALWAYS

- Set resource requests and limits on every container
- Use namespaces to isolate environments and teams
- Define NetworkPolicies to restrict pod-to-pod communication
- Use RBAC with least-privilege service accounts
- Pin image versions with SHA digests for production
- Configure PodDisruptionBudgets for high-availability services
- Use liveness, readiness, and startup probes
- Label resources consistently (`app`, `version`, `environment`, `team`)
- Store manifests in version control
- Monitor cluster health with Prometheus and alerting
