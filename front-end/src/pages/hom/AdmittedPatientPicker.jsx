'use strict';

import { useState, useRef, useEffect, useMemo } from 'react';

/**
 * AdmittedPatientPicker — Searchable picker for patients with active inpatient admissions.
 * Allows HOM staff to search by Patient Name, UHID, or Bed Number instead of typing raw UHIDs.
 * Strictly zero emojis, clean SVG stroke icons, and accessible click-outside dismissal.
 */
export default function AdmittedPatientPicker({
  admittedPatients = [],
  selectedUhid = '',
  onSelect,
  placeholder = 'Search admitted patient by name, UHID, or bed...',
  id = 'admitted-patient-picker',
  className = '',
  error = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [userQuery, setUserQuery] = useState(null);
  const containerRef = useRef(null);

  const selectedPatient = useMemo(() => {
    if (!selectedUhid) return null;
    const clean = String(selectedUhid).trim().toLowerCase();
    return admittedPatients.find((p) => String(p.uhid).toLowerCase() === clean) || null;
  }, [admittedPatients, selectedUhid]);

  // Close dropdown on click outside and reset transient search query
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setUserQuery(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayValue = userQuery !== null
    ? userQuery
    : selectedPatient
      ? `${selectedPatient.name} (${selectedPatient.uhid})`
      : '';

  const query = (userQuery ?? '').trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!query) return admittedPatients;
    return admittedPatients.filter((p) => {
      const name = (p.name || '').toLowerCase();
      const uhid = (p.uhid || '').toLowerCase();
      const bed = (p.bed_number || '').toLowerCase();
      const phone = (p.phone || '').toLowerCase();
      return name.includes(query) || uhid.includes(query) || bed.includes(query) || phone.includes(query);
    });
  }, [admittedPatients, query]);

  function handleSelect(patient) {
    onSelect(patient);
    setUserQuery(null);
    setIsOpen(false);
  }

  function handleClear(e) {
    e.stopPropagation();
    onSelect(null);
    setUserQuery('');
    setIsOpen(true);
  }

  return (
    <div
      ref={containerRef}
      className={`admitted-picker-container ${className}`.trim()}
      id={`${id}-container`}
    >
      <div className={`admitted-picker-input-wrapper ${isOpen ? 'is-focused' : ''} ${error ? 'has-error' : ''}`}>
        <svg
          className="admitted-picker-search-icon"
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>

        <input
          type="text"
          id={id}
          className="admitted-picker-input"
          placeholder={placeholder}
          autoComplete="off"
          value={displayValue}
          onFocus={() => setIsOpen(true)}
          onClick={() => setIsOpen(true)}
          onChange={(e) => {
            setUserQuery(e.target.value);
            setIsOpen(true);
            if (selectedPatient) {
              onSelect(null);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setIsOpen(false);
          }}
        />

        {selectedPatient ? (
          <button
            type="button"
            className="admitted-picker-clear-btn"
            onClick={handleClear}
            title="Clear patient selection"
            aria-label="Clear patient selection"
          >
            <svg
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
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        ) : (
          <svg
            className={`admitted-picker-chevron ${isOpen ? 'is-open' : ''}`}
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
            <polyline points="6 9 12 15 18 9" />
          </svg>
        )}
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="admitted-picker-dropdown" role="listbox">
          <div className="admitted-picker-header">
            <span>Currently Admitted Inpatients ({admittedPatients.length})</span>
            {query && filtered.length > 0 && (
              <span className="admitted-picker-match-count">{filtered.length} matching</span>
            )}
          </div>

          <div className="admitted-picker-list">
            {filtered.length === 0 ? (
              <div className="admitted-picker-empty">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <div className="admitted-picker-empty-title">
                  {query ? `No admitted patient matching "${query}"` : 'No patients currently admitted'}
                </div>
                <div className="admitted-picker-empty-hint">
                  Only inpatients with active admissions can be charged for supplies.
                </div>
              </div>
            ) : (
              filtered.map((p) => {
                const isSelected = selectedPatient?.uhid === p.uhid;
                return (
                  <button
                    key={p.admission_id || p.uhid}
                    type="button"
                    className={`admitted-picker-option ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => handleSelect(p)}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div className="admitted-picker-option-top">
                      <span className="admitted-picker-option-name">{p.name}</span>
                      <span className="admitted-picker-bed-badge">
                        <svg
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
                          <path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9" />
                        </svg>
                        {p.bed_number && p.bed_number !== '-' ? `Bed ${p.bed_number}` : 'Admitted'}
                      </span>
                    </div>
                    <div className="admitted-picker-option-bottom">
                      <span className="admitted-picker-uhid-tag">{p.uhid}</span>
                      {p.phone && <span className="admitted-picker-phone-tag">{p.phone}</span>}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
