# Terraform Deployment for Embeddings API

Deploy the Panday Embeddings API to Railway using Terraform for infrastructure as code.

## Prerequisites

1. **Terraform installed:**
   ```bash
   # macOS
   brew install terraform

   # Linux
   wget https://releases.hashicorp.com/terraform/1.6.0/terraform_1.6.0_linux_amd64.zip
   unzip terraform_1.6.0_linux_amd64.zip
   sudo mv terraform /usr/local/bin/
   ```

2. **Railway account:**
   - Sign up at https://railway.app
   - Create an API token: https://railway.app/account/tokens

3. **GitHub repository:**
   - Push your code to GitHub
   - Railway will deploy from the main branch

## Setup

### 1. Set Railway Token

```bash
export RAILWAY_TOKEN="your-token-here"

# Or add to your shell profile (~/.zshrc or ~/.bashrc)
echo 'export RAILWAY_TOKEN="your-token-here"' >> ~/.zshrc
```

### 2. Configure Variables

```bash
cd services/embeddings-api/terraform

# Copy example file
cp terraform.tfvars.example terraform.tfvars

# Edit with your values
nano terraform.tfvars
```

**Required variables:**
```hcl
github_repo     = "yourusername/panday"
allowed_origins = "https://yourapp.vercel.app"
```

### 3. Initialize Terraform

```bash
terraform init
```

This downloads the Railway provider.

### 4. Preview Changes

```bash
terraform plan
```

Review what will be created:
- Railway project
- Production environment
- API service
- Environment variables

### 5. Deploy

```bash
terraform apply
```

Type `yes` when prompted.

**Output:**
```
service_url = "https://panday-embeddings-api-production.up.railway.app"
project_id  = "abc123..."
```

## Managing Deployments

### View Current State

```bash
terraform show
```

### Update Environment Variables

Edit `terraform.tfvars` and re-apply:
```bash
terraform apply
```

### View Outputs

```bash
terraform output service_url
```

### Destroy Resources

```bash
terraform destroy
```

**⚠️ Warning:** This will delete your Railway project!

## Multiple Environments

To deploy staging + production:

**1. Create workspaces:**
```bash
terraform workspace new staging
terraform workspace new production
```

**2. Switch between environments:**
```bash
terraform workspace select production
terraform apply

terraform workspace select staging
terraform apply
```

**3. Use different variables per environment:**
```hcl
# staging.tfvars
github_repo     = "yourusername/panday"
allowed_origins = "https://staging.yourapp.vercel.app"

# production.tfvars
github_repo     = "yourusername/panday"
allowed_origins = "https://yourapp.vercel.app"
```

```bash
terraform apply -var-file="staging.tfvars"
```

## CI/CD Integration

### GitHub Actions

Create `.github/workflows/deploy-embeddings-api.yml`:

```yaml
name: Deploy Embeddings API

on:
  push:
    branches: [main]
    paths:
      - 'services/embeddings-api/**'
      - 'src/data/embeddings/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v2

      - name: Terraform Init
        working-directory: services/embeddings-api/terraform
        run: terraform init
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}

      - name: Terraform Apply
        working-directory: services/embeddings-api/terraform
        run: |
          terraform apply -auto-approve \
            -var="github_repo=${{ github.repository }}" \
            -var="allowed_origins=${{ secrets.ALLOWED_ORIGINS }}"
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

**Add secrets in GitHub:**
- `RAILWAY_TOKEN` - Your Railway API token
- `ALLOWED_ORIGINS` - CORS origins

## Troubleshooting

### Error: "Invalid Railway token"
```bash
# Check token is set
echo $RAILWAY_TOKEN

# Get a new token from Railway dashboard
export RAILWAY_TOKEN="new-token"
```

### Error: "Repository not found"
Make sure your repo is public or Railway has access to private repos.

### Error: "Build failed"
Check Railway logs:
1. Go to https://railway.app/dashboard
2. Select your project
3. View deployment logs

### State Lock Issues
If Terraform is stuck:
```bash
terraform force-unlock <lock-id>
```

## Best Practices

**1. Use remote state (recommended for teams):**

```hcl
# backend.tf
terraform {
  backend "s3" {
    bucket = "your-terraform-state"
    key    = "embeddings-api/terraform.tfstate"
    region = "us-east-1"
  }
}
```

**2. Use variables for sensitive data:**
Never commit `terraform.tfvars`! Use environment variables:

```bash
terraform apply \
  -var="github_repo=user/repo" \
  -var="allowed_origins=$ALLOWED_ORIGINS"
```

**3. Pin provider versions:**
Already done in `main.tf` with `version = "~> 0.3.0"`

**4. Review plans before applying:**
Always run `terraform plan` first!

## Cost Estimation

Railway pricing (as of 2024):
- **Hobby Plan:** $5/month for 500 hours
- **Pro Plan:** $20/month for 500 hours + overages

Your embeddings API will use:
- ~500MB memory
- Minimal CPU when idle
- Estimated cost: $5-10/month

## Alternatives to Terraform

If Terraform feels like overkill:

**Railway CLI (simpler):**
```bash
railway login
railway init
railway up
```

**Railway Dashboard (easiest):**
1. Go to railway.app
2. New Project → Deploy from GitHub
3. Select repo and root directory
4. Set environment variables
5. Deploy

**When to use Terraform:**
- ✅ Team collaboration (shared state)
- ✅ Multiple environments (staging/prod)
- ✅ Complex infrastructure
- ✅ Compliance requirements (audit trail)
- ❌ Simple personal projects → use Railway CLI

## Additional Resources

- [Railway Terraform Provider Docs](https://registry.terraform.io/providers/terraform-community-providers/railway/latest/docs)
- [Terraform Getting Started](https://developer.hashicorp.com/terraform/tutorials/aws-get-started)
- [Railway Documentation](https://docs.railway.app)
