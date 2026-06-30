"# Image Integration Testing Rules
- Use base64-encoded images for all tests.
- Accepted formats: JPEG, PNG, WEBP only.
- Never use blank, solid-color, or uniform-variance images.
- Each image must contain real visual features (food objects, edges, textures).
- If non-JPEG/PNG/WEBP, transcode to JPEG/PNG before upload, and update MIME type.
- For animated formats, extract first frame only.
- Resize large images to reasonable bounds before upload.
- Endpoint to test: POST /api/predict (multipart, field name \"file\")
"