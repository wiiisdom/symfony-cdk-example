FROM nginx:alpine

COPY . /app
COPY docker/nginx/default.conf /nginx.conf.template

CMD ["/bin/sh" , "-c" , "envsubst '$PHP_HOST' < /nginx.conf.template > /etc/nginx/conf.d/default.conf && exec nginx -g 'daemon off;'"]
EXPOSE 80