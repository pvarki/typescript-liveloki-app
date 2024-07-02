FROM node:22-slim AS build
WORKDIR /usr/src/app
COPY frontend ./
RUN npm install
RUN npm run build

# Dockerfile for Node.js server
FROM node:22-slim

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY backend/package*.json ./

RUN npm install

# Bundle app source
COPY backend/. .
COPY --from=build /usr/src/app/dist ./public

# Expose the port the app runs on
EXPOSE 3000

COPY ./entrypoint.sh /
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]

# Command to run the app
##CMD ["node", "index.js"]
