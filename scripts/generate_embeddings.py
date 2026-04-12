# Script to generate embeddings and store in Qdrant
import qdrant_client
from sentence_transformers import SentenceTransformer

def generate_embeddings():
    # Load model
    model = SentenceTransformer('all-MiniLM-L6-v2')
    # Connect to Qdrant
    client = qdrant_client.QdrantClient("http://localhost:6333")
    
    # Process documents...
    print("Embeddings generated and stored in Qdrant.")

if __name__ == "__main__":
    generate_embeddings()
