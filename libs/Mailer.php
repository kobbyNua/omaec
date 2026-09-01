<?php

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require_once __DIR__ . '/../vendor/autoload.php';

class Mailer
{
    private $mail;
    private $config;

    public function __construct()
    {
        require_once __DIR__ . '/cred.php';
        $this->config = info();
        $this->mail = new PHPMailer(true);
        $this->setupMailer();
    }

    private function setupMailer()
    {
        try {
            // Server settings
            $this->mail->SMTPDebug = isset($_ENV['MAIL_DEBUG']) ? (int) $_ENV['MAIL_DEBUG'] : 0;
            $this->mail->isSMTP();
            $this->mail->Host = $_ENV['MAIL_HOST'] ?? 'smtp.gmail.com';
            $this->mail->SMTPAuth = true;
            $this->mail->Username = $_ENV['MAIL_USERNAME'] ?? '';
            $this->mail->Password = $_ENV['MAIL_PASSWORD'] ?? '';

            if (empty($this->mail->Username) || empty($this->mail->Password)) {
                throw new Exception('Mailer username or password not configured');
            }

            // Map encryption string to PHPMailer constants
            $enc = strtolower(trim($_ENV['MAIL_ENCRYPTION'] ?? 'tls'));
            if ($enc === 'ssl' || $enc === 'smtps') {
                $this->mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
            } else {
                $this->mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            }

            $this->mail->Port = isset($_ENV['MAIL_PORT']) ? (int) $_ENV['MAIL_PORT'] : ($this->mail->SMTPSecure === PHPMailer::ENCRYPTION_SMTPS ? 465 : 587);

            // Optional: allow self-signed certs for debugging
            if (!empty($_ENV['MAIL_ALLOW_SELF_SIGNED']) && in_array(strtolower($_ENV['MAIL_ALLOW_SELF_SIGNED']), ['1', 'true', 'yes'], true)) {
                $this->mail->SMTPOptions = [
                    'ssl' => [
                        'verify_peer' => false,
                        'verify_peer_name' => false,
                        'allow_self_signed' => true,
                    ],
                ];
            }

            // Set from address (fallback to username)
            $this->mail->setFrom($_ENV['MAIL_FROM_ADDRESS'] ?? $this->mail->Username, $_ENV['MAIL_FROM_NAME'] ?? 'Media App');
        } catch (Exception $e) {
            error_log('Mailer setup failed: ' . $e->getMessage());
            throw new Exception('Mailer configuration error');
        }
    }

    public function sendWelcomeEmail($email, $userName, $resetLink)
    {
        try {
            $this->mail->clearAddresses();
            $this->mail->addAddress($email, $userName);

            $this->mail->isHTML(true);
            $this->mail->Subject = 'Welcome to Media App - Set Your Password';

            $htmlBody = $this->getWelcomeEmailTemplate($userName, $resetLink);
            $this->mail->Body = $htmlBody;
            $this->mail->AltBody = "Welcome to Media App!\n\nPlease click the link below to set your password:\n{$resetLink}";

            $this->mail->send();
            return true;
        } catch (Exception $e) {
            error_log('Welcome email failed: ' . $e->getMessage());
            return false;
        }
    }

    private function getWelcomeEmailTemplate($userName, $resetLink)
    {
        return "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='UTF-8'>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #007bff; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
                .button { display: inline-block; padding: 12px 30px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .footer { margin-top: 20px; font-size: 12px; color: #666; text-align: center; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>Welcome to Media App!</h1>
                </div>
                <div class='content'>
                    <p>Hi {$userName},</p>
                    <p>Thank you for joining Media App. To complete your registration and set your password, please click the button below:</p>
                    <a href='{$resetLink}' class='button'>Set Your Password</a>
                    <p>Or copy and paste this link in your browser:</p>
                    <p style='word-break: break-all;'><code>{$resetLink}</code></p>
                    <p>This link will expire in 24 hours.</p>
                    <p>If you did not create this account, please ignore this email.</p>
                    <div class='footer'>
                        <p>This is an automated message, please do not reply to this email.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>";
    }

    public function sendPasswordResetEmail($email, $userName, $resetLink)
    {
        try {
            $this->mail->clearAddresses();
            $this->mail->addAddress($email, $userName);

            $this->mail->isHTML(true);
            $this->mail->Subject = 'Password Reset Request - Media App';

            $htmlBody = $this->getPasswordResetTemplate($userName, $resetLink);
            $this->mail->Body = $htmlBody;
            $this->mail->AltBody = "Password Reset Request\n\nClick the link below to reset your password:\n{$resetLink}";

            $this->mail->send();
            return true;
        } catch (Exception $e) {
            error_log('Password reset email failed: ' . $e->getMessage());
            return false;
        }
    }

    private function getPasswordResetTemplate($userName, $resetLink)
    {
        return "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='UTF-8'>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
                .button { display: inline-block; padding: 12px 30px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .footer { margin-top: 20px; font-size: 12px; color: #666; text-align: center; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>Password Reset Request</h1>
                </div>
                <div class='content'>
                    <p>Hi {$userName},</p>
                    <p>We received a request to reset your password. Click the button below to set a new password:</p>
                    <a href='{$resetLink}' class='button'>Reset Password</a>
                    <p>Or copy and paste this link in your browser:</p>
                    <p style='word-break: break-all;'><code>{$resetLink}</code></p>
                    <p>This link will expire in 1 hour.</p>
                    <p>If you did not request a password reset, please ignore this email and your password will remain unchanged.</p>
                    <div class='footer'>
                        <p>This is an automated message, please do not reply to this email.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>";
    }
}
?>