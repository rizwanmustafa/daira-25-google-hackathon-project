from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Any
from datetime import datetime
from firebase_admin import auth
from firebase_config import db

# Create FastAPI app
app = FastAPI(
    title="Grocery Delivery API",
    version="1.0.0",
    description="API for Grocery Delivery Application"
)

# Security
security = HTTPBearer()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class Address(BaseModel):
    street: str
    city: str
    zipCode: str

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    userType: str
    phoneNumber: str
    address: Address

class User(BaseModel):
    email: str
    name: str
    userType: str
    phoneNumber: str
    address: Address

class GeneralItem(BaseModel):
    name: str
    category: str
    brands: List[str]
    defaultImageUrl: Optional[str] = None
    description: Optional[str] = None

class Item(BaseModel):
    name: str
    category: str
    brand: str
    price: float
    description: Optional[str] = None
    providerId: str
    availableStock: int
    generalItemId: Optional[str] = None
    imageUrl: Optional[str] = None

class OrderItem(BaseModel):
    itemId: str
    name: str
    quantity: int
    price: float

class Order(BaseModel):
    userId: str
    providerId: str
    items: List[OrderItem]
    totalPrice: float
    status: str = "pending"
    deliveryAddress: Address
    scheduledDeliveryTime: Optional[datetime] = None

class ShoppingList(BaseModel):
    userId: str
    name: str
    items: List[str]
    frequency: str
    nextOrderDate: Optional[datetime] = None
    orders: Optional[List[Any]] = None
    autoApproveDelivery: Optional[bool] = False

# Authentication middleware
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication credentials"
        )

