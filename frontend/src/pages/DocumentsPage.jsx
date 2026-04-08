import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './DocumentsPage.css';

const stats = [
  { label: 'Total Collections', value: '12', icon: 'folder' },
  { label: 'Total Documents', value: '156', icon: 'description' },
  { label: 'Storage Used', value: '4.2 GB', sub: '/ 10 GB', icon: 'cloud' },
];

const initialCollections = [
  { id: 1, name: 'Residential Projects', docs: 24, updated: '2 days ago', icon: 'home', color: '#006067' },
  { id: 2, name: 'Commercial Briefs', docs: 18, updated: '5 hours ago', icon: 'business', color: '#834718' },
  { id: 3, name: 'Interior Specifications', docs: 32, updated: 'Oct 24, 2023', icon: 'chair', color: '#4c616c' },
  { id: 4, name: 'Technical Standards', docs: 15, updated: '1 week ago', icon: 'engineering', color: '#006067' },
  { id: 5, name: 'Landscape Designs', docs: 21, updated: '3 days ago', icon: 'park', color: '#2e7d32' },
  { id: 6, name: 'Sustainable Materials', docs: 14, updated: 'yesterday', icon: 'eco', color: '#006067' },
  { id: 7, name: 'Heritage Surveys', docs: 19, updated: 'Oct 18, 2023', icon: 'museum', color: '#834718' },
  { id: 8, name: 'Construction Details', docs: 13, updated: 'Oct 15, 2023', icon: 'construction', color: '#4c616c' },
  { id: 9, name: 'MEP Systems', docs: 11, updated: 'Oct 12, 2023', icon: 'settings', color: '#006067' },
  { id: 10, name: 'Client Proposals', docs: 9, updated: 'Oct 10, 2023', icon: 'handshake', color: '#834718' },
  { id: 11, name: 'Safety Reports', docs: 7, updated: 'Oct 8, 2023', icon: 'health_and_safety', color: '#4c616c' },
  { id: 12, name: 'Urban Planning', docs: 6, updated: 'Oct 5, 2023', icon: 'location_city', color: '#2e7d32' },
];

