# Development image: installs dependencies and runs the Vite dev server.
# docker-compose bind-mounts the source over this for hot-reload during
# local development -- this project is local-first and doesn't ship a
# production Nginx build (see README "Known Limitations").
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
