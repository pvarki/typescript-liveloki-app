FROM node:22-slim AS build
WORKDIR /usr/src/app
COPY frontend ./
RUN npm install
RUN npm run build

# Dockerfile for Node.js server
FROM node:22-slim AS production
COPY --from=ghcr.io/pvarki/kraftwerk-helper-tool:1.4.1-261027 /kw_product_init /kw_product_init
RUN apt-get update && apt-get install -y \
        curl \
    && rm -rf /var/lib/apt/lists/* \
    && true


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

COPY ./entrypoint.sh /entrypoint.sh
COPY ./container-init.sh /container-init.sh
RUN chmod +x /entrypoint.sh /container-init.sh

ENTRYPOINT ["/entrypoint.sh"]

# Command to run the app
##CMD ["node", "index.js"]
