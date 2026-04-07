import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import './DocumentDetailPage.css';

const documentData = {
  name: 'Annual_Report_2023.pdf',
  size: '14.2 MB',
  date: 'Oct 24, 2023 • 09:12 AM',
  type: 'PDF',
  pages: 142,
  collection: 'Commercial Briefs',
  status: 'Analyzed',
  author: 'Architect Team',
  version: 'v2.1',
  tags: ['Financial', 'Annual Report', 'Architecture', 'Q4 2023'],
};

export default function DocumentDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const [pdfUrl, setPdfUrl] = useState("/sample_document.pdf");

  // Get document passed from DocumentsPage
  const uploadedDoc = location.state?.document;

  useEffect(() => {
    // If it's a real File object passed from the upload, create a local blob URL
    if (uploadedDoc?.fileObj) {
      const objectUrl = URL.createObjectURL(uploadedDoc.fileObj);
      setPdfUrl(objectUrl);
      
      // Cleanup
      return () => URL.revokeObjectURL(objectUrl);
    }
  }, [uploadedDoc]);

  // Use uploaded doc info or fallback to mock data
  const displayData = uploadedDoc ? {
    name: uploadedDoc.name,
    size: uploadedDoc.size,
    date: uploadedDoc.date,
    type: uploadedDoc.type,
    pages: '?',
    collection: 'Collection',
    status: 'Recently Uploaded',
    author: 'You',
    version: 'v1.0',
    tags: ['New', uploadedDoc.type],
  } : documentData;

  return (
    <div className="doc-detail-page" id="document-detail-page">
      {/* Left: Document Viewer */}
      <div className="doc-viewer" id="doc-viewer-container">
        {/* Viewer Header / Toolbar */}
        <header className="doc-viewer-toolbar glass">
          <div className="doc-viewer-toolbar-left">
            <button className="doc-viewer-back" onClick={() => navigate('/documents')} id="doc-back-btn">
              <span className="material-icons-outlined">arrow_back</span>
            </button>
            <div className="doc-viewer-file-info">
              <span className="material-icons-outlined doc-viewer-file-icon">picture_as_pdf</span>
              <div>
                <h2 className="title-sm">{displayData.name}</h2>
                <span className="body-sm" style={{ color: 'var(--on-surface-variant)' }}>
                  Viewing Document
                </span>
              </div>
            </div>
          </div>
          <div className="doc-viewer-toolbar-actions">
            <button className="doc-toolbar-btn" aria-label="Fullscreen">
              <span className="material-icons-outlined">fullscreen</span>
            </button>
            <button className="doc-toolbar-btn" aria-label="Print">
              <span className="material-icons-outlined">print</span>
            </button>
          </div>
        </header>

        {/* Real PDF Embed */}
        <div className="doc-viewer-content" id="doc-viewer-content" style={{ padding: 0, overflow: 'hidden' }}>
          <iframe 
            src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1`}
            title="PDF Viewer"
            className="doc-pdf-iframe"
            style={{ width: '100%', height: '100%', border: 'none', background: '#525659' }}
          />
        </div>
      </div>

      {/* Right: Document Details Panel */}
      <aside className="doc-detail-panel" id="doc-detail-sidebar">
        <div className="doc-detail-panel-section">
          <h3 className="headline-sm doc-detail-panel-title">Document Details</h3>
        </div>

        {/* File Preview Card */}
        <div className="doc-detail-preview">
          <div className="doc-detail-preview-icon">
            <span className="material-icons-outlined">
              {displayData.type === 'PDF' ? 'picture_as_pdf' : displayData.type === 'DOCX' || displayData.type === 'DOC' ? 'description' : 'insert_drive_file'}
            </span>
          </div>
          <div className="doc-detail-preview-info">
            <h4 className="title-sm">{displayData.name}</h4>
            <span className="body-sm" style={{ color: 'var(--on-surface-variant)' }}>
              {displayData.size} • {displayData.pages === '?' ? '' : displayData.pages + ' pages'}
            </span>
          </div>
        </div>

        {/* Metadata */}
        <div className="doc-detail-meta-grid">
          <div className="doc-detail-meta-item">
            <span className="label-sm doc-meta-label">Uploaded</span>
            <span className="body-md">{displayData.date}</span>
          </div>
          <div className="doc-detail-meta-item">
            <span className="label-sm doc-meta-label">Author</span>
            <span className="body-md">{displayData.author}</span>
          </div>
          <div className="doc-detail-meta-item">
            <span className="label-sm doc-meta-label">Collection</span>
            <span className="body-md">{displayData.collection}</span>
          </div>
          <div className="doc-detail-meta-item">
            <span className="label-sm doc-meta-label">Version</span>
            <span className="body-md">{displayData.version}</span>
          </div>
          <div className="doc-detail-meta-item">
            <span className="label-sm doc-meta-label">Status</span>
            <span className="doc-detail-status-badge">
              <span className="doc-detail-status-dot" />
              {displayData.status}
            </span>
          </div>
          <div className="doc-detail-meta-item">
            <span className="label-sm doc-meta-label">Format</span>
            <span className="body-md">{displayData.type}</span>
          </div>
        </div>

        {/* Tags */}
        <div className="doc-detail-panel-section">
          <span className="label-md doc-meta-label">Tags</span>
          <div className="doc-detail-tags">
            {displayData.tags.map((tag) => (
              <span key={tag} className="doc-detail-tag">{tag}</span>
            ))}
          </div>
        </div>

        {/* Management */}
        <div className="doc-detail-panel-section">
          <h4 className="title-sm" style={{ marginBottom: 'var(--spacing-4)' }}>Management</h4>
          <div className="doc-detail-actions">
            <button className="doc-action-btn" id="doc-download-btn">
              <span className="material-icons-outlined">download</span>
              Download
            </button>
            <button className="doc-action-btn" id="doc-share-btn">
              <span className="material-icons-outlined">share</span>
              Share
            </button>
            <button className="doc-action-btn" id="doc-move-btn">
              <span className="material-icons-outlined">drive_file_move</span>
              Move
            </button>
            <button className="doc-action-btn doc-action-danger" id="doc-delete-btn">
              <span className="material-icons-outlined">delete</span>
              Delete
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
