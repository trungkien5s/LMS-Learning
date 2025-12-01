# Dockerfile

FROM node:18-alpine

# Tạo thư mục app
WORKDIR /app

# Copy package để cài đặt trước (cache layer)
COPY package*.json ./

# Cài dependencies
RUN npm install

# Copy toàn bộ mã nguồn
COPY . .

# Build mã nguồn TypeScript
RUN npm run build

# Mở port 8000
EXPOSE 8000

# Chạy ứng dụng
CMD ["npm", "run", "start:prod"]