// Documents grouped by collection ID
const documentsByCollection = {
  1: [
    { id: 101, name: 'Villa_Blueprint_Danang.pdf', size: '18.3 MB', date: 'Nov 2, 2023', type: 'PDF' },
    { id: 102, name: 'Townhouse_Specs_v3.pdf', size: '12.1 MB', date: 'Oct 28, 2023', type: 'PDF' },
    { id: 103, name: 'Apartment_Floor_Plans.dwg', size: '34.5 MB', date: 'Oct 25, 2023', type: 'DWG' },
    { id: 104, name: 'Residential_Cost_Estimate.xlsx', size: '2.4 MB', date: 'Oct 22, 2023', type: 'XLSX' },
    { id: 105, name: 'Site_Survey_Report.pdf', size: '8.9 MB', date: 'Oct 20, 2023', type: 'PDF' },
    { id: 106, name: 'Landscape_Integration.pdf', size: '5.6 MB', date: 'Oct 18, 2023', type: 'PDF' },
    { id: 107, name: 'Electrical_Layout_R1.dwg', size: '15.2 MB', date: 'Oct 15, 2023', type: 'DWG' },
    { id: 108, name: 'Interior_Mood_Board.pdf', size: '22.8 MB', date: 'Oct 12, 2023', type: 'PDF' },
  ],
  2: [
    { id: 201, name: 'Annual_Report_2023.pdf', size: '14.2 MB', date: 'Oct 24, 2023', type: 'PDF' },
    { id: 202, name: 'Office_Tower_Proposal.pdf', size: '9.8 MB', date: 'Oct 21, 2023', type: 'PDF' },
    { id: 203, name: 'Retail_Space_Analysis.xlsx', size: '3.4 MB', date: 'Oct 19, 2023', type: 'XLSX' },
    { id: 204, name: 'Hotel_Concept_Design.pdf', size: '28.1 MB', date: 'Oct 17, 2023', type: 'PDF' },
    { id: 205, name: 'Commercial_Lease_Terms.pdf', size: '1.9 MB', date: 'Oct 14, 2023', type: 'PDF' },
    { id: 206, name: 'Shopping_Mall_Specs.pdf', size: '16.7 MB', date: 'Oct 11, 2023', type: 'PDF' },
  ],
  3: [
    { id: 301, name: 'Furniture_Schedule.xlsx', size: '4.2 MB', date: 'Oct 24, 2023', type: 'XLSX' },
    { id: 302, name: 'Material_Palette_v2.pdf', size: '7.3 MB', date: 'Oct 20, 2023', type: 'PDF' },
    { id: 303, name: 'Lighting_Design_Plan.pdf', size: '11.5 MB', date: 'Oct 18, 2023', type: 'PDF' },
    { id: 304, name: 'Floor_Plans_Lobby.dwg', size: '22.4 MB', date: 'Oct 15, 2023', type: 'DWG' },
    { id: 305, name: 'Ceiling_Detail_Sections.dwg', size: '9.1 MB', date: 'Oct 12, 2023', type: 'DWG' },
  ],
  4: [
    { id: 401, name: 'Structural_Analysis_WestWing.pdf', size: '8.7 MB', date: 'Oct 22, 2023', type: 'PDF' },
    { id: 402, name: 'HVAC_Design_Report.pdf', size: '6.5 MB', date: 'Oct 15, 2023', type: 'PDF' },
    { id: 403, name: 'Fire_Safety_Compliance.pdf', size: '4.8 MB', date: 'Oct 13, 2023', type: 'PDF' },
    { id: 404, name: 'Seismic_Assessment.pdf', size: '12.3 MB', date: 'Oct 10, 2023', type: 'PDF' },
  ],
  5: [
    { id: 501, name: 'Garden_Layout_Plan.dwg', size: '18.6 MB', date: 'Oct 23, 2023', type: 'DWG' },
    { id: 502, name: 'Plant_Schedule.xlsx', size: '1.8 MB', date: 'Oct 20, 2023', type: 'XLSX' },
    { id: 503, name: 'Irrigation_System.pdf', size: '5.2 MB', date: 'Oct 17, 2023', type: 'PDF' },
  ],
  6: [
    { id: 601, name: 'Material_Specs_v2.xlsx', size: '3.1 MB', date: 'Oct 20, 2023', type: 'XLSX' },
    { id: 602, name: 'CLT_Panel_Analysis.pdf', size: '7.9 MB', date: 'Oct 18, 2023', type: 'PDF' },
    { id: 603, name: 'Recycled_Aluminum_Report.pdf', size: '4.3 MB', date: 'Oct 15, 2023', type: 'PDF' },
    { id: 604, name: 'LEED_Certification_Docs.pdf', size: '9.6 MB', date: 'Oct 12, 2023', type: 'PDF' },
    { id: 605, name: 'Bio_Facade_Samples.pdf', size: '15.1 MB', date: 'Oct 9, 2023', type: 'PDF' },
  ],
  7: [
    { id: 701, name: 'Heritage_Assessment_v1.pdf', size: '11.4 MB', date: 'Oct 18, 2023', type: 'PDF' },
    { id: 702, name: 'Restoration_Guidelines.pdf', size: '6.8 MB', date: 'Oct 14, 2023', type: 'PDF' },
  ],
  8: [
    { id: 801, name: 'Steel_Connection_Details.dwg', size: '19.2 MB', date: 'Oct 15, 2023', type: 'DWG' },
    { id: 802, name: 'Concrete_Mix_Specs.pdf', size: '3.7 MB', date: 'Oct 12, 2023', type: 'PDF' },
    { id: 803, name: 'Waterproofing_Membrane.pdf', size: '5.4 MB', date: 'Oct 9, 2023', type: 'PDF' },
  ],
};

// Fill remaining collections with placeholder docs
for (let i = 9; i <= 12; i++) {
  documentsByCollection[i] = [
    { id: i * 100 + 1, name: `Document_${i}_A.pdf`, size: '4.2 MB', date: 'Oct 5, 2023', type: 'PDF' },
    { id: i * 100 + 2, name: `Document_${i}_B.xlsx`, size: '2.1 MB', date: 'Oct 3, 2023', type: 'XLSX' },
  ];
}

const COLLECTIONS_PER_PAGE = 12;
const DOCS_PER_PAGE = 6;
const COLLECTION_COLORS = ['#006067', '#834718', '#4c616c', '#2e7d32'];

function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const pages = [];
  for (let i = 1; i <= totalPages; i++) pages.push(i);

  return (
    <div className="paging">
      <button
        className="paging-btn"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        <span className="material-icons-outlined">chevron_left</span>
        Previous
      </button>
      <div className="paging-nums">
        {pages.map((p) => (
          <button
            key={p}
            className={`paging-num ${currentPage === p ? 'active' : ''}`}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        ))}
      </div>
      <button
        className="paging-btn"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        Next
        <span className="material-icons-outlined">chevron_right</span>
      </button>
    </div>
  );
}

