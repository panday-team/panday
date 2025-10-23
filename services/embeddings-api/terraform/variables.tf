variable "github_repo" {
  description = "GitHub repository in format 'username/repo'"
  type        = string
  # Set this via terraform.tfvars or -var flag
}

variable "roadmap_id" {
  description = "Default roadmap ID to load"
  type        = string
  default     = "electrician-bc"
}

variable "embedding_model" {
  description = "HuggingFace embedding model (must match generation)"
  type        = string
  default     = "BAAI/bge-small-en-v1.5"
}

variable "allowed_origins" {
  description = "CORS allowed origins (comma-separated)"
  type        = string
  # Example: "https://yourapp.vercel.app,http://localhost:3000"
}
