<?php
$config = array();

// Database connection string (DSN) for read+write operations
$config['db_dsnw'] = 'sqlite:////var/www/html/webmail/db/sqlite.db';

// SMTP server configuration
$config['smtp_server'] = '127.0.0.1';
$config['smtp_port']   = 25;
$config['smtp_host'] = '127.0.0.1:25';
$config['smtp_user']   = '%u';
$config['smtp_pass']   = '%p';
$config['smtp_auth_type'] = 'LOGIN';

// SMTP connection options (disable SSL check for internal traffic)
$config['smtp_conn_options'] = array(
    'ssl' => array(
        'verify_peer'      => false,
        'verify_peer_name' => false,
        'allow_self_signed' => true,
    ),
);

// IMAP server configuration — values come from .env via Docker
$config['default_host'] = getenv('IMAP_HOST') ?: 'localhost';
$config['default_port'] = (int) getenv('IMAP_PORT') ?: 143;

// Base path — Auto-detected correctly since container path matches URL path
$config['product_url'] = (getenv('WEBMAIL_ROUTE') ?: '/webmail') . '/';

// Display settings
$config['support_url'] = '';
$config['des_key']     = 'random_string_replace_me';

// Domain setting — helps logging in with just 'user' instead of 'user@domain.com'
$config['username_domain'] = getenv('LOCAL_MAIL_DOMAIN') ?: 'localhost';

// Security and Proxy settings
$config['use_https'] = true;
$config['proxy_whitelist'] = array('127.0.0.1', '172.18.0.0/16', '192.168.0.0/16');
$config['ip_check'] = false; // Disable IP check for sessions (useful behind proxy)
$config['des_key'] = 'rcmail-!24ee@Sfc.L'; // Better random key

$config['plugins']     = array('archive', 'zipdownload');


// Mail domain — comes from .env via Docker
$config['mail_domain'] = getenv('LOCAL_MAIL_DOMAIN') ?: '';

$config['smtp_log'] = true;
$config['log_dir']  = '/var/www/html/webmail/logs/';
$config['temp_dir'] = '/var/www/html/webmail/temp/';

