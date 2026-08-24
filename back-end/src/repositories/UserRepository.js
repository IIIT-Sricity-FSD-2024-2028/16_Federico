'use strict';

const BaseRepository = require('./BaseRepository');

class UserRepository extends BaseRepository {
  constructor() {
    super('users', 'user_id');
    this.rolesRepo = new BaseRepository('roles', 'role_id');
  }

  findByEmail(email) {
    if (!email) return null;
    const normalized = String(email).trim().toLowerCase();
    return this.findOne((u) => String(u.email || '').toLowerCase() === normalized);
  }

  findByRole(roleId) {
    const rid = Number(roleId);
    return this.findAll((u) => u.role_id === rid);
  }

  findAllRoles() {
    return this.rolesRepo.findAll();
  }

  findRoleById(roleId) {
    return this.rolesRepo.findById(roleId);
  }
}

module.exports = new UserRepository();