# Authentication Routes
@app.post("/api/auth/register")
async def register_user(user: UserCreate):
    try:
        # First check if user exists
        try:
            existing_user = auth.get_user_by_email(user.email)
            if existing_user:
                # Optionally, you could delete the existing user here
                # auth.delete_user(existing_user.uid)
                raise HTTPException(
                    status_code=400,
                    detail="Email already registered. Please use a different email or try logging in."
                )
        except auth.UserNotFoundError:
            pass  # User doesn't exist, proceed with registration
        
        # Create user in Firebase Auth
        user_record = auth.create_user(
            email=user.email,
            password=user.password,
            display_name=user.name
        )
        
        # Create user document in Firestore
        user_data = user.dict(exclude={'password'})
        user_data['createdAt'] = datetime.now()
        user_data['updatedAt'] = datetime.now()
        
        db.collection('users').document(user_record.uid).set(user_data)
        
        return {
            "message": "User registered successfully",
            "userId": user_record.uid
        }
    except auth.EmailAlreadyExistsError:
        raise HTTPException(
            status_code=400,
            detail="Email already registered. Please use a different email or try logging in."
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/auth/login")
async def login_user(email: str, password: str):
    try:
        # Get user by email
        user = auth.get_user_by_email(email)
        
        # Get user data from Firestore
        user_doc = db.collection('users').document(user.uid).get()
        if not user_doc.exists:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Create custom token for client-side authentication
        custom_token = auth.create_custom_token(user.uid)
        
        return {
            "message": "Login successful",
            "user": user_doc.to_dict(),
            "customToken": custom_token
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/auth/me")
async def get_current_user(current_user: dict = Depends(get_current_user)):
    try:
        # Get user data from Firestore
        user_doc = db.collection('users').document(current_user['uid']).get()
        if not user_doc.exists:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {"user": user_doc.to_dict()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Item Routes
@app.get("/api/items")
async def get_items(category: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    try:
        items_ref = db.collection('items')
        if category:
            items_ref = items_ref.where('category', '==', category)
        
        items = items_ref.stream()
        return {"items": [{"id": item.id, **item.to_dict()} for item in items]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/items")
async def create_item(item: Item, current_user: dict = Depends(get_current_user)):
    try:
        if current_user.get('userType') != 'provider':
            raise HTTPException(status_code=403, detail="Only providers can create items")
        
        item_data = item.dict()
        item_data['createdAt'] = datetime.now()
        item_data['updatedAt'] = datetime.now()
        
        item_ref = db.collection('items').document()
        item_ref.set(item_data)
        
        return {"message": "Item created successfully", "itemId": item_ref.id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/items/{item_id}", response_model=Item)
async def get_item(item_id: str):
    try:
        item_doc = db.collection('items').document(item_id).get()
        if not item_doc.exists:
            raise HTTPException(status_code=404, detail="Item not found")
        return {"id": item_id, **item_doc.to_dict()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.put("/api/items/{item_id}")
async def update_item(item_id: str, item: Item, current_user: dict = Depends(get_current_user)):
    try:
        item_data = item.dict()
        item_data['updatedAt'] = datetime.now()
        db.collection('items').document(item_id).update(item_data)
        return {"message": "Item updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Order Routes
@app.post("/api/orders")
async def create_order(order: Order, current_user: dict = Depends(get_current_user)):
    try:
        order_data = order.dict()
        order_data['userId'] = current_user['uid']
        order_data['createdAt'] = datetime.now()
        order_data['updatedAt'] = datetime.now()
        
        order_ref = db.collection('orders').document()
        order_ref.set(order_data)
        
        return {"message": "Order created successfully", "orderId": order_ref.id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/orders")
async def get_orders(current_user: dict = Depends(get_current_user)):
    try:
        orders = db.collection('orders')\
            .where('userId', '==', current_user['uid'])\
            .stream()
        
        return {"orders": [{"id": order.id, **order.to_dict()} for order in orders]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/orders/{order_id}", response_model=Order)
async def get_order(order_id: str):
    try:
        order_doc = db.collection('orders').document(order_id).get()
        if not order_doc.exists:
            raise HTTPException(status_code=404, detail="Order not found")
        return {"id": order_id, **order_doc.to_dict()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.put("/api/orders/{order_id}")
async def update_order(order_id: str, order: Order, current_user: dict = Depends(get_current_user)):
    try:
        order_data = order.dict()
        order_data['updatedAt'] = datetime.now()
        db.collection('orders').document(order_id).update(order_data)
        return {"message": "Order updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# List Routes
@app.post("/api/lists")
async def create_list(list_data: ShoppingList, current_user: dict = Depends(get_current_user)):
    try:
        list_data_dict = list_data.dict()
        list_data_dict['userId'] = current_user['uid']
        list_data_dict['createdAt'] = datetime.now()
        list_data_dict['updatedAt'] = datetime.now()
        
        list_ref = db.collection('lists').document()
        list_ref.set(list_data_dict)
        
        return {"message": "List created successfully", "listId": list_ref.id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/lists")
async def get_lists(current_user: dict = Depends(get_current_user)):
    try:
        lists = db.collection('lists')\
            .where('userId', '==', current_user['uid'])\
            .stream()
        
        return {"lists": [{"id": list.id, **list.to_dict()} for list in lists]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/lists/{list_id}", response_model=ShoppingList)
async def get_list(list_id: str):
    try:
        list_doc = db.collection('lists').document(list_id).get()
        if not list_doc.exists:
            raise HTTPException(status_code=404, detail="List not found")
        return {"id": list_id, **list_doc.to_dict()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.put("/api/lists/{list_id}")
async def update_list(list_id: str, list_data: ShoppingList, current_user: dict = Depends(get_current_user)):
    try:
        list_data_dict = list_data.dict()
        list_data_dict['updatedAt'] = datetime.now()
        db.collection('lists').document(list_id).update(list_data_dict)
        return {"message": "List updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# General Items Routes
@app.post("/api/general-items")
async def create_general_item(item: GeneralItem, current_user: dict = Depends(get_current_user)):
    try:
        if current_user.get('userType') != 'provider':
            raise HTTPException(status_code=403, detail="Only providers can create general items")
        item_data = item.dict()
        item_data['createdAt'] = datetime.now()
        item_data['updatedAt'] = datetime.now()
        item_ref = db.collection('general_items').document()
        item_ref.set(item_data)
        return {"message": "General item created successfully", "generalItemId": item_ref.id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/general-items")
async def get_general_items():
    try:
        items = db.collection('general_items').stream()
        return {"general_items": [{"id": item.id, **item.to_dict()} for item in items]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 