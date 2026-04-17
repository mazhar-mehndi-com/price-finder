FROM node:18

# Install latest chrome dev package and fonts to support major charsets (Chinese, Japanese, Arabic, Hebrew, etc)
# Note: this also installs the necessary libs so chromium can run in headless mode
RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
# Install dependencies
RUN npm install

COPY . .

# Build the Next.js application
RUN npm run build

EXPOSE 3000

# Run the web service
CMD ["npm", "run", "start"]
