FROM node:20-slim

# Install LilyPond and required fonts
RUN apt-get update && \
    apt-get install -y lilypond fonts-freefont-ttf && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY server.js ./

EXPOSE 3001

CMD ["node", "server.js"]
