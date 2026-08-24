'use strict';

const BaseRepository = require('./BaseRepository');

class OrganizationRepository extends BaseRepository {
  constructor() {
    super('organizations', 'organization_id');
    this.hospitalsRepo = new BaseRepository('hospitals', 'hospital_id');
    this.plansRepo = new BaseRepository('subscriptionPlans', 'plan_id');
    this.subscriptionsRepo = new BaseRepository('subscriptions', 'subscription_id');
    this.modulesRepo = new BaseRepository('organizationModules', 'org_module_id');
    this.quotasRepo = new BaseRepository('resourceQuotas', 'quota_id');
    this.apiKeysRepo = new BaseRepository('apiKeys', 'api_key_id');
    this.superUsersRepo = new BaseRepository('platformSuperUsers', 'platform_user_id');
    this.provisioningLogRepo = new BaseRepository('provisioningLog', 'id');
    this.platformActivityRepo = new BaseRepository('platformActivityLog', 'id');
  }

  // Hospitals (Branches)
  findAllHospitals(predicate = null) {
    return this.hospitalsRepo.findAll(predicate);
  }

  findHospitalById(hospitalId) {
    return this.hospitalsRepo.findById(hospitalId);
  }

  findHospitalsByOrg(orgId) {
    const oid = Number(orgId);
    return this.hospitalsRepo.findAll((h) => h.organization_id === oid);
  }

  createHospital(hospital) {
    return this.hospitalsRepo.create(hospital);
  }

  // Subscription Plans
  findAllPlans(predicate = null) {
    return this.plansRepo.findAll(predicate);
  }

  findPlanById(planId) {
    return this.plansRepo.findById(planId);
  }

  createPlan(plan) {
    return this.plansRepo.create(plan);
  }

  // Subscriptions
  findSubscriptionByOrg(orgId) {
    const oid = Number(orgId);
    return this.subscriptionsRepo.findOne((s) => s.organization_id === oid);
  }

  createSubscription(sub) {
    return this.subscriptionsRepo.create(sub);
  }

  updateSubscription(subId, patch) {
    return this.subscriptionsRepo.update(subId, patch);
  }

  // Modules
  findAllModules(predicate = null) {
    return this.modulesRepo.findAll(predicate);
  }

  findModulesByOrg(orgId) {
    const oid = Number(orgId);
    return this.modulesRepo.findAll((m) => m.organization_id === oid);
  }

  setModuleFlag(orgId, moduleCode, enabled) {
    const oid = Number(orgId);
    const code = String(moduleCode).toUpperCase();
    const existing = this.modulesRepo.findOne(
      (m) => m.organization_id === oid && m.module_code === code,
    );
    if (existing) {
      return this.modulesRepo.update(existing.org_module_id, { enabled });
    }
    return this.modulesRepo.create({
      organization_id: oid,
      module_code: code,
      enabled,
    });
  }

  // Resource Quotas
  findQuotaByOrg(orgId) {
    const oid = Number(orgId);
    return this.quotasRepo.findOne((q) => q.organization_id === oid);
  }

  createQuota(quota) {
    return this.quotasRepo.create(quota);
  }

  updateQuota(quotaId, patch) {
    return this.quotasRepo.update(quotaId, patch);
  }

  // API Keys
  findApiKeysByOrg(orgId) {
    const oid = Number(orgId);
    return this.apiKeysRepo.findAll((k) => k.organization_id === oid);
  }

  createApiKey(key) {
    return this.apiKeysRepo.create(key);
  }

  // Platform Super Users
  findSuperUserByEmail(email) {
    if (!email) return null;
    const normalized = String(email).trim().toLowerCase();
    return this.superUsersRepo.findOne((su) => String(su.email || '').toLowerCase() === normalized);
  }

  findSuperUserById(id) {
    return this.superUsersRepo.findById(id);
  }

  createSuperUser(su) {
    return this.superUsersRepo.create(su);
  }

  // Platform Activity & Provisioning logs
  logProvisioning(entry) {
    return this.provisioningLogRepo.create(entry);
  }

  logPlatformActivity(entry) {
    return this.platformActivityRepo.create(entry);
  }

  findAllPlatformActivity(predicate = null) {
    const results = this.platformActivityRepo.findAll(predicate);
    return [...results].reverse();
  }
}

module.exports = new OrganizationRepository();
