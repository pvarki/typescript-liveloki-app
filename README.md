# livelogi

## Install

1. Install docker + compose
2. Rename .env_example --> .env and modify as you like.
3. run docker compose build --no-cache
3. run docker compose up -d
4. Navigate to localhost:3000

## Frontend development

The frontend is bundled with [Vite](https://vitejs.dev/).

Once the backend is running (on port 3000), you can navigate to `frontend/`,
run `npm i` and `npm run dev` to run the Vite development server that has
hot reload and all that jazz.

## Info

Database is currently preseeded with test data from preseed/preseed.csv
