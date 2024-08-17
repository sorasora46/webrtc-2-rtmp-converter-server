# Use the official Node.js image as the base image
FROM node:18

# Set the working directory in the container
WORKDIR /app

# Copy the package.json and package-lock.json to the container
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Install FFmpeg in the container
RUN apt-get update && apt-get install -y ffmpeg

# Copy the rest of the application code to the container
COPY . .

# Expose the port that the app will run on (9882 in this case)
EXPOSE 9882

# Set environment variables
ENV HOST=0.0.0.0
ENV PORT=9882

# Run the application
CMD ["npm", "start"]
