"""
LlamaIndex Setup for Electrician Apprenticeship Knowledge Base
This script sets up LlamaIndex to ingest your comprehensive electrician knowledge base
"""

import os
import sys
from pathlib import Path

# Add the current directory to Python path for imports
current_dir = Path(__file__).parent
sys.path.append(str(current_dir))

try:
    from llama_index.core import VectorStoreIndex, Document, Settings
    from llama_index.core.node_parser import MarkdownNodeParser
    from llama_index.embeddings.huggingface import HuggingFaceEmbedding
    from llama_index.core.vector_stores import SimpleVectorStore
    from llama_index.core.storage import StorageContext
    print("✅ LlamaIndex imports successful")
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Please install required packages:")
    print("pip install llama-index")
    print("pip install llama-index[embeddings]")
    print("pip install sentence-transformers")
    sys.exit(1)

class ElectricianKnowledgeBase:
    def __init__(self, data_dir="dataforchatbot"):
        self.data_dir = Path(data_dir)
        self.knowledge_file = Path(__file__).parent / "comprehensive_electrician_knowledge_base.md"
        self.index_file = self.data_dir / "electrician_index.json"
        self.settings_file = self.data_dir / "settings.json"

    def check_requirements(self):
        """Check if all required files exist"""
        if not self.knowledge_file.exists():
            print(f"❌ Knowledge base file not found: {self.knowledge_file}")
            return False

        print(f"✅ Found knowledge base: {self.knowledge_file}")
        print(f"📊 File size: {self.knowledge_file.stat().st_size:,} bytes")
        return True

    def setup_llamaindex(self):
        """Set up LlamaIndex with optimized settings"""
        print("🔧 Setting up LlamaIndex...")

        # Configure settings for better performance
        Settings.chunk_size = 1024  # Smaller chunks for detailed content
        Settings.chunk_overlap = 100  # Overlap for context preservation

        # Use a good embedding model
        try:
            Settings.embed_model = HuggingFaceEmbedding(
                model_name="sentence-transformers/all-MiniLM-L6-v2",
                cache_folder=str(self.data_dir / "embeddings_cache")
            )
            print("✅ Embedding model configured")
        except Exception as e:
            print(f"⚠️  Could not load embedding model: {e}")
            print("Using default embedding model")

        return True

    def load_and_parse_document(self):
        """Load and parse the markdown document"""
        print("📖 Loading knowledge base document...")

        try:
            with open(self.knowledge_file, 'r', encoding='utf-8') as f:
                content = f.read()

            # Create document
            document = Document(
                text=content,
                metadata={
                    "source": "SkilledTradesBC Comprehensive Database",
                    "type": "electrician_apprenticeship_guide",
                    "version": "2024",
                    "coverage": "British Columbia, Canada"
                }
            )

            print(f"✅ Document loaded: {len(content)} characters")
            return [document]

        except Exception as e:
            print(f"❌ Error loading document: {e}")
            return None

    def create_vector_index(self, documents):
        """Create vector index from documents"""
        print("🔍 Creating vector index...")

        try:
            # Parse documents into nodes
            parser = MarkdownNodeParser()
            nodes = parser.get_nodes_from_documents(documents)

            print(f"✅ Parsed into {len(nodes)} nodes")

            # Create index
            index = VectorStoreIndex.from_documents(
                documents,
                transformations=[parser]
            )

            print("✅ Vector index created successfully")
            return index

        except Exception as e:
            print(f"❌ Error creating index: {e}")
            return None

    def save_index(self, index):
        """Save the index for future use"""
        print("💾 Saving index...")

        try:
            # Save index
            index.storage_context.persist(persist_dir=str(self.data_dir / "index"))

            # Save settings
            settings_data = {
                "chunk_size": Settings.chunk_size,
                "chunk_overlap": Settings.chunk_overlap,
                "embedding_model": getattr(Settings.embed_model, 'model_name', 'default'),
                "total_nodes": len(index.docstore.docs) if hasattr(index, 'docstore') else 0
            }

            import json
            with open(self.settings_file, 'w') as f:
                json.dump(settings_data, f, indent=2)

            print(f"✅ Index saved to: {self.data_dir / 'index'}")
            print(f"✅ Settings saved to: {self.settings_file}")

        except Exception as e:
            print(f"❌ Error saving index: {e}")

    def create_query_interface(self, index):
        """Create a query interface for the chatbot"""
        print("🤖 Creating query interface...")

        query_engine = index.as_query_engine(
            similarity_top_k=5,  # Return top 5 relevant chunks
            verbose=True
        )

        return query_engine

    def test_knowledge_base(self, query_engine):
        """Test the knowledge base with sample questions"""
        print("🧪 Testing knowledge base...")

        test_questions = [
            "What are the requirements to become an electrician apprentice in BC?",
            "How many hours do I need for Red Seal certification?",
            "What financial support is available for apprentices?",
            "What are the different levels of electrician training?",
            "How do I challenge the certification exam?"
        ]

        print("\n📋 Test Results:")
        print("-" * 50)

        for i, question in enumerate(test_questions, 1):
            try:
                response = query_engine.query(question)
                print(f"\n{i}. Q: {question}")
                print(f"A: {str(response)[:200]}...")
            except Exception as e:
                print(f"\n{i}. Q: {question}")
                print(f"❌ Error: {e}")

    def run_setup(self):
        """Run the complete setup process"""
        print("🚀 Starting Electrician Knowledge Base Setup")
        print("=" * 60)

        # Check requirements
        if not self.check_requirements():
            return False

        # Setup LlamaIndex
        if not self.setup_llamaindex():
            return False

        # Load and parse document
        documents = self.load_and_parse_document()
        if not documents:
            return False

        # Create vector index
        index = self.create_vector_index(documents)
        if not index:
            return False

        # Save index
        self.save_index(index)

        # Create query interface
        query_engine = self.create_query_interface(index)

        # Test the knowledge base
        self.test_knowledge_base(query_engine)

        print("\n" + "=" * 60)
        print("🎉 Setup Complete!")
        print("📁 Knowledge base ready for your Panday chatbot!")
        return True

def main():
    """Main setup function"""
    knowledge_base = ElectricianKnowledgeBase()
    success = knowledge_base.run_setup()

    if success:
        print("\n📖 Usage Instructions:")
        print("1. Your knowledge base is ready in: dataforchatbot/")
        print("2. Use the query interface in your chatbot application")
        print("3. The index is saved and can be reused without reprocessing")

        print("\n🔧 Next Steps:")
        print("- Integrate the query_engine into your chatbot")
        print("- Add conversational interface")
        print("- Consider adding more documents to expand knowledge")
    else:
        print("\n❌ Setup failed. Please check the errors above.")

    return success

if __name__ == "__main__":
    main()