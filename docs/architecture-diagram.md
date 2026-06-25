# BrainBytes Deployment Architecture

```mermaid
graph TD
    subgraph "Developer Workflow"
        DEV[Developer] -->|git push| GH[GitHub Repository]
    end

    subgraph "GitHub Actions CI/CD Pipeline"
        GH -->|trigger| LINT[Lint & Format]
        LINT -->|pass| TEST[Run Tests]
        TEST -->|pass| BUILD[Build Docker Images]
        BUILD -->|pass| E2E[E2E Tests]
        BUILD -->|pass| SEC[Security Scan]
        E2E -->|pass| DEPLOY[Deploy to OCI]
    end

    subgraph "Oracle Cloud Infrastructure (AP-Singapore)"
        subgraph "VCN - 10.0.0.0/16"
            subgraph "Public Subnet - 10.0.1.0/24"
                INSTANCE[VM.Standard.E2.1.Micro<br/>1 OCPU · 1 GB RAM · Ubuntu 22.04]
            end
        end

        subgraph "Security Layer"
            UFW[UFW Firewall<br/>Ports: 22, 80, 443, 3000]
            SSH[SSH Keys Only]
            FB[Fail2Ban]
            AUTO[Auto Updates]
        end

        subgraph "Docker Containers"
            FE[Frontend<br/>Next.js :80]
            BE[Backend<br/>Express :3000]
            DB[(MongoDB 7<br/>:27017)]
        end

        subgraph "Persistent Storage - 50 GB Block Volume"
            MONGO_DATA[mongodb/]
            LOGS[logs/]
            BACKUPS[backups/]
        end
    end

    subgraph "External Services"
        GROQ[Groq AI API]
        SNYK[Snyk Scanner]
    end

    DEPLOY -->|SCP Docker Images| INSTANCE
    INSTANCE --> FE
    FE -->|HTTP| BE
    BE -->|Database| DB
    BE -->|API Call| GROQ
    MONGO_DATA --> DB
    LOGS --> INSTANCE
    BUILD -->|image scan| SNYK
```

## Component Relationships

| Component | Connects To | Protocol | Purpose |
|-----------|------------|----------|---------|
| User's Browser | Frontend (:80) | HTTPS | Web UI |
| Frontend (Next.js) | Backend (:3000) | HTTP | API calls |
| Backend (Express) | MongoDB (:27017) | MongoDB Wire | Data persistence |
| Backend (Express) | Groq API | HTTPS | AI responses |
| GitHub Actions | OCI Instance | SSH/SCP | Deployment |

## Network Flow

```
Internet → [Security List: 80, 443, 3000] → UFW → Docker Containers
                                                            ↓
                                              Block Volume (50 GB)
                                                    ↓
                                         MongoDB Data / Logs / Backups
```
