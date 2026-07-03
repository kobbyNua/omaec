<?php 

   require  'vendor/autoload.php';

   use PHPMailer\PHPMailer\PHPMailer;
   use PHPMailer\PHPMailer\Exception;

   function mailer(string $to, string $name,string $subject, string $body):bool{
        $mail = new PHPMailer(true);
        try {
            //Server settings
            $mail->isSMTP();                                            // Send using SMTP
            $mail->Host       = 'smtp.gmail.com';                       // Set the SMTP server to send through
            $mail->SMTPAuth   = true;                                   // Enable SMTP authentication
            $mail->Username   = '';
            $mail->Password  = '';
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;         // Enable TLS encryption; `PHPMailer::ENCRYPTION_SMTPS` encouraged
            $mail->Port       = 587;                                    // TCP port to connect to, use 465 for `PHPMailer::ENCRYPTION_SMTPS` above

            $mail->setFrom('kwabenaelvis584#gmail.com', 'Mailer');
            $mail->addAddress($to, $name);

            $mail->isHTML(true);                                  // Set email format to HTML
            $mail->Subject = $subject;
            $mail->Body    = $body;
            $mail->send();
            return true;
        }
        catch (Exception $e){

              echo json_encode(['error'=>"fail to send mail"]);
              error_log("Mailer Error: {$mail->ErrorInfo}");
        }
        return false;
   }