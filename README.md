# Live Chat

A real-time chat application powered by **Socket.io**, **Express**, and **MongoDB**. Users can create chat rooms, send messages that are persisted to a database, and see who is currently online -- all through a combination of WebSocket events and a REST API.

## Features

- Real-time messaging via Socket.io (WebSocket with automatic fallback)
- Chat room creation and management through a REST API
- Persistent message history stored in MongoDB via Mongoose
- Online / offline presence tracking per user
- Typing indicators broadcast to other participants in a room
- Dockerized setup for one-command deployment

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20 |
| HTTP framework | Express 4 |
| Real-time transport | Socket.io 4 |
| Database | MongoDB 7 |
| ODM | Mongoose 8 |
| Containerization | Docker + Docker Compose |

## Getting Started

### Prerequisites

- **Node.js** >= 18 (20 recommended)
- **MongoDB** running locally, or Docker installed

### Local Development

```bash
# 1. Clone and enter the project
cd live-chat

# 2. Install dependencies
npm install

# 3. Create an env file from the example and edit as needed
cp .env.example .env

# 4. Start in development mode (auto-restarts on file changes)
npm run dev
```

The server will start on `http://localhost:3000`.

### Docker

```bash
# Build and start both the app and MongoDB in one go
docker compose up --build

# To run in the background
docker compose up --build -d

# Tear everything down (keeps the database volume)
docker compose down
```

## REST API

All endpoints are prefixed with `/api`.

### Rooms

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/rooms` | List all chat rooms |
| `POST` | `/api/rooms` | Create a new room |
| `GET` | `/api/rooms/:id` | Get a single room by ID |
| `GET` | `/api/rooms/:id/messages` | Fetch message history for a room |

#### Create a room

```bash
curl -X POST http://localhost:3000/api/rooms \
  -H "Content-Type: application/json" \
  -d '{"name": "general", "description": "General discussion"}'
```

#### Get messages for a room

```bash
# Returns the last 50 messages by default.
# Use ?limit=100&offset=0 to paginate.
curl http://localhost:3000/api/rooms/<room_id>/messages?limit=20&offset=0
```

### Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/users` | List all registered users |
| `POST` | `/api/users` | Register a new user |
| `PATCH` | `/api/users/:id/status` | Update a user's online/offline status |

#### Register a user

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"username": "ilya"}'
```

#### Update user status

```bash
curl -X PATCH http://localhost:3000/api/users/<user_id>/status \
  -H "Content-Type: application/json" \
  -d '{"status": "offline"}'
```

## Socket.io Events

Connect to `http://localhost:3000` with any Socket.io client.

### Client -> Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join-room` | `{ roomId, userId }` | Join a chat room |
| `leave-room` | `{ roomId, userId }` | Leave a chat room |
| `send-message` | `{ roomId, userId, content }` | Send a message to a room |
| `typing` | `{ roomId, userId }` | Broadcast a typing indicator |
| `user-online` | `{ userId }` | Mark the user as online |
| `user-offline` | `{ userId }` | Mark the user as offline |

### Server -> Client

| Event | Payload | Description |
|-------|---------|-------------|
| `new-message` | Message document | A new message was sent to the room |
| `user-joined` | `{ userId, roomId }` | Someone joined the room |
| `user-left` | `{ userId, roomId }` | Someone left the room |
| `user-typing` | `{ userId, roomId }` | Someone is typing in the room |
| `status-change` | `{ userId, status }` | A user's online status changed |

## Project Structure

```
live-chat/
├── src/
│   ├── index.js              # Application entry point
│   ├── config/
│   │   └── db.js             # Mongoose connection setup
│   ├── models/
│   │   ├── User.js           # User schema and model
│   │   ├── Room.js           # Room schema and model
│   │   └── Message.js        # Message schema and model
│   ├── routes/
│   │   ├── rooms.js          # REST endpoints for rooms
│   │   └── users.js          # REST endpoints for users
│   ├── socket/
│   │   └── handler.js        # Socket.io event handlers
│   └── middleware/
│       └── errorHandler.js   # Central Express error handler
├── package.json
├── docker-compose.yml
├── Dockerfile
├── .env.example
└── README.md
```

## License

ISC
