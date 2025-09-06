# Use the official Rust image as the builder
FROM rust:1.88.0 as builder

# Set the working directory
WORKDIR /usr/src/app

# Copy the Cargo.toml and Cargo.lock files first for dependency caching
COPY ./Cargo.toml ./Cargo.lock ./

# Create a dummy main.rs to build dependencies
RUN mkdir src && echo "fn main() {}" > src/main.rs

# Build dependencies (this will be cached)
RUN cargo build --release && rm -f target/release/deps/backend_rust*

# Copy the source code
COPY ./src ./src
COPY ./migrations ./migrations
COPY ./diesel.toml ./diesel.toml
COPY ./Rocket.toml ./Rocket.toml

# Build the application
#RUN cargo build --release
RUN cargo build

# Use a minimal runtime image
FROM debian:bookworm-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Create app user
RUN useradd -m -u 1001 appuser

# Set the working directory
WORKDIR /usr/src/app

# Copy the binary from the builder stage
#COPY --from=builder /usr/src/app/target/release/battlelog-backend /usr/local/bin/battlelog-backend
COPY --from=builder /usr/src/app/target/debug/battlelog-backend /usr/local/bin/battlelog-backend

# Copy configuration files
COPY --from=builder /usr/src/app/Rocket.toml ./Rocket.toml
COPY --from=builder /usr/src/app/migrations ./migrations

# Create uploads directory and set permissions
RUN mkdir -p uploads && chown -R appuser:appuser /usr/src/app

# Switch to non-root user
USER appuser

# Expose the port that Rocket will run on
EXPOSE 4000

# Run the application
CMD ["battlelog-backend"]