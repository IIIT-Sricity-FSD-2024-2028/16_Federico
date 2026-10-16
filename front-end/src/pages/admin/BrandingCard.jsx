'use strict';

import { useState } from 'react';
import Button from '../../components/ui/Button.jsx';
import { api } from '../../api/index.js';
import { toast } from '../../components/feedback/feedback.js';

function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Hospital logo upload. Moved verbatim out of the Roles & Staff screen when
 * the custom-RBAC matrix was removed; it now sits on the People page.
 */
export default function BrandingCard() {
  const [brandingFile, setBrandingFile] = useState(null);
  const [brandingUpload, setBrandingUpload] = useState(null);
  const [uploading, setUploading] = useState(false);

  async function uploadBranding() {
    if (!brandingFile) {
      toast('Choose a logo file first.', 'warning');
      return;
    }
    setUploading(true);
    try {
      const result = await api.uploads.branding(brandingFile);
      setBrandingUpload(result);
      toast('Logo uploaded (' + formatFileSize(result.sizeBytes) + ').', 'success');
      setBrandingFile(null);
    } catch (err) {
      toast(err.message || 'Could not upload logo.', 'error');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="card" style={{ marginTop: 24 }}>
      <div className="card-header">
        <h2 className="card-title">Hospital Branding Assets</h2>
        <p className="card-description">
          Upload a logo file (PNG/JPEG/WEBP, max 5MB). It&apos;s stored on the server and previewed
          below via the File Upload API.
        </p>
      </div>
      <div className="card-content">
        <div className="branding-row">
          <div className="branding-preview" id="branding-preview">
            {brandingUpload ? (
              brandingUpload.mimetype === 'application/pdf' ? (
                <span>PDF<br />uploaded</span>
              ) : (
                <img src={api.uploads.staticUrl('branding', brandingUpload.filename)} alt="Hospital logo" />
              )
            ) : (
              <span>No logo<br />uploaded</span>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <input
              type="file"
              id="branding-file-input"
              accept="image/png,image/jpeg,image/webp,application/pdf"
              className="input"
              style={{ padding: 8 }}
              onChange={(e) => setBrandingFile(e.target.files?.[0] || null)}
            />
            <div className="branding-meta" id="branding-meta">
              {brandingUpload
                ? brandingUpload.originalName + ' · ' + formatFileSize(brandingUpload.sizeBytes) + ' · uploaded just now'
                : ''}
            </div>
          </div>
          <Button variant="primary" id="branding-upload-btn" onClick={uploadBranding} disabled={uploading}>
            {uploading ? 'Uploading…' : 'Upload Logo'}
          </Button>
        </div>
      </div>
    </div>
  );
}
