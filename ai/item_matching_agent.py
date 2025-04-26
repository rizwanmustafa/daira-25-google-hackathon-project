from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import ChatPromptTemplate
from langchain_core.messages import HumanMessage, SystemMessage
from typing import TypedDict, List, Dict, Any, Optional
from pydantic import BaseModel, Field
from dotenv import load_dotenv
import os
from utils import *

load_dotenv()

class ExtractedData(BaseModel):
    items: List[str] = Field(default_factory=list, description="List of item names or identifiers")
    preferred_brand: Optional[str] = Field(default=None, description="Preferred brand for the items")
    delivery_time: Optional[int] = Field(default=None, description="Delivery time in days, if specified")
    category: Optional[str] = Field(default=None, description="Item category, if specified")
    quantity: Optional[int] = Field(default=None, description="Quantity of items, if specified")

class Recommendation(BaseModel):
    item_name: str 
    provider_name: str
    price: float
    distance: str
    duration: str


# Define the state schema for our item matching graph
class ItemMatchingState(TypedDict):
    # Input
    db: Any
    query: str
    user_id: str
    user_data: Optional[Dict[str, Any]]
    is_relevant: Optional[bool]
    extracted_data: ExtractedData
    # Results
    messages: List[Dict[str, Any]] = Field(default_factory=list, description="List of messages exchanged")
    matched_items: List[Dict[str, Any]]
    filtered_items: List[Dict[str, Any]]
    ranked_recommendations: List[Dict[str, Any]]

llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash", temperature=0)

# Define the nodes for our graph
def load_user_data(state: ItemMatchingState) -> ItemMatchingState:
    """Load user data from Firestore"""
    user_id = state["user_id"]
    
    user_ref = state['db'].collection('users').document(user_id)
    user_doc = user_ref.get()
    state["user_data"] = user_doc.to_dict()
    
    return state

def extract_data(state: ItemMatchingState) -> ItemMatchingState:
    """Extract data from query and user_data using LLM with structured output."""
    try:
        # Define prompt
        prompt = ChatPromptTemplate.from_template(
            """Extract the following information from the user's query:
            - List of items (e.g., product names)
            - Preferred brand (if mentioned or from user preferences)
            - Price (in cents, if specified)
            - Prefered Delivery time (in days, if specified)
            - Category (e.g., clothing, electronics)
            - Quantity (if specified)
            
            Query: {query}
            
            Convert the extracted information into lowercase and return in the specified format."""
        )
        
        # Create LLM chain with structured output
        chain = prompt | llm.with_structured_output(ExtractedData)
        query = state["query"]
        
        # Invoke LLM
        extracted_data = chain.invoke({"query": query})
        
        # Update state
        state["extracted_data"] = extracted_data
        
        return state
    
    except Exception as e:
        print(f"Error in extract_data_node: {e}")
        return state
    
def match_items_from_firestore(state: ItemMatchingState) -> ItemMatchingState:
    """Perform semantic search in Firestore matching both items and category."""

    # Load all items from Firestore
    items_ref = state['db'].collection('items')
    all_items = [(doc.id, doc.to_dict()) for doc in items_ref.stream()]

    if not all_items:
        state["messages"].append("No items found in database.")
        state["matched_items"] = []
        return state

    # Create a combined query: items + category
    query_texts = state["extracted_data"].items if state["extracted_data"].items else []
    category = state["extracted_data"].category if state["extracted_data"].category else ""
    combined_queries = [f"{item} {category}" if category else item for item in query_texts]

    matched_items= get_embeddings(combined_queries, all_items)


    # Remove duplicates based on a unique identifier, e.g., 'id'
    unique_matched = {item[0]: item[1] for item in enumerate(matched_items)}.values()

    state["matched_items"] = list(unique_matched)
    print("Updated matched items:", state["matched_items"])
    return state



def filter_by_distance(state: ItemMatchingState) -> ItemMatchingState:
    """Filter matched items by distance from user to provider"""
    user_address = state["user_data"].get("address", None)

    if not user_address:
        # If no user address, skip filtering
        state["filtered_items"] = state["matched_items"]
        return state

    api_key = os.getenv("GOOGLE_MAPS_KEY")

    # Get all providers from the database
    providers_ref = state['db'].collection('users').where("userType", "==", "provider")
    providers = [doc.to_dict() for doc in providers_ref.stream()]

    # Create a map of provider_id to provider address only for providers matching item provider_ids
    provider_addresses = {}
    matched_provider_ids = {item[1].get("provider_id") for item in state["matched_items"]}
    for doc in providers_ref.stream():
        provider = doc.to_dict()
        if doc.id in matched_provider_ids and provider.get("address"):
            provider_addresses[doc.id] = provider.get("address")

    # Get distances from user to each provider
    distances = {}
    durations = {}
    for provider_id, provider_address in provider_addresses.items():
        distance, duration = get_distance_duration(user_address, provider_address, api_key)
        distances[provider_id] = distance
        durations[provider_id] = duration

    # Sort providers by distance
    sorted_providers = sorted(distances.items(), key=lambda x: x[1])

    closest_provider_ids = [provider_id for provider_id, _ in sorted_providers[:10]]

    filtered_items = []
    for _, item in state["matched_items"]:
        provider_id = item.get("provider_id")
        if provider_id in closest_provider_ids:
            enriched_item = item.copy()
            enriched_item["distance"] = distances.get(provider_id)
            enriched_item["duration"] = durations.get(provider_id)
            filtered_items.append(enriched_item)

    state["filtered_items"] = filtered_items


    return state
    
    
