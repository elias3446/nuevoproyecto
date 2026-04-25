FROM ubuntu:22.04

# Non-interactive installation
ENV DEBIAN_FRONTEND=noninteractive

# Install required packages
RUN apt-get update && apt-get install -y \
    postfix \
    postfix-pgsql \
    dovecot-core \
    dovecot-imapd \
    dovecot-pgsql \
    nginx \
    php-fpm \
    php-mbstring \
    php-xml \
    php-mysql \
    php-intl \
    php-zip \
    php-curl \
    sqlite3 \
    php-sqlite3 \
    supervisor \
    wget \
    curl \
    unzip \
    gettext-base \
    && rm -rf /var/lib/apt/lists/*

# Download and install Roundcube
RUN mkdir -p /var/www/html/webmail
WORKDIR /var/www/html/webmail
RUN wget https://github.com/roundcube/roundcubemail/releases/download/1.6.5/roundcubemail-1.6.5-complete.tar.gz && \
    tar -xzf roundcubemail-1.6.5-complete.tar.gz && \
    mv roundcubemail-1.6.5/* . && \
    mv roundcubemail-1.6.5/.htaccess . || true && \
    rm -rf roundcubemail-1.6.5 roundcubemail-1.6.5-complete.tar.gz && \
    chown -R www-data:www-data /var/www/html && \
    chmod -R 755 /var/www/html

# Initialize Roundcube SQLite database
RUN mkdir -p /var/www/html/webmail/db && \
    sqlite3 /var/www/html/webmail/db/sqlite.db < /var/www/html/webmail/SQL/sqlite.initial.sql && \
    chown -R www-data:www-data /var/www/html/webmail/db

# Copy configurations
COPY roundcube_config.inc.php /var/www/html/webmail/config/config.inc.php
COPY nginx.conf.template /etc/nginx/nginx.conf.template
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY dovecot-sql.conf.ext /etc/dovecot/dovecot-sql.conf.ext
COPY postfix-pgsql-mailboxes.cf /etc/postfix/pgsql-mailboxes.cf
COPY entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh && \
    chown www-data:www-data /var/www/html/webmail/config/config.inc.php

# Expose ports: 25 (SMTP), 143 (IMAP), 80 (Webmail internal)
EXPOSE 25 143 80

CMD ["/entrypoint.sh"]
