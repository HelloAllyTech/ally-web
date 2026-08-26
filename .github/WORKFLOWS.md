# GitHub Actions Workflows for Monorepo ECS Deployment

This directory contains a comprehensive, reusable workflow system for deploying applications to AWS ECS from a monorepo structure.

## 🏗️ Architecture Overview

The workflow system is designed with modularity and reusability in mind:

```
.github/
├── workflows/
│   ├── deploy-ecs-service.yml              # Reusable workflow for ECS deployment
│   ├── deploy-ally-helpline-dashboard.yml  # App-specific workflow
│   ├── deploy-app-template.yml             # Template for new apps
│   ├── manual-deploy.yml                   # Centralized manual deployment
│   └── ci.yml                              # Main CI workflow
└── actions/
    ├── aws/
    │   ├── set-environment-vars/           # AWS environment configuration
    │   ├── set-service-vars/              # ECS service configuration
    │   └── deploy-ecs/                    # ECS deployment action
    └── docker/
        └── build-push/                    # Docker build and push action
```

## 🚀 Features

- **Diff-based Triggers**: Only deploys when changes are detected in specific app directories
- **Multi-Environment Support**: Supports dev, staging, and production environments
- **Reusable Components**: Modular actions that can be reused across different apps
- **Optimized Docker Builds**: Multi-stage builds with caching for faster deployments
- **PR Testing**: Builds and tests on pull requests without deployment
- **Centralized Manual Deployment**: Single workflow to deploy any app to any environment
- **Smart Change Detection**: Automatically detects changes or allows force deployment
- **Comprehensive Logging**: Detailed step summaries and deployment information

## 📋 Prerequisites

### Repository Variables

Set the following repository variables in GitHub:

#### Development Environment

- `DEV_AWS_ROLE`: AWS IAM role ARN for development
- `DEV_AWS_REGION`: AWS region for development
- `DEV_ECR_REPOSITORY`: ECR repository URL for development

#### Staging Environment

- `STG_AWS_ROLE`: AWS IAM role ARN for staging
- `STG_AWS_REGION`: AWS region for staging
- `STG_ECR_REPOSITORY`: ECR repository URL for staging

#### Production Environment

- `PRD_AWS_ROLE`: AWS IAM role ARN for production
- `PRD_AWS_REGION`: AWS region for production
- `PRD_ECR_REPOSITORY`: ECR repository URL for production

### AWS Resources

Ensure the following AWS resources exist:

1. **ECS Clusters**: Named as `{PROJECT_PREFIX}-{PROJECT_REGION}-ecs-cluster`
2. **ECS Services**: Named as `{PROJECT_PREFIX}-{SERVICE_NAME}`
3. **ECR Repositories**: Named as `{PROJECT_PREFIX}-{SERVICE_NAME}`
4. **Task Definitions**: Named as `{PROJECT_PREFIX}-{SERVICE_NAME}`
5. **S3 Buckets**: Named as `{PROJECT_PREFIX}-s3-environment` (for environment files)

## 🎮 Manual Deployment Workflow

The `manual-deploy.yml` workflow provides a centralized way to deploy any application to any environment with the following features:

### Features

- **App Selection**: Choose from a dropdown of available applications
- **Environment Selection**: Deploy to dev, staging, or production
- **Smart Change Detection**: Automatically checks for recent changes in the app directory
- **Force Deploy Option**: Override change detection to deploy anyway
- **Comprehensive Logging**: Detailed deployment summaries and status reports

### How It Works

1. **Validation**: Validates inputs and configures app-specific settings
2. **Change Detection**: Checks for changes in the last 50 commits (can be bypassed)
3. **Deployment**: Uses the reusable ECS workflow with app-specific configuration
4. **Summary**: Provides detailed deployment status and recommendations

### Adding New Apps

To add a new app to the manual deployment workflow, update the `validate-and-configure` job:

```yaml
# Add to the app_name options
options:
  - ally-helpline-dashboard
  - your-new-app  # Add here

# Add to the case statement
"your-new-app")
  echo "app_path=apps/your-new-app" >> $GITHUB_OUTPUT
  echo "build_command=npm run build:prod" >> $GITHUB_OUTPUT
  echo "node_version=18" >> $GITHUB_OUTPUT
  echo "port=3000" >> $GITHUB_OUTPUT
  echo "dockerfile_path=dockerfile" >> $GITHUB_OUTPUT
  echo "service_name=your-new-app" >> $GITHUB_OUTPUT
  ;;
```

## 🔧 Adding a New App

To add deployment for a new app in your monorepo:

### 1. Copy the Template

```bash
cp .github/workflows/deploy-app-template.yml .github/workflows/deploy-your-app.yml
```

### 2. Customize the Environment Variables

Update the `env` section at the top of your new workflow file:

```yaml
env:
  # App Configuration - CUSTOMIZE THESE VALUES
  SERVICE_NAME: "user-api" # Service name (used directly after project prefix)
  APP_PATH: "apps/user-api" # Path to your app directory
  DOCKERFILE_PATH: "dockerfile" # Path to Dockerfile
  BUILD_COMMAND: "npm run build:prod" # Build command
  NODE_VERSION: "18" # Node.js version
  PORT: "3000" # Port your app runs on
```

