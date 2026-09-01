<?php
require_once __DIR__ . '/../vendor/autoload.php';
$env = Dotenv\Dotenv::createMutable(__DIR__ . '/../');
$env->load();
require_once __DIR__ . '/../libs/Mailer.php';
$recipient = $argv[1] ?? ($_ENV['ADMIN_EMAIL'] ?? null);
if (!$recipient) {
    echo "Usage: php scripts/test_mail.php recipient@example.com\nOr set ADMIN_EMAIL in .env\n";
    exit(1);
}
try {
    $mailer = new Mailer();
    $result = $mailer->sendPasswordResetEmail($recipient, 'Mail Test', 'https://example.com/');
    echo $result ? "Mail sent successfully to {$recipient}\n" : "Mail failed. Check logs or enable MAIL_DEBUG=2 in .env\n";
} catch (Exception $e) {
    echo "Mailer exception: " . $e->getMessage() . "\n";
}