function mapApiCollection(data, index = 0) {
  return {
    id: data.id,
    name: data.name_collections,
    description: data.descriptions,
    docs: 0,
    updated: data.created_at ? new Date(data.created_at).toLocaleDateString() : '',
    icon: data.base_64_icon || 'folder',
    color: COLLECTION_COLORS[index % COLLECTION_COLORS.length],
  };
}

export default function DocumentsPage() {
  const [collections, setCollections] = useState([]);
  const [totalCollections, setTotalCollections] = useState(0);
  const [totalColPages, setTotalColPages] = useState(0);
  const [isLoadingCollections, setIsLoadingCollections] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [docsByCol, setDocsByCol] = useState(documentsByCollection);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [colPage, setColPage] = useState(1);
  const [docPage, setDocPage] = useState(1);
  const navigate = useNavigate();

  const fetchCollections = useCallback(async (page) => {
    setIsLoadingCollections(true);
    setLoadError(null);
    try {
      const [listRes, countRes] = await Promise.all([
        fetch(`http://localhost:8000/collections/?page=${page}`, { credentials: 'include' }),
        fetch('http://localhost:8000/collections/count', { credentials: 'include' }),
      ]);
      if (!listRes.ok) throw new Error(`Failed to load collections (${listRes.status})`);
      if (!countRes.ok) throw new Error(`Failed to load total (${countRes.status})`);
      const list = await listRes.json();
      const count = await countRes.json();
      setCollections(list.items.map((item, idx) => mapApiCollection(item, idx)));
      setTotalCollections(count.total);
      setTotalColPages(count.total_pages);
    } catch (err) {
      setLoadError(err.message || 'Failed to load collections');
      setCollections([]);
      setTotalCollections(0);
      setTotalColPages(0);
    } finally {
      setIsLoadingCollections(false);
    }
  }, []);

  useEffect(() => {
    fetchCollections(colPage);
  }, [colPage, fetchCollections]);

  // Create Collection Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDesc, setNewCollectionDesc] = useState('');
  const [newCollectionIcon, setNewCollectionIcon] = useState('folder');
  const iconOptions = ['folder', 'home', 'business', 'chair', 'engineering', 'park', 'eco', 'museum', 'construction', 'settings', 'account_balance', 'architecture'];

  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  const handleCreateCollection = async (e) => {
    e.preventDefault();
    if (!newCollectionName.trim() || isCreating) return;

    setIsCreating(true);
    setCreateError(null);
    try {
      const response = await fetch('http://localhost:8000/collections/', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name_collections: newCollectionName,
          descriptions: newCollectionDesc || null,
          base_64_icon: newCollectionIcon || null,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create collection (${response.status})`);
      }

      await response.json();

      setIsCreateModalOpen(false);
      setNewCollectionName('');
      setNewCollectionDesc('');
      setNewCollectionIcon('folder');
      // Jump back to first page to see the newly created collection (sorted by created_at desc)
      if (colPage !== 1) {
        setColPage(1);
      } else {
        await fetchCollections(1);
      }
    } catch (err) {
      setCreateError(err.message || 'Failed to create collection');
    } finally {
      setIsCreating(false);
    }
  };

  // Collections come pre-paginated from the server
  const pagedCollections = collections;

  // Documents pagination
  const currentDocs = selectedCollection ? (docsByCol[selectedCollection.id] || []) : [];
  const totalDocPages = Math.ceil(currentDocs.length / DOCS_PER_PAGE);
  const pagedDocs = currentDocs.slice(
    (docPage - 1) * DOCS_PER_PAGE,
    docPage * DOCS_PER_PAGE
  );

  const handleSelectCollection = (col) => {
    setSelectedCollection(col);
    setDocPage(1);
  };

  const handleBackToCollections = () => {
    setSelectedCollection(null);
    setDocPage(1);
  };

  const fileInputRef = useRef(null);

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length || !selectedCollection) return;

    const newDocs = files.map((file, idx) => {
      let sizeText = '';
      if (file.size < 1024 * 1024) {
        sizeText = `${(file.size / 1024).toFixed(1)} KB`;
      } else {
        sizeText = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
      }
      const extMatch = file.name.match(/\.([^.]+)$/);
      const ext = extMatch ? extMatch[1].toUpperCase() : 'DOC';

      return {
        id: Date.now() + idx,
        name: file.name,
        size: sizeText,
        date: 'Just now',
        type: ext,
        fileObj: file // Pass the actual File object
      };
    });

    setDocsByCol(prev => ({
      ...prev,
      [selectedCollection.id]: [...newDocs, ...(prev[selectedCollection.id] || [])]
    }));

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="docs-page" id="documents-page">
      {/* Header */}
      <header className="docs-header">
        <div>
          {selectedCollection ? (
            <div className="docs-breadcrumb">
              <button className="docs-breadcrumb-back" onClick={handleBackToCollections}>
                <span className="material-icons-outlined">arrow_back</span>
              </button>
              <div>
                <h1 className="headline-md">{selectedCollection.name}</h1>
                <p className="body-md docs-header-desc">
                  {currentDocs.length} documents in this collection
                </p>
              </div>
            </div>
          ) : (
            <>
              <h1 className="headline-md">Quản lý tài liệu</h1>
              <p className="body-md docs-header-desc">
                Organize and manage your project documentation collections.
              </p>
            </>
          )}
        </div>
        <div className="docs-header-actions">
          <div className="docs-search-box">
            <span className="material-icons-outlined">search</span>
            <input
              type="text"
              placeholder={selectedCollection ? 'Search in collection...' : 'Search collections...'}
              className="docs-search-input"
              id="docs-search"
            />
          </div>
          {selectedCollection && (
            <>
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                accept=".pdf,.doc,.docx,.docs,.md" 
                multiple
                onChange={handleFileUpload}
              />
              <button className="docs-upload-btn" id="docs-upload-btn" onClick={() => fileInputRef.current?.click()}>
                <span className="material-icons-outlined">cloud_upload</span>
                Upload
              </button>
            </>
          )}
        </div>
      </header>

      {/* Stats — only on collections view */}
      {!selectedCollection && (
        <div className="docs-stats">
          {stats.map((stat) => (
            <div key={stat.label} className="docs-stat-card animate-fade-in">
              <div className="docs-stat-icon">
                <span className="material-icons-outlined">{stat.icon}</span>
              </div>
              <div className="docs-stat-info">
                <span className="docs-stat-value display-sm">{stat.value}
                  {stat.sub && <span className="docs-stat-sub">{stat.sub}</span>}
                </span>
                <span className="docs-stat-label body-sm">{stat.label}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===== Collections View ===== */}
      {!selectedCollection ? (
        <>
          <div className="docs-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 className="title-md">Project Collections</h2>
              <span className="body-sm docs-section-count">{totalCollections} collections</span>
            </div>
            <button className="primary-btn" onClick={() => setIsCreateModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
              <span className="material-icons-outlined">add</span> Create Collection
            </button>
          </div>
          {loadError && (
            <div className="body-sm" style={{ color: '#b3261e', padding: 'var(--spacing-2) 0' }}>
              {loadError}
            </div>
          )}
          {isLoadingCollections && pagedCollections.length === 0 && (
            <div className="body-sm" style={{ padding: 'var(--spacing-2) 0' }}>Loading collections...</div>
          )}
          {!isLoadingCollections && !loadError && pagedCollections.length === 0 && (
            <div className="body-sm" style={{ padding: 'var(--spacing-2) 0', color: 'var(--on-surface-variant)' }}>
              No collections yet. Click "Create Collection" to get started.
            </div>
          )}
          <div className="docs-collections-grid" id="collections-grid">
            {pagedCollections.map((col, index) => (
              <div
                key={col.id}
                className="folder-card animate-fade-in"
                style={{ animationDelay: `${index * 0.06}s` }}
                onClick={() => handleSelectCollection(col)}
                id={`collection-${col.id}`}
              >
                <div className="folder-card-header" style={{ background: `${col.color}12` }}>
                  <span className="material-icons-outlined folder-card-icon" style={{ color: col.color }}>
                    {col.icon}
                  </span>
                  <button className="folder-card-menu" aria-label="More options" onClick={(e) => e.stopPropagation()}>
                    <span className="material-icons-outlined">more_horiz</span>
                  </button>
                </div>
                <div className="folder-card-body">
                  <h3 className="title-sm folder-card-name">{col.name}</h3>
                  <div className="folder-card-meta">
                    <span className="folder-card-count">
                      <span className="material-icons-outlined">description</span>
                      {col.docs} docs
                    </span>
                    <span className="folder-card-date">{col.updated}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="paging-wrapper">
            <span className="body-sm paging-info">
              Showing {totalCollections === 0 ? 0 : (colPage - 1) * COLLECTIONS_PER_PAGE + 1}–{Math.min(colPage * COLLECTIONS_PER_PAGE, totalCollections)} of {totalCollections} collections
            </span>
            <Pagination currentPage={colPage} totalPages={totalColPages} onPageChange={setColPage} />
          </div>
        </>
      ) : (
        /* ===== Documents inside a Collection ===== */
        <>
          {/* Collection info bar */}
          <div className="docs-col-info-bar animate-fade-in">
            <div className="docs-col-info-icon" style={{ background: `${selectedCollection.color}15` }}>
              <span className="material-icons-outlined" style={{ color: selectedCollection.color }}>
                {selectedCollection.icon}
              </span>
            </div>
            <div className="docs-col-info-text">
              <span className="body-sm" style={{ color: 'var(--on-surface-variant)' }}>
                Last updated {selectedCollection.updated}
              </span>
            </div>
            <div className="docs-col-info-stats">
              <span className="docs-col-info-badge">
                <span className="material-icons-outlined">description</span>
                {currentDocs.length} documents
              </span>
            </div>
          </div>

          {/* Document list */}
          <div className="docs-file-list" id="docs-file-list">
            {pagedDocs.map((doc, index) => (
              <div
                key={doc.id}
                className="docs-file-row animate-fade-in"
                style={{ animationDelay: `${index * 0.05}s` }}
                onClick={() => navigate(`/documents/${doc.id}`, { state: { document: doc } })}
                id={`doc-${doc.id}`}
              >
                <div className="docs-file-icon">
                  <span className="material-icons-outlined">
                    {doc.type === 'PDF' ? 'picture_as_pdf' : doc.type === 'XLSX' ? 'table_chart' : 'draft'}
                  </span>
                </div>
                <div className="docs-file-info">
                  <span className="title-sm">{doc.name}</span>
                  <span className="body-sm docs-file-meta">{selectedCollection.name}</span>
                </div>
                <span className="docs-file-size body-sm">{doc.size}</span>
                <span className="docs-file-date body-sm">{doc.date}</span>
                <div className="docs-file-type-badge">{doc.type}</div>
                <button className="docs-file-action" aria-label="More" onClick={(e) => e.stopPropagation()}>
                  <span className="material-icons-outlined">more_vert</span>
                </button>
              </div>
            ))}
          </div>
          <div className="paging-wrapper">
            <span className="body-sm paging-info">
              Showing {(docPage - 1) * DOCS_PER_PAGE + 1}–{Math.min(docPage * DOCS_PER_PAGE, currentDocs.length)} of {currentDocs.length} documents
            </span>
            <Pagination currentPage={docPage} totalPages={totalDocPages} onPageChange={setDocPage} />
          </div>
        </>
      )}

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
          <div className="modal-content animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="title-md">Create New Collection</h3>
              <button className="modal-close" onClick={() => setIsCreateModalOpen(false)}>
                <span className="material-icons-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleCreateCollection}>
              <div className="form-group">
                <label className="label-sm">Collection Name *</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={newCollectionName} 
                  onChange={e => setNewCollectionName(e.target.value)} 
                  placeholder="e.g. Master Plan 2024" 
                  autoFocus 
                  required 
                />
              </div>
              <div className="form-group">
                <label className="label-sm">Description (Optional)</label>
                <textarea 
                  className="input-field" 
                  value={newCollectionDesc} 
                  onChange={e => setNewCollectionDesc(e.target.value)} 
                  placeholder="Brief description of the collection..."
                  rows="3"
                />
              </div>
              <div className="form-group">
                <label className="label-sm">Select Icon</label>
                <div className="icon-selector">
                  {iconOptions.map(icon => (
                    <button 
                      type="button"
                      key={icon} 
                      className={`icon-option ${newCollectionIcon === icon ? 'selected' : ''}`}
                      onClick={() => setNewCollectionIcon(icon)}
                    >
                      <span className="material-icons-outlined">{icon}</span>
                    </button>
                  ))}
                </div>
              </div>
              {createError && (
                <div className="form-error body-sm" style={{ color: '#b3261e', marginBottom: 'var(--spacing-2)' }}>
                  {createError}
                </div>
              )}
              <div className="modal-footer">
                <button type="button" className="secondary-btn" onClick={() => setIsCreateModalOpen(false)} disabled={isCreating}>Cancel</button>
                <button type="submit" className="primary-btn" disabled={!newCollectionName.trim() || isCreating}>
                  {isCreating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
