FROM node:8

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
COPY Gruntfile.js ./
COPY bower.json ./

RUN npm install
RUN npm install -g grunt-cli

# Bundle app source
COPY . .

RUN grunt release

EXPOSE 8080

# Command executed when starting container
CMD [ "grunt", "server"]