def rank_recommendations(state: ItemMatchingState) -> ItemMatchingState:
    """Rank the filtered items based on user preferences and distance/duration."""
    try:
        # Define an updated Recommendation class with the fields you specified
        class Recommendation(BaseModel):
            item_name: str 
            provider_name: str
            price: float
            distance: str
            duration: str
        
        # Get filtered items (which now include distance and duration)
        filtered_items = state["filtered_items"]
        
        # Get provider information from the database to get provider names
        provider_ids = {item.get("provider_id") for item in filtered_items if item.get("provider_id")}
        providers_map = {}

        if provider_ids:
            for provider_id in provider_ids:
                provider_doc = state['db'].collection('users').document(provider_id).get()
                if provider_doc.exists:
                    provider_data = provider_doc.to_dict()
                    providers_map[provider_id] = provider_data.get("name", "Unknown Provider")
        
        # Create ranked recommendations in the structured format
        ranked_recommendations = []
        for item in filtered_items:
            provider_id = item.get("provider_id")
            provider_name = providers_map.get(provider_id, "Unknown Provider")
            
            recommendation = Recommendation(
                item_name=item.get("name", "Unknown Item"),
                provider_name=provider_name,
                price=float(item.get("price", 0)),
                distance=item.get("distance", "Unknown"),
                duration=item.get("duration", "Unknown")
            )
            ranked_recommendations.append(recommendation.model_dump())
        
        # Sort recommendations by distance (assuming smaller distance is better)
        # You could implement a more complex ranking algorithm based on user preferences here
        ranked_recommendations.sort(key=lambda x: x.get("distance", float('inf')) 
                                  if isinstance(x.get("distance"), (int, float)) 
                                  else float('inf'))
        
        state["ranked_recommendations"] = ranked_recommendations

        state["messages"].append({"content": f"Ranked recommendations: {ranked_recommendations}"})
        
        return state
    
    except Exception as e:
        print(f"Error in rank_recommendations: {e}")
        state["ranked_recommendations"] = []
        return state
    
    
def check_relevance(state: ItemMatchingState) -> ItemMatchingState:
    class Relevance(BaseModel):
        is_relevant: bool = Field(description="Whether the query is relevant for finding items")
    try:
        prompt = ChatPromptTemplate.from_messages([
            SystemMessage(content="You are a smart shopping assistant that determines if a query is relevant for finding groceries or medicines."),
            HumanMessage(content="Determine if the following query is relevant for finding items. Answer with 'yes' or 'no'. Query: {query}")
        ])
        chain = prompt | llm.with_structured_output(Relevance)
        relevance = chain.invoke({"query": state["query"]})
        state["is_relevant"] = relevance.is_relevant
        state["messages"].append({"content": f"Query relevance: {'Relevant' if relevance.is_relevant else 'Not relevant'}"})
        return state
    except Exception as e:
        print(f"Error in check_relevance: {e}")
        state["is_relevant"] = False
        state["messages"].append({"content": "Error determining query relevance, assuming not relevant"})
        return state

# Conditional edge functions
def after_check_relevance(state: ItemMatchingState) -> str:
    """Route based on query relevance."""
    return "load_user_data" if state.get("is_relevant", False) else END

def after_match_items(state: ItemMatchingState) -> str:
    """Route based on whether matched items exist."""
    return "filter_by_distance" if state.get("matched_items", []) else END

# Build the graph
def build_item_matching_graph() -> StateGraph:
    graph = StateGraph(ItemMatchingState)

    # Add nodes
    graph.add_node("check_relevance", check_relevance)
    graph.add_node("load_user_data", load_user_data)
    graph.add_node("extract_data", extract_data)
    graph.add_node("match_items_from_firestore", match_items_from_firestore)
    graph.add_node("filter_by_distance", filter_by_distance)
    graph.add_node("rank_recommendations", rank_recommendations)

    # Set entry point
    graph.set_entry_point("check_relevance")

    # Add edges
    graph.add_conditional_edges(
        "check_relevance",
        after_check_relevance,
        {"load_user_data": "load_user_data", END: END}
    )
    graph.add_edge("load_user_data", "extract_data")
    graph.add_edge("extract_data", "match_items_from_firestore")
    graph.add_conditional_edges(
        "match_items_from_firestore",
        after_match_items,
        {"filter_by_distance": "filter_by_distance", END: END}
    )
    graph.add_edge("filter_by_distance", "rank_recommendations")
    graph.add_edge("rank_recommendations", END)

    return graph.compile()

# Example usage
if __name__ == "__main__":
    # Initialize Firestore client (assuming db is set up)
    from firebase_admin import credentials, firestore, initialize_app
    import firebase_admin
    try:
    # For when the app is already initialized
        firebase_app = firebase_admin.get_app()
    except ValueError:
        # Initialize the app
        cred = credentials.Certificate("service_account_key.json")
        firebase_app = initialize_app(cred)

    db = firestore.client()

    # Create initial state
    initial_state = ItemMatchingState(
        db=db,
        query="buy coffee",
        user_id="0mi1hpGTbROkh0EYyBszs8IeRtr2",
        is_relevant=None,
        user_data=None,
        extracted_data=None,
        messages=[],
        matched_items=[],
        filtered_items=[],
        ranked_recommendations=[]
    )

    # Build and run the graph
    graph = build_item_matching_graph()
    results = graph.invoke(initial_state)
    print("Final state:", results["ranked_recommendations"])
    




