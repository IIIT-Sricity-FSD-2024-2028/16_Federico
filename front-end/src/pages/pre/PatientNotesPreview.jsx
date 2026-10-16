'use strict';

import { Card, CardContent } from '../../components/ui/Card.jsx';
import { API_BASE_URL } from '../../api/client.js';

/**
 * Resolves uploaded document URLs (relative or absolute) against backend origin.
 */
function resolveDocumentUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

/**
 * Clean, clinical preview of patient symptoms and attached documents.
 * Strictly no emojis — uses clean SVG stroke icons and shared Card components.
 */
export default function PatientNotesPreview({ note, documentUrls, className = '', hideWhenEmpty = false }) {
  const hasNote = Boolean(note && String(note).trim());
  const files = Array.isArray(documentUrls) ? documentUrls.filter(Boolean) : [];
  const hasFiles = files.length > 0;

  if (!hasNote && !hasFiles) {
    if (hideWhenEmpty) return null;
    return (
      <div className={`patient-notes-empty-inline ${className}`.trim()}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>No patient symptoms or attached documents provided.</span>
      </div>
    );
  }

  return (
    <Card className={`patient-notes-card ${className}`.trim()}>
      <CardContent style={{ padding: '12px 14px' }}>
        <div className="patient-notes-header">
          <svg
            className="patient-notes-icon"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
          </svg>
          <strong>Patient Symptoms &amp; Clinical Notes</strong>
        </div>

        {hasNote ? (
          <div className="patient-notes-text">
            {String(note).trim()}
          </div>
        ) : (
          <div className="patient-notes-empty-label" style={{ marginBottom: hasFiles ? 8 : 0 }}>
            No symptoms text described.
          </div>
        )}

        {hasFiles && (
          <div className="patient-notes-files">
            <div className="patient-notes-files-label">
              Attached Medical Documents ({files.length}):
            </div>
            <div className="patient-notes-chips">
              {files.map((url, i) => {
                const filename = url.split('/').pop() || `Document ${i + 1}`;
                const resolved = resolveDocumentUrl(url);

                return (
                  <a
                    key={i}
                    href={resolved}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="patient-file-chip"
                    title={`Open ${filename} in new tab`}
                  >
                    <svg
                      className="file-chip-icon"
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                    <span className="file-chip-name">{filename}</span>
                    <svg
                      className="file-chip-arrow"
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
