<?php

/**
 * Upload an image or video file to the server.
 *
 * @param array $file The uploaded file array from $_FILES
 * @param string|null $uploadDir Optional subfolder inside /uploads (e.g. images, videos)
 * @param string|null $type Optional file type override: image|video
 * @return array Returns ['success' => bool, 'path' => string|null, 'message' => string]
 */
function detectMediaTypeFromFile(array $file): ?string
{
    $mimeType = strtolower((string)($file['type'] ?? ''));
    if (stripos($mimeType, 'video/') === 0) {
        return 'video';
    }
    if (stripos($mimeType, 'image/') === 0) {
        return 'image';
    }

    $fileName = (string)($file['name'] ?? '');
    $extension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
    if (in_array($extension, ['mp4', 'mov', 'avi', 'mkv', 'webm'], true)) {
        return 'video';
    }
    if (in_array($extension, ['jpg', 'jpeg', 'png', 'gif', 'webp'], true)) {
        return 'image';
    }

    return null;
}

function uploadMediaFile(?array $file, ?string $uploadDir = null, ?string $type = null): array
{
    if (!is_array($file)) {
        return ['success' => false, 'path' => null, 'message' => 'No file upload data provided'];
    }

    if (isset($file['name']) && is_array($file['name'])) {
        $files = [];
        $count = count($file['name']);

        for ($i = 0; $i < $count; $i++) {
            $fileName = $file['name'][$i] ?? '';
            if ($fileName === '') {
                continue;
            }

            $files[] = [
                'name' => $fileName,
                'type' => $file['type'][$i] ?? '',
                'tmp_name' => $file['tmp_name'][$i] ?? '',
                'error' => $file['error'][$i] ?? UPLOAD_ERR_NO_FILE,
                'size' => $file['size'][$i] ?? 0,
            ];
        }

        if (empty($files)) {
            return ['success' => false, 'path' => null, 'message' => 'No file upload data provided'];
        }

        $resolvedType = $type;
        if ($resolvedType === null) {
            $firstType = detectMediaTypeFromFile($files[0]);
            if ($firstType === null) {
                return ['success' => false, 'path' => null, 'message' => 'Unsupported file format in the uploaded group'];
            }
            $resolvedType = $firstType;
        }

        foreach ($files as $singleFile) {
            $singleType = detectMediaTypeFromFile($singleFile);
            if ($singleType !== null && $singleType !== $resolvedType) {
                return ['success' => false, 'path' => null, 'message' => 'Multiple uploads must be all images or all videos'];
            }
        }

        $uploadedPaths = [];
        foreach ($files as $singleFile) {
            $uploadResult = uploadMediaFile($singleFile, $uploadDir, $resolvedType);
            if (!$uploadResult['success']) {
                return $uploadResult;
            }
            $uploadedPaths[] = $uploadResult['path'];
        }

        return [
            'success' => true,
            'path' => $uploadedPaths,
            'message' => 'Files uploaded successfully',
        ];
    }

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

    if (!empty($uploadDir)) {
        $targetDir = rtrim($targetDir, '/') . '/' . trim($uploadDir, '/');
    }

    if (!is_dir($targetDir)) {
        if (!mkdir($targetDir, 0777, true) && !is_dir($targetDir)) {
            return ['success' => false, 'path' => null, 'message' => 'Upload directory could not be created'];
        }
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
