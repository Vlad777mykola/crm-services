# syntax=docker/dockerfile:1
#
# Gateway - static nginx config, no build step needed. Build context is this
# folder only. Build with:
#   docker build -f services/gateway/Dockerfile -t crm-gateway services/gateway

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
