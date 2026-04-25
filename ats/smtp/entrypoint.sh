#!/bin/bash
set -e

# 1. Generate Dovecot SQL config
cat <<EOF > /etc/dovecot/dovecot-sql.conf.ext
driver = pgsql
connect = host=$DB_HOST port=$DB_PORT dbname=$DB_NAME user=$DB_USER password=$DB_PASSWORD
default_pass_scheme = BLF-CRYPT
password_query = SELECT email AS user, \\
  CASE \\
    WHEN encrypted_password LIKE 'bcrypt_sha256$%%' \\
    THEN '{BLF-CRYPT}' || REPLACE(encrypted_password, 'bcrypt_sha256$', '') \\
    WHEN encrypted_password LIKE 'bcrypt$%%' \\
    THEN '{BLF-CRYPT}' || REPLACE(encrypted_password, 'bcrypt$', '') \\
    ELSE encrypted_password \\
  END AS password \\
  FROM auth.users WHERE email = '%u'
user_query = SELECT email AS user, 5000 AS uid, 5000 AS gid, '/var/mail/virtual/%d/%n' AS home FROM auth.users WHERE email = '%u'
EOF

# 2. Generate Postfix SQL config
cat <<EOF > /etc/postfix/pgsql-mailboxes.cf
hosts = $DB_HOST
dbname = $DB_NAME
user = $DB_USER
password = $DB_PASSWORD
query = SELECT email FROM auth.users WHERE email='%s'
EOF

# Generate Nginx config from template
envsubst '${WEBMAIL_PORT}' < /etc/nginx/nginx.conf.template > /etc/nginx/sites-available/default

# Configure Dovecot to use SQL instead of PAM/System
# 1. Enable SQL auth and disable system auth
sed -i 's/^!include auth-system.conf.ext/#!include auth-system.conf.ext/' /etc/dovecot/conf.d/10-auth.conf
sed -i 's/^#!include auth-sql.conf.ext/!include auth-sql.conf.ext/' /etc/dovecot/conf.d/10-auth.conf

# 2. Set auth mechanisms
sed -i 's/auth_mechanisms = plain/auth_mechanisms = plain login/' /etc/dovecot/conf.d/10-auth.conf
echo "auth_debug = no" >> /etc/dovecot/conf.d/10-auth.conf
echo "auth_debug_passwords = no" >> /etc/dovecot/conf.d/10-auth.conf
echo "disable_plaintext_auth = no" >> /etc/dovecot/conf.d/10-auth.conf
echo "auth_verbose = no" >> /etc/dovecot/conf.d/10-auth.conf

# 3. Force logs to stdout/stderr for Docker
cat <<EOF > /etc/dovecot/conf.d/10-logging.conf
log_path = /dev/stdout
info_log_path = /dev/stdout
debug_log_path = /dev/stdout
EOF

# 4. Ensure Dovecot knows where the SQL config is (Ubuntu default path)
cat <<EOF > /etc/dovecot/conf.d/auth-sql.conf.ext
passdb {
  driver = sql
  args = /etc/dovecot/dovecot-sql.conf.ext
}
userdb {
  driver = sql
  args = /etc/dovecot/dovecot-sql.conf.ext
}
EOF

# Fix permissions for sensitive files
chown root:root /etc/dovecot/dovecot-sql.conf.ext
chmod 600 /etc/dovecot/dovecot-sql.conf.ext
chown root:postfix /etc/postfix/pgsql-mailboxes.cf
chmod 640 /etc/postfix/pgsql-mailboxes.cf

# Configure Postfix
if [ -n "$SMTP_DOMAIN" ]; then
    postconf -e "myhostname = mail.$SMTP_DOMAIN"
    postconf -e "mydomain = $SMTP_DOMAIN"
    postconf -e "myorigin = $SMTP_DOMAIN"
    # Do not accept local delivery for the domain, it's virtual
    postconf -e "mydestination = localhost"
    
    # Virtual Mailbox Configuration
    postconf -e "virtual_mailbox_domains = $SMTP_DOMAIN"
    postconf -e "virtual_mailbox_base = /var/mail/virtual"
    postconf -e "virtual_mailbox_maps = proxy:pgsql:/etc/postfix/pgsql-mailboxes.cf"
    postconf -e "virtual_minimum_uid = 5000"
    postconf -e "virtual_uid_maps = static:5000"
    postconf -e "virtual_gid_maps = static:5000"
    
    # SASL Authentication via Dovecot
    postconf -e "smtpd_sasl_type = dovecot"
    postconf -e "smtpd_sasl_path = private/auth"
    postconf -e "smtpd_sasl_auth_enable = yes"
    postconf -e "smtpd_recipient_restrictions = permit_mynetworks, permit_sasl_authenticated, reject_unauth_destination"
fi

# Create virtual mail user and group
groupadd -g 5000 vmail || true
useradd -g vmail -u 5000 vmail -d /var/mail/virtual -m || true
mkdir -p /var/mail/virtual
chown -R vmail:vmail /var/mail/virtual
chmod -R 770 /var/mail/virtual

# Setup auth socket for Postfix SASL
cat <<EOF > /etc/dovecot/conf.d/10-master-postfix.conf
service auth {
  unix_listener /var/spool/postfix/private/auth {
    mode = 0660
    user = postfix
    group = postfix
  }
}
EOF

# Ensure mail_location uses Maildir
sed -i 's/mail_location = mbox:~\/mail:INBOX=\/var\/mail\/%u/mail_location = maildir:~\/Maildir/' /etc/dovecot/conf.d/10-mail.conf

# Set up PHP-FPM socket directory
mkdir -p /run/php
chown www-data:www-data /run/php

# Final check of permissions for Roundcube logs/temp
chown -R www-data:www-data /var/www/html/webmail/logs /var/www/html/webmail/temp
chmod -R 775 /var/www/html/webmail/logs /var/www/html/webmail/temp

# Start Supervisor
exec /usr/bin/supervisord -n -c /etc/supervisor/conf.d/supervisord.conf
