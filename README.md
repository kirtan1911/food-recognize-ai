# 🍽️ Food Recognize AI

An AI-powered web application that identifies food items from images and provides nutritional/food information using **Google Gemini Vision**. Built with a **FastAPI** backend and a **React** frontend, with **MongoDB** for data storage.

## ✨ Features

- 📸 Upload a food image and get instant AI-based recognition
- 🤖 Powered by Google Gemini Vision (`gemini-2.5-flash`)
- 🔐 User authentication (signup/login)
- 🕒 Prediction history saved per user
- ⚡ Fast, async backend built with FastAPI
- 🎨 Clean, responsive React frontend

## 🛠️ Tech Stack

**Frontend:** React, Tailwind CSS
**Backend:** FastAPI (Python), Uvicorn
**Database:** MongoDB (Atlas)
**AI Model:** Google Gemini Vision API
**Deployment:** Docker, Render/Railway (backend), Vercel/Netlify (frontend)

## 📂 Project Structure

```
Food-Recognize/
├── app/
│   └── backend/
│       ├── server.py
│       ├── requirements.txt
│       └── .env
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
├── Dockerfile
├── .dockerignore
├── .gitignore
└── README.md
```

## ⚙️ Setup & Installation

### 1. Clone the repository
```bash
git clone https://github.com/<your-username>/food-recognize-ai.git
cd food-recognize-ai
```

### 2. Backend Setup
```bash
cd app/backend
pip install -r requirements.txt
```

Create a `.env` file in `app/backend/` with:
```
MONGO_URI=your_mongodb_connection_string
GEMINI_API_KEY=your_gemini_api_key
JWT_SECRET=your_secret_key
```

Run the backend:
```bash
uvicorn server:app --reload
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm start
```

## 🐳 Run with Docker

```bash
docker build -t food-recognize-backend ./app/backend
docker run -p 8000:8000 --env-file ./app/backend/.env food-recognize-backend
```

## 📡 API Endpoints

| Method | Endpoint        | Description                  |
|--------|-----------------|-------------------------------|
| POST   | `/predict`      | Upload image & get food prediction |
| POST   | `/history`      | Save prediction to history    |
| GET    | `/history`      | Get user's prediction history |
| POST   | `/auth/signup`  | Register a new user           |
| POST   | `/auth/login`   | Login user                    |

## 🚀 Deployment

- **Backend:** Deployed via Docker on Render/Railway
- **Frontend:** Deployed on Vercel/Netlify
- **Database:** MongoDB Atlas (cloud)

## 👤 Author

Made with ❤️ by [Barot Kirtan]

## 📄 License

This project is licensed under the MIT License.
