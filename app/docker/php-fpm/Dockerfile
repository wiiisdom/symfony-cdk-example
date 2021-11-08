FROM php:8-fpm

COPY . /app/

RUN apt-get update && \
    apt-get install -y --no-install-recommends git unzip libzip-dev && \
    docker-php-ext-install mysqli pdo pdo_mysql zip && \
    apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

WORKDIR /app

CMD composer i -o ; php bin/console doctrine:schema:update --complete --force ; php-fpm 

EXPOSE 9000