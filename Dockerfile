# Base on offical Node.js Alpine image
FROM registry.docker.hub.com/node:alpine:16.19

# Set working directory
WORKDIR /usr/app

# Copy package.json and package-lock.json before other files
# Utilise Docker cache to save re-installing dependencies if unchanged
COPY ./package*.json .

# Install dependencies
RUN npm i -g pnpm && pnpm install --prod

# # Copy all files
# COPY ./ ./

# # Build app
# RUN pnpm run build

# # Expose the listening port
# EXPOSE 3000

# # Run container as non-root (unprivileged) user
# # The node user is provided in the Node.js Alpine base image
# USER node

# # Run npm start script when container starts
# CMD [ "npm", "start" ]
