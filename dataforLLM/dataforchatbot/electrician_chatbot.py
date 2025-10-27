#!/usr/bin/env python3
"""
Electrician Apprenticeship Chatbot using LlamaIndex and OpenAI API.
Enhanced knowledge base with comprehensive electrician information.
"""

import os
import sys
from pathlib import Path
from llama_index.core import VectorStoreIndex, Document, Settings
from llama_index.llms.openai import OpenAI
from llama_index.embeddings.openai import OpenAIEmbedding
import openai

# Set OpenAI API key from environment variable
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Base URL for relative links
BASE_URL = "https://skilledtradesbc.ca"

def setup_llamaindex():
    """Setup LlamaIndex with OpenAI API."""
    try:
        # Configure OpenAI API
        openai.api_key = OPENAI_API_KEY

        # Set up LlamaIndex settings
        Settings.llm = OpenAI(model="gpt-4", api_key=OPENAI_API_KEY, temperature=0.1)
        Settings.embed_model = OpenAIEmbedding(model="text-embedding-3-small", api_key=OPENAI_API_KEY)

        print("✅ LlamaIndex configured with OpenAI API")
        return True

    except Exception as e:
        print(f"❌ Error setting up OpenAI API: {e}")
        return False

def load_knowledge_base():
    """Load the enhanced knowledge base."""
    try:
        knowledge_base_path = "enhanced_knowledge_base.md"

        if not os.path.exists(knowledge_base_path):
            print(f"❌ Knowledge base not found at {knowledge_base_path}")
            return None

        print("📚 Loading enhanced knowledge base...")
        with open(knowledge_base_path, 'r', encoding='utf-8') as f:
            content = f.read()

        print(f"✅ Knowledge base loaded ({len(content)} characters)")

        # Create document and index
        document = Document(text=content)
        index = VectorStoreIndex.from_documents([document])

        print("✅ Index created successfully")
        return index

    except Exception as e:
        print(f"❌ Error loading knowledge base: {e}")
        return None

def query_knowledge_base(index, question: str) -> str:
    """Query the knowledge base with a question."""
    try:
        query_engine = index.as_query_engine(similarity_top_k=5)

        print(f"\n🔍 Searching for: {question}")
        print("⏳ Processing query...")

        response = query_engine.query(question)

        return str(response)

    except Exception as e:
        return f"❌ Error querying knowledge base: {e}"

def format_response(response: str) -> str:
    """Format the response for better readability."""
    formatted = response.strip()

    # Add some basic formatting
    if not formatted.startswith("❌"):
        formatted = f"💡 {formatted}"

    # Prepend BASE_URL to relative links in markdown format [text](/path)
    import re
    formatted = re.sub(r'\[(.*?)\]\((?!https?://)(.*?)\)', r'[\1](' + BASE_URL + r'\2)', formatted)

    return formatted

def print_welcome():
    """Print welcome message."""
    print("\n" + "="*60)
    print("🤖 ELECTRICIAN APPRENTICESHIP CHATBOT")
    print("="*60)
    print("Enhanced knowledge base with comprehensive electrician information")
    print("from SkilledTradesBC and official sources.")
    print("\n📋 Available Topics:")
    print("• Apprenticeship pathways and requirements")
    print("• Training levels (Foundation, Common Core 1-4)")
    print("• Red Seal certification process")
    print("• Financial support and grants")
    print("• Youth programs (ACE IT, Youth Train/Work in Trades)")
    print("• Exam preparation and study resources")
    print("• Construction vs Industrial electrician paths")
    print("\n💡 Tips:")
    print("• Ask specific questions for best results")
    print("• Include context like 'Level 2' or 'Red Seal'")
    print("• Type 'quit' or 'exit' to end the conversation")
    print("="*60)

def main():
    """Main chatbot function."""
    print("🚀 Starting Electrician Apprenticeship Chatbot...")

    # Setup
    if not setup_llamaindex():
        sys.exit(1)

    # Load knowledge base
    index = load_knowledge_base()
    if not index:
        sys.exit(1)

    # Welcome message
    print_welcome()

    # Chat loop
    while True:
        try:
            question = input("\n❓ Your question: ").strip()

            if not question:
                continue

            if question.lower() in ['quit', 'exit', 'bye']:
                print("\n👋 Thanks for using the Electrician Apprenticeship Chatbot!")
                print("Stay skilled and safe! ⚡")
                break

            # Query knowledge base
            response = query_knowledge_base(index, question)

            # Format and display response
            formatted_response = format_response(response)
            print(f"\n{formatted_response}")

        except KeyboardInterrupt:
            print("\n\n👋 Chatbot interrupted. Thanks for using!")
            break
        except Exception as e:
            print(f"\n❌ Unexpected error: {e}")

if __name__ == "__main__":
    main()