// Global state
let currentUser = null;

document.addEventListener("DOMContentLoaded", () => {
  // Check if user is already logged in
  checkAuthStatus();
  
  // Set up event listeners
  setupAuthListeners();
  setupActivityListeners();
});

// ============= AUTHENTICATION FUNCTIONS =============

async function checkAuthStatus() {
  try {
    const response = await fetch("/auth/me");
    if (response.ok) {
      const user = await response.json();
      currentUser = user;
      showMainContent(user);
    } else {
      showAuthForms();
    }
  } catch (error) {
    showAuthForms();
  }
}

function setupAuthListeners() {
  // Login form
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }

  // Sign up form
  const signupForm = document.getElementById("signup-form");
  if (signupForm) {
    signupForm.addEventListener("submit", handleSignup);
  }

  // Logout button
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", handleLogout);
  }

  // Change password button and form
  const changePasswordBtn = document.getElementById("change-password-btn");
  if (changePasswordBtn) {
    changePasswordBtn.addEventListener("click", openPasswordModal);
  }

  const changePasswordForm = document.getElementById("change-password-form");
  if (changePasswordForm) {
    changePasswordForm.addEventListener("submit", handleChangePassword);
  }
}

async function handleLogin(event) {
  event.preventDefault();

  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;
  const rememberMe = document.getElementById("remember-me").checked;
  const messageDiv = document.getElementById("auth-message");

  try {
    const response = await fetch("/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        remember_me: rememberMe,
      }),
    });

    const result = await response.json();

    if (response.ok) {
      currentUser = result.user;
      showMainContent(result.user);
    } else {
      messageDiv.textContent = result.detail || "Login failed";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
    }
  } catch (error) {
    messageDiv.textContent = "Failed to login. Please try again.";
    messageDiv.className = "error";
    messageDiv.classList.remove("hidden");
    console.error("Error logging in:", error);
  }
}

async function handleSignup(event) {
  event.preventDefault();

  const fullName = document.getElementById("signup-name").value;
  const email = document.getElementById("signup-email").value;
  const password = document.getElementById("signup-password").value;
  const messageDiv = document.getElementById("auth-message");

  try {
    const response = await fetch("/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        full_name: fullName,
      }),
    });

    const result = await response.json();

    if (response.ok) {
      messageDiv.textContent = "Account created! Please login.";
      messageDiv.className = "success";
      messageDiv.classList.remove("hidden");

      // Clear form and switch to login
      document.getElementById("signup-form").reset();
      toggleAuthForm({ preventDefault: () => {} });

      // Pre-fill email in login form
      document.getElementById("login-email").value = email;
    } else {
      messageDiv.textContent = result.detail || "Sign up failed";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
    }
  } catch (error) {
    messageDiv.textContent = "Failed to create account. Please try again.";
    messageDiv.className = "error";
    messageDiv.classList.remove("hidden");
    console.error("Error signing up:", error);
  }
}

async function handleLogout() {
  try {
    await fetch("/auth/logout", {
      method: "POST",
    });
    
    currentUser = null;
    showAuthForms();
    
    // Clear forms
    document.getElementById("login-form").reset();
    document.getElementById("signup-form").reset();
  } catch (error) {
    console.error("Error logging out:", error);
  }
}

async function handleChangePassword(event) {
  event.preventDefault();

  const oldPassword = document.getElementById("old-password").value;
  const newPassword = document.getElementById("new-password").value;
  const confirmPassword = document.getElementById("confirm-password").value;
  const messageDiv = document.getElementById("password-message");

  // Validate passwords match
  if (newPassword !== confirmPassword) {
    messageDiv.textContent = "New passwords do not match";
    messageDiv.className = "error";
    messageDiv.classList.remove("hidden");
    return;
  }

  try {
    const response = await fetch("/auth/change-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        old_password: oldPassword,
        new_password: newPassword,
      }),
    });

    const result = await response.json();

    if (response.ok) {
      messageDiv.textContent = "Password changed successfully!";
      messageDiv.className = "success";
      document.getElementById("change-password-form").reset();
      
      setTimeout(() => {
        closePasswordModal();
      }, 2000);
    } else {
      messageDiv.textContent = result.detail || "Failed to change password";
      messageDiv.className = "error";
    }

    messageDiv.classList.remove("hidden");
  } catch (error) {
    messageDiv.textContent = "Failed to change password. Please try again.";
    messageDiv.className = "error";
    messageDiv.classList.remove("hidden");
    console.error("Error changing password:", error);
  }
}

function toggleAuthForm(event) {
  event.preventDefault();
  const loginDiv = document.getElementById("login-form-div");
  const signupDiv = document.getElementById("signup-form-div");

  loginDiv.classList.toggle("hidden");
  signupDiv.classList.toggle("hidden");
  document.getElementById("auth-message").classList.add("hidden");
}

function openPasswordModal() {
  document.getElementById("password-modal").classList.remove("hidden");
}

