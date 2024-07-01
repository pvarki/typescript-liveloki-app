FROM node:20 AS build
WORKDIR /usr/src/app
COPY frontend ./
RUN npm install
RUN npm run build

# Dockerfile for Node.js server
FROM node:20

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./

RUN npm install

# Bundle app source
COPY . .
COPY --from=build /usr/src/app/dist ./public

# Expose the port the app runs on
EXPOSE 3000

# Command to run the app
CMD ["node", "index.js"]
