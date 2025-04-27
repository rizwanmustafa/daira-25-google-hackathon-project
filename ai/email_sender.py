from langgraph import graph
from pydantic import BaseModel
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from google.cloud import firestore
import smtplib
import ssl
from email.message import EmailMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import HumanMessage
from dotenv import load_dotenv
import os

load_dotenv()

def get_provider_email(db: firestore.Client, provider_id: str) -> Optional[str]:
    """
    Fetch provider's email from the database.
    
    Args:
        db: Firestore client instance
        provider_id: ID of the provider
        
    Returns:
        Optional[str]: Provider's email if found, None otherwise
    """
    try:
        # First try to get the provider directly
        provider_docs = db.collection('users').where('userType', '==', 'provider')
        for provider_doc in provider_docs.stream():
            if provider_doc.exists and provider_id == provider_doc.id:
                provider_data = provider_doc.to_dict()
                print("Provider email: ", provider_data.get('email'))
                return provider_data.get('email')
        
        # If not found, search in the users collection
        users_ref = db.collection('users')
        for user_doc in users_ref.stream():
            user_data = user_doc.to_dict()
            if user_data.get('userType') == 'provider' and user_doc.id == provider_id:
                return user_data.get('email')
        
        print(f"Provider with ID {provider_id} not found or not a provider")
        return None
    except Exception as e:
        print(f"Error fetching provider email: {e}")
        return None

def send_email(to_email: str, subject: str, body: str) -> bool:
    """
    Send an email using SMTP with SSL encryption
    
    Args:
        to_email: Recipient's email address
        subject: Email subject
        body: Email body content
        
    Returns:
        bool: True if email sent successfully, False otherwise
    """
    # Get credentials from environment variables
    sender_email = os.environ.get("EMAIL_ADDRESS")
    email_password = os.environ.get("EMAIL_PASSWORD")
    
    if not all([sender_email, email_password]):
        raise ValueError("Missing email credentials in environment variables")
    
    # Create email message
    msg = EmailMessage()
    msg['Subject'] = subject
    msg['From'] = sender_email
    msg['To'] = to_email
    msg.set_content(body)
    
    try:
        # Create secure SSL context
        context = ssl.create_default_context()
        
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as server:
            server.login(sender_email, email_password)
            server.send_message(msg)
            return True
    except Exception as e:
        print(f"Error sending email: {e}")
        return False

def generate_email_content(order_details: Dict[str, Any]) -> str:
    """Generate email content using LLM."""
    PROMPT = """Write a friendly order notification email for provider regarding order for customer '{customer_name}'
    Order ID: {id}. Items: {items}. Total: {total}. Delivery Address: {delivery_address}."""

    template = ChatPromptTemplate.from_template(PROMPT)

    chat = ChatGoogleGenerativeAI(model="gemini-2.0-flash", temperature=0.5)
    chain = template | chat
    emailBody =  chain.invoke({"id": order_details['order_id'], "items": order_details['items'], "total": order_details['total'], "delivery_address": order_details['delivery_address'], "customer_name": order_details['customer_name']}).content
    return emailBody

def update_next_order_date(db: firestore.Client, list_id: str, frequency: str) -> None:
    """Update the next order date based on frequency."""
    list_ref = db.collection('lists').document(list_id)
    list_doc = list_ref.get()
    
    if list_doc.exists:
        list_data = list_doc.to_dict()
        current_date = list_data.get('next_order_date', datetime.now())
        
        if frequency == 'weekly':
            new_date = current_date + timedelta(weeks=1)
        elif frequency == 'monthly':
            new_date = current_date + timedelta(days=30)
        elif frequency == '2 weeks':
            new_date = current_date + timedelta(weeks=2)
        else:
            new_date = current_date + timedelta(days=7)
            
        list_ref.update({'next_order_date': new_date})