### 3. Benefits of the New Structure

The variablized approach provides several advantages:

- **🔧 Single Point of Configuration**: All app settings in one place at the top
- **🚀 Reduced Duplication**: No more repeating the same values across multiple jobs
- **🛠️ Easier Maintenance**: Change a value once and it updates everywhere
- **📝 Cleaner Code**: More readable and less error-prone
- **⚡ Smart Environment Detection**: Automatically determines deployment target
- **🎯 Consolidated Jobs**: Single deployment job instead of three separate ones

## 🎯 Workflow Triggers

### Automatic Deployment

Deployments are triggered automatically when:

1. **Push to dev branch**: Deploys to development environment
2. **Push to stg branch**: Deploys to staging environment
3. **Push to main/master branch**: Deploys to production environment

### Manual Deployment

#### Option 1: Centralized Manual Deploy (Recommended)

Use the centralized manual deployment workflow for any app:

1. Go to Actions → Select "Manual Deploy"
2. Click "Run workflow"
3. Select the application from dropdown
4. Select the target environment
5. Optionally enable "Force Deploy" to deploy without recent changes
6. Click "Run workflow"

#### Option 2: App-Specific Manual Deploy

Use individual app workflows for specific deployments:

1. Go to Actions → Select your app's workflow (e.g., "Deploy Ally Helpline Dashboard")
2. Click "Run workflow"
3. Select the target environment
4. Click "Run workflow"

### Pull Request Testing

When a PR is created:

1. Builds the application
2. Runs tests (if available)
3. Provides build status
4. **Does not deploy** to any environment

## 🏷️ Environment Configuration

The system supports three environments with different configurations:

### Development (`dev`)

- **Project Prefix**: `life-dev`
- **Project Region**: `sg`
- **Branch**: `dev`

### Staging (`stg`)

- **Project Prefix**: `life-stg`
- **Project Region**: `mb`
- **Branch**: `stg`

### Production (`prd`)

- **Project Prefix**: `life-prd`
- **Project Region**: `mb`
- **Branch**: `main`/`master`

## 🐳 Docker Configuration

### Default Dockerfile

The system creates an optimized multi-stage Dockerfile automatically:

```dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production --legacy-peer-deps && npm cache clean --force

# Production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Install serve globally
RUN npm install -g serve

# Copy built application
COPY --from=deps /app/node_modules ./node_modules
COPY dist ./dist
COPY package*.json ./

USER nextjs
EXPOSE 8080
ENV PORT 8080

CMD ["serve", "-s", "dist", "-l", "8080"]
```

### Custom Dockerfile

If your app has a custom Dockerfile, specify it in the workflow:

```yaml
dockerfile_path: "custom.dockerfile"
```

## 📊 Monitoring and Debugging

### Step Summaries

Each workflow provides detailed step summaries including:

- Environment information
- Service configuration
- Build status
- Docker image details
- Deployment status

### Logs

Check the Actions tab for detailed logs of each step:

1. Environment preparation
2. Docker build and push
3. ECS deployment
4. Service stability checks

## 🔒 Security Best Practices

1. **IAM Roles**: Use least-privilege IAM roles for each environment
2. **Secrets Management**: Store sensitive data in GitHub Secrets, not repository variables
3. **Environment Isolation**: Each environment uses separate AWS resources
4. **Branch Protection**: Protect main/master branches to prevent unauthorized production deployments

## 🛠️ Troubleshooting

### Common Issues

1. **Build Failures**
   - Check Node.js version compatibility
   - Verify build command is correct
   - Ensure all dependencies are listed in package.json

2. **Docker Push Failures**
   - Verify ECR repository exists
   - Check AWS credentials and permissions
   - Ensure ECR repository URL is correct

3. **ECS Deployment Failures**
   - Verify ECS service and cluster exist
   - Check task definition configuration
   - Ensure security groups allow traffic

### Debug Steps

1. Check workflow logs in the Actions tab
2. Verify repository variables are set correctly
3. Ensure AWS resources exist and are properly configured
4. Test Docker build locally

## 📝 Contributing

When adding new features to the workflow system:

1. Update the reusable workflow (`.github/workflows/reusable/deploy-ecs-service.yml`)
2. Update composite actions in `.github/actions/` as needed
3. Test with a sample application
4. Update this documentation
5. Update the template file (`.github/workflows/templates/deploy-app-template.yml`)

## 🔄 Migration from Existing Workflows

To migrate from the existing `apps/ally-helpline-dashboard/.github/workflows/main.yaml`:

1. The new system provides the same functionality with better modularity
2. Environment variables and AWS resources remain the same
3. The new workflow includes additional features like PR testing and better error handling
4. Consider removing the old workflow file after testing the new system

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [Docker Multi-stage Builds](https://docs.docker.com/develop/dev-best-practices/dockerfile_best-practices/#use-multi-stage-builds)
