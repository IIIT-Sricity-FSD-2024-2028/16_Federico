'use strict';

const dataStore = require('../store/dataStore');
const persist = require('../store/persist');

/**
 * BaseRepository
 * Generic in-memory repository providing atomic ID generation, standard CRUD,
 * tenant isolation scoping, and atomic persistence triggers.
 */
class BaseRepository {
  /**
   * @param {string} collectionName - Name of the collection in dataStore (e.g. 'patients')
   * @param {string} [idField='id'] - Primary key field name (e.g. 'patient_id')
   */
  constructor(collectionName, idField = 'id') {
    this.collectionName = collectionName;
    this.idField = idField;
    this._initSequence();
  }

  /**
   * Internal reference to the underlying in-memory array.
   * @returns {Array<object>}
   */
  get _collection() {
    if (!Array.isArray(dataStore[this.collectionName])) {
      dataStore[this.collectionName] = [];
    }
    return dataStore[this.collectionName];
  }

  /**
   * Initializes the atomic ID sequence counter based on the existing records.
   */
  _initSequence() {
    const records = this._collection;
    let maxId = 0;
    for (const item of records) {
      const val = Number(item[this.idField]);
      if (Number.isInteger(val) && val > maxId) {
        maxId = val;
      }
    }
    this._currentId = maxId;
  }

  /**
   * Generates the next atomic integer ID for this collection.
   * @returns {number}
   */
  nextId() {
    this._currentId = (this._currentId || 0) + 1;
    return this._currentId;
  }

  /**
   * Returns all records, optionally filtered.
   * @param {Function} [predicate=null]
   * @returns {Array<object>}
   */
  findAll(predicate = null) {
    if (typeof predicate === 'function') {
      return this._collection.filter(predicate);
    }
    return [...this._collection];
  }

  /**
   * Finds a single record matching predicate.
   * @param {Function} predicate
   * @returns {object|null}
   */
  findOne(predicate) {
    if (typeof predicate !== 'function') return null;
    const found = this._collection.find(predicate);
    return found ? { ...found } : null;
  }

  /**
   * Finds a record by its primary key ID.
   * @param {number|string} id
   * @returns {object|null}
   */
  findById(id) {
    const numId = Number(id);
    const found = this._collection.find(
      (item) => item[this.idField] === numId || String(item[this.idField]) === String(id),
    );
    return found ? { ...found } : null;
  }

  /**
   * Creates and persists a new record with an atomic ID.
   * @param {object} entity
   * @returns {object}
   */
  create(entity) {
    const id = entity[this.idField] ? Number(entity[this.idField]) : this.nextId();
    if (id > this._currentId) {
      this._currentId = id;
    }
    
    const record = {
      [this.idField]: id,
      ...entity,
      created_at: entity.created_at || new Date().toISOString(),
    };
    
    this._collection.push(record);
    persist.save();
    return { ...record };
  }

  /**
   * Updates an existing record by ID.
   * @param {number|string} id
   * @param {object} patch
   * @returns {object|null}
   */
  update(id, patch) {
    const numId = Number(id);
    const index = this._collection.findIndex(
      (item) => item[this.idField] === numId || String(item[this.idField]) === String(id),
    );
    if (index === -1) return null;

    const existing = this._collection[index];
    const updated = {
      ...existing,
      ...patch,
      [this.idField]: existing[this.idField], // Guard primary key
      updated_at: new Date().toISOString(),
    };

    this._collection[index] = updated;
    persist.save();
    return { ...updated };
  }

  /**
   * Deletes a record by ID.
   * @param {number|string} id
   * @returns {boolean}
   */
  delete(id) {
    const numId = Number(id);
    const index = this._collection.findIndex(
      (item) => item[this.idField] === numId || String(item[this.idField]) === String(id),
    );
    if (index === -1) return false;

    this._collection.splice(index, 1);
    persist.save();
    return true;
  }

  /**
   * Counts records matching an optional predicate.
   * @param {Function} [predicate=null]
   * @returns {number}
   */
  count(predicate = null) {
    if (typeof predicate === 'function') {
      return this._collection.filter(predicate).length;
    }
    return this._collection.length;
  }

  /**
   * Returns a tenant-scoped sub-view of the repository.
   * @param {number} organizationId
   * @returns {object} Scoped repository methods
   */
  scoped(organizationId) {
    const orgId = Number(organizationId);
    return {
      findAll: (predicate = null) => {
        return this.findAll((item) => {
          if (item.organization_id !== undefined && item.organization_id !== orgId) return false;
          return predicate ? predicate(item) : true;
        });
      },
      findById: (id) => {
        const found = this.findById(id);
        if (!found) return null;
        if (found.organization_id !== undefined && found.organization_id !== orgId) return null;
        return found;
      },
      findOne: (predicate) => {
        return this.findOne((item) => {
          if (item.organization_id !== undefined && item.organization_id !== orgId) return false;
          return predicate(item);
        });
      },
      create: (entity) => {
        return this.create({ ...entity, organization_id: orgId });
      },
      update: (id, patch) => {
        const existing = this.findById(id);
        if (!existing || (existing.organization_id !== undefined && existing.organization_id !== orgId)) {
          return null;
        }
        return this.update(id, patch);
      },
      delete: (id) => {
        const existing = this.findById(id);
        if (!existing || (existing.organization_id !== undefined && existing.organization_id !== orgId)) {
          return false;
        }
        return this.delete(id);
      },
      count: (predicate = null) => {
        return this.count((item) => {
          if (item.organization_id !== undefined && item.organization_id !== orgId) return false;
          return predicate ? predicate(item) : true;
        });
      },
    };
  }
}

module.exports = BaseRepository;