def get_approaching_orders(db: firestore.Client) -> list:
    """Get orders that are approaching their delivery date."""
    today = datetime.now()
    approaching_date = today + timedelta(days=3)
    approaching_orders = []
    
    # Get recurring orders
    lists_ref = db.collection('lists')
    for list_doc in lists_ref.stream():
        list_data = list_doc.to_dict()
        if list_data.get('next_order_date', datetime.now()).date() <= approaching_date.date():
            approaching_orders.append({
                'list_id': list_doc.id,
                'type': 'recurring',
                'data': list_data
            })
    
    # Get new orders
    orders_ref = db.collection('orders')
    for order_doc in orders_ref.stream():
        order_data = order_doc.to_dict()
        if order_data.get('delivery_date', datetime.now()).date() <= approaching_date.date():
            approaching_orders.append({
                'list_id': order_doc.id,
                'type': 'new',
                'data': order_data
            })
    
    return approaching_orders

class OrderEmailAgent(graph.Graph):
    def __init__(self, db: firestore.Client):
        self.db = db
        super().__init__()

    def get_orders(self, _: None) -> Dict[str, Any]:
        """Get all approaching orders."""
        orders = get_approaching_orders(self.db)
        return {"orders": orders}

    def process_order(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Process a single order and send email."""
        lists = self.db.collection('lists')
        results = []
        
        for list in lists.stream():
            for order in list.to_dict()['items']:
                order_data = self.db.collection('orders').document(order).get().to_dict()
            # get order data from order_id
                provider_id = order_data.get('providerId')
                provider_email = get_provider_email(self.db, provider_id)
                
                if not provider_email:
                    results.append({"status": "FAIL", "reason": "No provider email found"})
                    continue

                print(order_data, "\n")
                customer_name=db.collection('users').document(order_data.get('userId')).get().to_dict()

                order_details = {
                    'order_id': order,
                    'customer_name': customer_name.get('name') if customer_name else 'Valued Customer',
                    'items': order_data.get('items', []),
                    'total': sum(item.get('price', 0) for item in order_data.get('items', [])),
                    'delivery_address': order_data.get('delivery_address', 'N/A'),
                }

                email_body = generate_email_content(order_details)
                subject = f"Order Notification - {order_details['order_id']}"
                
                try:
                    if send_email(provider_email, subject, email_body):
                        if order['type'] == 'recurring':
                            update_next_order_date(self.db, order['list_id'], order_data.get('frequency', 'weekly'))
                        results.append({"status": "SUCCESS", "order_id": order['list_id']})
                    else:
                        results.append({"status": "FAIL", "reason": "Email sending failed"})
                except Exception as e:
                    results.append({"status": "FAIL", "reason": f"Error: {str(e)}"})
            
        return {"results": results}

    def condition(self, state: Dict[str, Any]) -> str:
        """Handle the result of order processing."""
        results = state["results"]
        success_count = sum(1 for r in results if r["status"] == "SUCCESS")
        print(f"Processed {len(results)} orders. {success_count} successful.")
        
        # Print detailed results for debugging
        for result in results:
            print(f"Order {result.get('order_id', 'unknown')}: {result['status']} - {result.get('reason', '')}")
        
        return "END"

def build_order_email_agent(db: firestore.Client):
    """Build and compile the order email agent."""
    agent = OrderEmailAgent(db)
    
    agent.add_node("get_orders", agent.get_orders)
    agent.add_node("process_order", agent.process_order)
    
    agent.set_entry_point("get_orders")
    agent.add_edge("get_orders", "process_order")
    agent.add_conditional_edges(
        "process_order",
        agent.condition,
        {
            "END": graph.END
        }
    )
    
    return agent.compile()

if __name__ == "__main__":
    from firebase_admin import credentials, firestore, initialize_app
    import firebase_admin
    
    try:
        firebase_app = firebase_admin.get_app()
    except ValueError:
        cred = credentials.Certificate("service_account_key.json")
        firebase_app = initialize_app(cred)

    db = firestore.client()
    agent = build_order_email_agent(db)
    result = agent.invoke({"orders": []})  # Initialize with empty orders list
    print("Agent execution completed.")

