terraform {
  required_version = ">= 1.0"

  required_providers {
    railway = {
      source  = "terraform-community-providers/railway"
      version = "~> 0.3.0"
    }
  }
}

provider "railway" {
  # Set RAILWAY_TOKEN environment variable
  # Get token from: https://railway.app/account/tokens
}

# Railway project
resource "railway_project" "embeddings_api" {
  name = "panday-embeddings-api"
}

# Environment (production)
resource "railway_environment" "production" {
  project_id = railway_project.embeddings_api.id
  name       = "production"
}

# Service from GitHub
resource "railway_service" "api" {
  project_id = railway_project.embeddings_api.id
  name       = "embeddings-api"

  source {
    repo = var.github_repo # e.g., "yourusername/panday"
    branch = "main"
  }

  # Build configuration
  root_directory = "services/embeddings-api"
  dockerfile_path = "Dockerfile"

  # Start command (optional, Dockerfile CMD is used by default)
  # start_command = "python main.py"
}

# Environment variables
resource "railway_variable" "roadmap_id" {
  project_id     = railway_project.embeddings_api.id
  environment_id = railway_environment.production.id
  service_id     = railway_service.api.id
  name           = "ROADMAP_ID"
  value          = var.roadmap_id
}

resource "railway_variable" "embedding_model" {
  project_id     = railway_project.embeddings_api.id
  environment_id = railway_environment.production.id
  service_id     = railway_service.api.id
  name           = "EMBEDDING_MODEL"
  value          = var.embedding_model
}

resource "railway_variable" "allowed_origins" {
  project_id     = railway_project.embeddings_api.id
  environment_id = railway_environment.production.id
  service_id     = railway_service.api.id
  name           = "ALLOWED_ORIGINS"
  value          = var.allowed_origins
}

resource "railway_variable" "port" {
  project_id     = railway_project.embeddings_api.id
  environment_id = railway_environment.production.id
  service_id     = railway_service.api.id
  name           = "PORT"
  value          = "8000"
}

# Output the service URL
output "service_url" {
  description = "The URL of the deployed embeddings API"
  value       = railway_service.api.domain
}

output "project_id" {
  description = "Railway project ID"
  value       = railway_project.embeddings_api.id
}
