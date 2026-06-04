"""
High School Management System API

A super simple FastAPI application that allows students to view and sign up
for extracurricular activities at Mergington High School.
"""

from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from starlette.middleware.sessions import SessionMiddleware
from werkzeug.security import generate_password_hash, check_password_hash
from pydantic import BaseModel
import os
from pathlib import Path
from datetime import datetime, timedelta

app = FastAPI(title="Mergington High School API",
              description="API for viewing and signing up for extracurricular activities")

# Add session middleware (secret key for signing session cookies)
app.add_middleware(SessionMiddleware, secret_key="your-secret-key-change-this-in-production")

# In-memory user database
users = {}

# Pydantic models
class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str

class LoginRequest(BaseModel):
    email: str
    password: str
    remember_me: bool = False

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

class UserResponse(BaseModel):
    email: str
    full_name: str

# Mount the static files directory
current_dir = Path(__file__).parent
app.mount("/static", StaticFiles(directory=os.path.join(Path(__file__).parent,
          "static")), name="static")

# In-memory activity database
activities = {
    "Chess Club": {
        "description": "Learn strategies and compete in chess tournaments",
        "schedule": "Fridays, 3:30 PM - 5:00 PM",
        "max_participants": 12,
        "participants": ["michael@mergington.edu", "daniel@mergington.edu"]
    },
    "Programming Class": {
        "description": "Learn programming fundamentals and build software projects",
        "schedule": "Tuesdays and Thursdays, 3:30 PM - 4:30 PM",
        "max_participants": 20,
        "participants": ["emma@mergington.edu", "sophia@mergington.edu"]
    },
    "Gym Class": {
        "description": "Physical education and sports activities",
        "schedule": "Mondays, Wednesdays, Fridays, 2:00 PM - 3:00 PM",
        "max_participants": 30,
        "participants": ["john@mergington.edu", "olivia@mergington.edu"]
    },
    "Soccer Team": {
        "description": "Join the school soccer team and compete in matches",
        "schedule": "Tuesdays and Thursdays, 4:00 PM - 5:30 PM",
        "max_participants": 22,
        "participants": ["liam@mergington.edu", "noah@mergington.edu"]
    },
    "Basketball Team": {
        "description": "Practice and play basketball with the school team",
        "schedule": "Wednesdays and Fridays, 3:30 PM - 5:00 PM",
        "max_participants": 15,
        "participants": ["ava@mergington.edu", "mia@mergington.edu"]
    },
    "Art Club": {
        "description": "Explore your creativity through painting and drawing",
        "schedule": "Thursdays, 3:30 PM - 5:00 PM",
        "max_participants": 15,
        "participants": ["amelia@mergington.edu", "harper@mergington.edu"]
    },
    "Drama Club": {
        "description": "Act, direct, and produce plays and performances",
        "schedule": "Mondays and Wednesdays, 4:00 PM - 5:30 PM",
        "max_participants": 20,
        "participants": ["ella@mergington.edu", "scarlett@mergington.edu"]
    },
    "Math Club": {
        "description": "Solve challenging problems and participate in math competitions",
        "schedule": "Tuesdays, 3:30 PM - 4:30 PM",
        "max_participants": 10,
        "participants": ["james@mergington.edu", "benjamin@mergington.edu"]
    },
    "Debate Team": {
        "description": "Develop public speaking and argumentation skills",
        "schedule": "Fridays, 4:00 PM - 5:30 PM",
        "max_participants": 12,
        "participants": ["charlotte@mergington.edu", "henry@mergington.edu"]
    }
}


def get_current_user(request: Request):
    """Get current authenticated user from session"""
    email = request.session.get("user_email")
    if not email:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return email


@app.get("/")
def root():
    return RedirectResponse(url="/static/index.html")


# ============= AUTHENTICATION ENDPOINTS =============

@app.post("/auth/register")
def register(req: RegisterRequest):
    """Register a new user account"""
    # Validate email format
    if "@" not in req.email or "." not in req.email:
        raise HTTPException(status_code=400, detail="Invalid email format")
    
    # Check if user already exists
    if req.email in users:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Validate password
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    # Store user with hashed password
    users[req.email] = {
        "password_hash": generate_password_hash(req.password),
        "full_name": req.full_name,
        "registered_at": datetime.now().isoformat()
    }
    
    return {"message": f"Account created successfully for {req.email}"}


@app.post("/auth/login")
def login(req: LoginRequest, request: Request):
    """Authenticate user and create session"""
    # Check if user exists
    if req.email not in users:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    user = users[req.email]
    
    # Verify password
    if not check_password_hash(user["password_hash"], req.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Create session
    request.session["user_email"] = req.email
    request.session["user_name"] = user["full_name"]
    
    # Set cookie expiry: 30 days if remember_me, else browser session
    if req.remember_me:
        request.session["expiry"] = (datetime.now() + timedelta(days=30)).isoformat()
    
    return {
        "message": "Logged in successfully",
        "user": {
            "email": req.email,
            "full_name": user["full_name"]
        }
    }


@app.post("/auth/logout")
def logout(request: Request):
    """Clear session and log out user"""
    request.session.clear()
    return {"message": "Logged out successfully"}


@app.get("/auth/me")
def get_user(email: str = Depends(get_current_user)):
    """Get current user information"""
    user = users[email]
    return {
        "email": email,
        "full_name": user["full_name"]
    }


@app.post("/auth/change-password")
def change_password(req: ChangePasswordRequest, email: str = Depends(get_current_user)):
    """Change user password"""
    user = users[email]
    
    # Verify old password
    if not check_password_hash(user["password_hash"], req.old_password):
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    
    # Validate new password
    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    
    # Update password
    user["password_hash"] = generate_password_hash(req.new_password)
    
    return {"message": "Password changed successfully"}


# ============= ACTIVITY ENDPOINTS =============


@app.get("/activities")
def get_activities():
    return activities


@app.post("/activities/{activity_name}/signup")
def signup_for_activity(activity_name: str, email: str = Depends(get_current_user)):
    """Sign up a student for an activity"""
    # Validate activity exists
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Get the specific activity
    activity = activities[activity_name]

    # Validate student is not already signed up
    if email in activity["participants"]:
        raise HTTPException(
            status_code=400,
            detail="Student is already signed up"
        )

    # Check max participants
    if len(activity["participants"]) >= activity["max_participants"]:
        raise HTTPException(
            status_code=400,
            detail="Activity is at maximum capacity"
        )

    # Add student
    activity["participants"].append(email)
    return {"message": f"Signed up {email} for {activity_name}"}


@app.delete("/activities/{activity_name}/unregister")
def unregister_from_activity(activity_name: str, email: str = Depends(get_current_user)):
    """Unregister a student from an activity"""
    # Validate activity exists
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Get the specific activity
    activity = activities[activity_name]

    # Validate student is signed up
    if email not in activity["participants"]:
        raise HTTPException(
            status_code=400,
            detail="Student is not signed up for this activity"
        )

    # Remove student
    activity["participants"].remove(email)
    return {"message": f"Unregistered {email} from {activity_name}"}