function closePasswordModal() {
  document.getElementById("password-modal").classList.add("hidden");
  document.getElementById("password-message").classList.add("hidden");
  document.getElementById("change-password-form").reset();
}

function showAuthForms() {
  document.getElementById("auth-container").classList.remove("hidden");
  document.getElementById("main-content").classList.add("hidden");
  document.getElementById("logout-btn").classList.add("hidden");
  document.getElementById("user-name").classList.add("hidden");
}

function showMainContent(user) {
  document.getElementById("auth-container").classList.add("hidden");
  document.getElementById("main-content").classList.remove("hidden");
  document.getElementById("logout-btn").classList.remove("hidden");
  document.getElementById("user-name").classList.remove("hidden");
  document.getElementById("user-name").textContent = `Welcome, ${user.full_name}!`;

  // Load activities
  fetchActivities();
}

// ============= ACTIVITY FUNCTIONS =============

function setupActivityListeners() {
  const signupActivityForm = document.getElementById("signup-activity-form");
  if (signupActivityForm) {
    signupActivityForm.addEventListener("submit", handleActivitySignup);
  }
}

async function fetchActivities() {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");

  try {
    const response = await fetch("/activities");
    const activities = await response.json();

    // Clear loading message and existing options
    activitiesList.innerHTML = "";
    activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

    // Populate activities list
    Object.entries(activities).forEach(([name, details]) => {
      const activityCard = document.createElement("div");
      activityCard.className = "activity-card";

      const spotsLeft = details.max_participants - details.participants.length;
      const isFullClass = spotsLeft === 0;

      // Create participants HTML with delete icons instead of bullet points
      const participantsHTML =
        details.participants.length > 0
          ? `<div class="participants-section">
            <h5>Participants (${details.participants.length}/${details.max_participants}):</h5>
            <ul class="participants-list">
              ${details.participants
                .map(
                  (email) =>
                    `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`
                )
                .join("")}
            </ul>
          </div>`
          : `<p><em>No participants yet</em></p>`;

      activityCard.innerHTML = `
        <h4>${name}</h4>
        <p>${details.description}</p>
        <p><strong>Schedule:</strong> ${details.schedule}</p>
        <p><strong>Availability:</strong> ${spotsLeft} spots left ${isFullClass ? '(FULL)' : ''}</p>
        <div class="participants-container">
          ${participantsHTML}
        </div>
      `;

      activitiesList.appendChild(activityCard);

      // Add option to select dropdown (only if spots available)
      const option = document.createElement("option");
      option.value = name;
      option.textContent = `${name} (${spotsLeft} spots)`;
      if (isFullClass) {
        option.disabled = true;
      }
      activitySelect.appendChild(option);
    });

    // Add event listeners to delete buttons
    document.querySelectorAll(".delete-btn").forEach((button) => {
      button.addEventListener("click", handleUnregister);
    });
  } catch (error) {
    activitiesList.innerHTML =
      "<p>Failed to load activities. Please try again later.</p>";
    console.error("Error fetching activities:", error);
  }
}

async function handleActivitySignup(event) {
  event.preventDefault();

  const activity = document.getElementById("activity").value;
  const messageDiv = document.getElementById("message");

  if (!activity) {
    messageDiv.textContent = "Please select an activity";
    messageDiv.className = "error";
    messageDiv.classList.remove("hidden");
    return;
  }

  try {
    const response = await fetch(
      `/activities/${encodeURIComponent(activity)}/signup`,
      {
        method: "POST",
      }
    );

    const result = await response.json();

    if (response.ok) {
      messageDiv.textContent = result.message;
      messageDiv.className = "success";
      document.getElementById("signup-activity-form").reset();

      // Refresh activities list to show updated participants
      fetchActivities();
    } else {
      messageDiv.textContent = result.detail || "An error occurred";
      messageDiv.className = "error";
    }

    messageDiv.classList.remove("hidden");

    // Hide message after 5 seconds
    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  } catch (error) {
    messageDiv.textContent = "Failed to sign up. Please try again.";
    messageDiv.className = "error";
    messageDiv.classList.remove("hidden");
    console.error("Error signing up:", error);
  }
}

async function handleUnregister(event) {
  event.preventDefault();
  const button = event.target;
  const activity = button.getAttribute("data-activity");
  const messageDiv = document.getElementById("message");

  try {
    const response = await fetch(
      `/activities/${encodeURIComponent(activity)}/unregister`,
      {
        method: "DELETE",
      }
    );

    const result = await response.json();

    if (response.ok) {
      messageDiv.textContent = result.message;
      messageDiv.className = "success";

      // Refresh activities list to show updated participants
      fetchActivities();
    } else {
      messageDiv.textContent = result.detail || "An error occurred";
      messageDiv.className = "error";
    }

    messageDiv.classList.remove("hidden");

    // Hide message after 5 seconds
    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  } catch (error) {
    messageDiv.textContent = "Failed to unregister. Please try again.";
    messageDiv.className = "error";
    messageDiv.classList.remove("hidden");
    console.error("Error unregistering:", error);
  }
}

