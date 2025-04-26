from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from langchain_google_genai import GoogleGenerativeAIEmbeddings
import requests
import os
# returns a tuple of distance and duration ("2,789 mi", "1 day 18 hours")
def get_distance_duration(origin, destination, api_key) -> tuple:
    origin = format_address_dict(origin)
    destination = format_address_dict(destination)
    endpoint = "https://maps.googleapis.com/maps/api/distancematrix/json"
    params = {
        "origins": origin,
        "destinations": destination,
        "key": api_key
    }
    response = requests.get(endpoint, params=params).json()
    # Extract distance and duration from the response
    distance = response['rows'][0]['elements'][0]['distance']['text']
    duration = response['rows'][0]['elements'][0]['duration']['text']
    return distance, duration


def format_address_dict(address_dict: dict) -> str:
    try:
        # Extract address components
        street = address_dict.get('street', '')
        city = address_dict.get('city', '')
        zip_code = address_dict.get('zipCode', '')
        
        # Combine components into a single address string
        address_parts = [part for part in [street, city, zip_code] if part]
        return ', '.join(address_parts)
    except Exception as e:
        print(f"Error formatting address: {e}")
        return ''

def get_embeddings(combined_queries, all_items):
    corpus = [
        f"{item[1].get('name', '')} {item[1].get('brand', '')} {item[1].get('description', '')} {item[1].get('category', '')}"
        for item in all_items
    ] 
    embeddings = GoogleGenerativeAIEmbeddings(model="models/text-embedding-004", )
    corpus_embeddings = embeddings.embed_documents(corpus)  
    query_embeddings = embeddings.embed_documents(combined_queries)  

    similarity_threshold = 0.75  # Minimum similarity score
    max_matches_per_query = 7
    seen_item_ids = set()

    # Perform semantic search
    matched_items = []
    for query_vec in query_embeddings:
        sims = cosine_similarity(np.array(query_vec).reshape(1,-1), corpus_embeddings).flatten()
        top_indices = np.argsort(sims)[::-1][:max_matches_per_query]
        for idx in top_indices:
            if sims[idx] > similarity_threshold:
                item = all_items[idx]
                seen_item_ids.add(item[0])
                matched_items.append(all_items[idx])
    
    return matched_items

if __name__ == "__main__":
    # GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_KEY")
    # origin = "Johar Town, Lahore"
    # destination = "Gulberg, Lahore"
    # distance = get_distance_and_duration(origin, destination, GOOGLE_MAPS_API_KEY)
    # print(f"Distance: {distance}")

    combined_queries = ["blue shoes", "leather jacket"]
    all_items = [
        {"id": 1, "name": "blue sneakers", "brand": "Nike", "description": "comfortable running shoes", "category": "footwear"},
        {"id": 2, "name": "black leather jacket", "brand": "Zara", "description": "stylish outerwear for winter", "category": "clothing"},
        {"id": 3, "name": "red t-shirt", "brand": "Adidas", "description": "casual sportswear", "category": "clothing"},
        {"id": 4, "name": "white sandals", "brand": "Birkenstock", "description": "open-toe summer footwear", "category": "footwear"},
        {"id": 5, "name": "brocolli", "brand": "", "description": "green vegetables", "category": "vegetables"},
    ]

    matched_items = get_embeddings(combined_queries, all_items)
    for item in matched_items:
        print(item)
