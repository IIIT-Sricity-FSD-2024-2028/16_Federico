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
    this._index = new Map();
    this._lastCollectionRef = null;
    this._initSequenceAndIndex();
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
   * Initializes or rebuilds the O(1) ID index and atomic sequence counter.
   * Synchronizes automatically if the underlying collection was replaced or modified.
   */
  _initSequenceAndIndex() {
    const records = this._collection;
    this._index.clear();
    let maxId = 0;

    for (const item of records) {
      if (item && item[this.idField] !== undefined && item[this.idField] !== null) {
        const val = Number(item[this.idField]);
        if (Number.isInteger(val) && val > maxId) {
          maxId = val;
        }
        this._index.set(item[this.idField], item);
        if (!Number.isNaN(val)) {
          this._index.set(val, item);
          this._index.set(String(val), item);
        }
      }
    }

    this._currentId = maxId;
    this._lastCollectionRef = records;
    this._lastCollectionLength = records.length;
  }

  /**
   * Ensures the O(1) Map index is up-to-date with the collection array.
   */
  _ensureIndex() {
    const records = this._collection;
    if (records !== this._lastCollectionRef || records.length !== this._lastCollectionLength) {
      this._initSequenceAndIndex();
    }
  }

  /**
   * Generates the next atomic integer ID for this collection.
   * Time Complexity: O(1)
   * @returns {number}
   */
  nextId() {
    this._ensureIndex();
    this._currentId = (this._currentId || 0) + 1;
    return this._currentId;
  }

  /**
   * Returns all records, optionally filtered.
   * Time Complexity: O(N) where N is collection length
   * @param {Function} [predicate=null]
   * @returns {Array<object>}
   */
  findAll(predicate = null) {
    this._ensureIndex();
    if (typeof predicate === 'function') {
      return this._collection.filter(predicate);
    }
    return [...this._collection];
  }

  /**
   * Finds a single record matching predicate.
   * Time Complexity: O(N)
   * @param {Function} predicate
   * @returns {object|null}
   */
  findOne(predicate) {
    if (typeof predicate !== 'function') return null;
    this._ensureIndex();
    const found = this._collection.find(predicate);
    return found ? { ...found } : null;
  }

  /**
   * Finds a record by its primary key ID.
   * Time Complexity: O(1) constant time lookup via Map index
   * Space Complexity: O(1) auxiliary space
   * @param {number|string} id
   * @returns {object|null}
   */
  findById(id) {
    if (id === undefined || id === null || id === '') return null;
    this._ensureIndex();

    const numId = Number(id);
    const found = this._index.get(numId) || this._index.get(id) || this._index.get(String(id));
    return found ? { ...found } : null;
  }

  /**
   * Creates and persists a new record with an atomic ID.
   * Time Complexity: O(1) average time
   * @param {object} entity
   * @returns {object}
   */
  create(entity) {
    this._ensureIndex();
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
    this._index.set(id, record);
    this._index.set(String(id), record);
    this._lastCollectionLength = this._collection.length;

    persist.save();
    return { ...record };
  }

  /**
   * Updates an existing record by ID.
   * Time Complexity: O(N) for array replacement, O(1) for index update
   * @param {number|string} id
   * @param {object} patch
   * @returns {object|null}
   */
  update(id, patch) {
    if (id === undefined || id === null) return null;
    this._ensureIndex();

    const numId = Number(id);
    const index = this._collection.findIndex(
      (item) => item[this.idField] === numId || String(item[this.idField]) === String(id),
    );
    if (index === -1) return null;

    const existing = this._collection[index];
    const updated = {
      ...existing,
      ...patch,
      [this.idField]: existing[this.idField], // Guard primary key against overwrite
      updated_at: new Date().toISOString(),
    };

    this._collection[index] = updated;
    this._index.set(existing[this.idField], updated);
    this._index.set(String(existing[this.idField]), updated);

    persist.save();
    return { ...updated };
  }

  /**
   * Deletes a record by ID.
   * Time Complexity: O(N) array splice, O(1) index removal
   * @param {number|string} id
   * @returns {boolean}
   */
  delete(id) {
    if (id === undefined || id === null) return false;
    this._ensureIndex();

    const numId = Number(id);
    const index = this._collection.findIndex(
      (item) => item[this.idField] === numId || String(item[this.idField]) === String(id),
    );
    if (index === -1) return false;

    const removed = this._collection.splice(index, 1)[0];
    this._index.delete(removed[this.idField]);
    this._index.delete(String(removed[this.idField]));
    this._lastCollectionLength = this._collection.length;

    persist.save();
    return true;
  }

  /**
   * Counts records matching an optional predicate.
   * Time Complexity: O(N) if predicate is provided, O(1) otherwise
   * @param {Function} [predicate=null]
   * @returns {number}
   */
  count(predicate = null) {
    this._ensureIndex();
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
