# Smart Phonebook

Smart Phonebook is a full-stack contact management web application that helps users efficiently store, manage, search, and organize contacts with a modern UI, offline support, and real-time features.

---

## Features

-  Add new contacts
-  Edit existing contacts
-  Delete contacts
-  Real-time search functionality
-  Mark favorite contacts (star system)
-  Filter contacts by tags
-  Dark / Light mode toggle
-  Export contacts as CSV
-  Import contacts from backup file
-  Offline support using localStorage fallback
-  Fully responsive UI design
-  Toast notifications for user actions

---

##  Tech Stack

- **Frontend:** HTML, CSS, JavaScript  
- **Backend:** Node.js, Express.js  
- **Database:** PostgreSQL  

---

##  Installation & Setup

### 1. Clone the repository
```bash
git clone https://github.com/your-username/smart-phonebook.git
cd smart-phonebook

### 2. Install backend dependencies

cd server
npm install

### 3.frontend folder
client
backend folder
server

---

### 4. Setup environment variables

Create a `.env` file in backend folder:

PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=phonebook

---

### 5. Run backend server

node server.js

---

### 6. Run frontend

Open index.html in browser OR use Live Server in VS Code


##  API Endpoints

- GET /contacts → Get all contacts
- POST /contacts → Add contact
- DELETE /contacts/:id → Delete contact
- GET /search?q= → Search contacts

# Author
Arfajhan c Kunnur
