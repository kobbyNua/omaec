<?php

/**
 * Upload an image or video file to the server.
 *
 * @param array $file The uploaded file array from $_FILES
 * @param string|null $uploadDir Optional subfolder inside /uploads (e.g. images, videos)
 * @param string|null $type Optional file type override: image|video
 * @return array Returns ['success' => bool, 'path' => string|null, 'message' => string]
 */
function uploadMediaFile(array $file, ?string $uploadDir = null, ?string $type = null): array
{
    if (!isset($file['name'], $file['tmp_name'], $file['error'])) {
        return ['success' => false, 'path' => null, 'message' => 'Invalid file upload data'];
    }

    if ($file['error'] !== UPLOAD_ERR_OK) {
        return ['success' => false, 'path' => null, 'message' => 'File upload failed'];
    }

    if (!is_uploaded_file($file['tmp_name'])) {
        return ['success' => false, 'path' => null, 'message' => 'The file was not uploaded through the form'];
    }

    $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $mimeType = mime_content_type($file['tmp_name']) ?: '';

    $imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    $videoExtensions = ['mp4', 'mov', 'avi', 'mkv', 'webm'];
    $allowedMimeTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/webm'
    ];

    $allowedExtensions = ($type === 'image')
        ? $imageExtensions
        : (($type === 'video') ? $videoExtensions : array_merge($imageExtensions, $videoExtensions));

    if (!in_array($extension, $allowedExtensions, true)) {
        return ['success' => false, 'path' => null, 'message' => 'Unsupported file format'];
    }

    if (!empty($mimeType) && !in_array($mimeType, $allowedMimeTypes, true)) {
        return ['success' => false, 'path' => null, 'message' => 'Unsupported file MIME type'];
    }

    $baseDir = dirname(__DIR__) . '/uploads';
    $targetDir = $baseDir;

    if (!is_dir($targetDir)) {
        return ['success' => false, 'path' => null, 'message' => 'Upload directory not found'];
    }

    $fileName = uniqid('media_', true) . '.' . $extension;
    $destination = $targetDir . '/' . $fileName;

    if (!move_uploaded_file($file['tmp_name'], $destination)) {
        return ['success' => false, 'path' => null, 'message' => 'Failed to move uploaded file'];
    }

    return [
        'success' => true,
        'path' => $destination,
        'message' => 'File uploaded successfully',
    ];
}
