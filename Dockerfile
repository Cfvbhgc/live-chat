# We use the official Node 20 Alpine image because it is small (~130 MB)
# and ships with everything we need to run a plain JS project.
FROM node:20-alpine

# Create an app directory inside the container so our files are not dumped
# straight into the root filesystem.
WORKDIR /app

# Copy only the package files first. Docker caches each layer independently,
# so if package.json has not changed the `npm ci` layer is reused even when
# source code changes. This dramatically speeds up rebuilds during development.
COPY package.json package-lock.json* ./

# Install production dependencies only -- we do not need nodemon or any other
# dev tooling inside the production image.
RUN npm ci --omit=dev

# Now copy the rest of the source code into the container.
COPY . .

# The application listens on port 3000 by default. Exposing it here is
# mostly documentation; the actual port mapping happens in docker-compose.yml.
EXPOSE 3000

# Start the server. We use `node` directly rather than `npm start` so that
# the process receives OS signals (SIGTERM, etc.) properly and can shut down
# gracefully when the container is stopped.
CMD ["node", "src/index.js"]
