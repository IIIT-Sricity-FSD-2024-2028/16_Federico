'use strict';


const dataStore = require('../store/dataStore');

const ACTOR_ACCESS = {
  doctor: { read: ['HOM', 'PRE', 'FA', 'Patient', 'Admin'], write: ['HOM'] },

  patient: {
    read: ['HOM', 'PRE', 'FA', 'Patient', 'Admin'],
    write: ['HOM', 'PRE', 'Patient'],
  },
  ward: { read: ['HOM', 'PRE', 'FA', 'Admin'], write: ['HOM'] },
  inventory: { read: ['HOM', 'FA', 'Admin'], write: ['HOM'] },
 
  wardAdmin: { read: ['Admin'], write: ['Admin'], delete: ['Admin'] },
  inventoryCatalog: { read: ['Admin'], write: ['Admin'], delete: ['Admin'] },
 
  billing: { read: ['HOM', 'FA', 'Patient', 'Admin'], write: ['FA'] },

  leader: { read: ['HOM', 'FA', 'Admin'], write: ['HOM', 'FA'] },
 
  payment: { write: ['FA', 'Patient'] },
 
  ledgerEntry: { write: ['FA', 'HOM'] },
 
  appointment: { read: ['HOM', 'PRE', 'FA'], write: ['PRE'] },
  admission: { read: ['HOM', 'PRE', 'FA', 'Admin'], write: ['HOM', 'PRE'] },
 
  preRequest: {
    read: ['HOM', 'PRE', 'FA', 'Patient'],
    write: ['HOM', 'PRE', 'Patient'],
  },
 
  rbac: { read: ['Admin'], write: ['Admin'] },
};


function dynamicRoleGrants(req, resource, mode) {
  if (
    !req.session ||
    !req.session.userId ||
    !req.tenant ||
    !req.tenant.organizationId
  )
    return false;
  const permissionCode = `${resource}:${mode}`;
  const permission = dataStore.permissions.find(
    (p) => p.permission_code === permissionCode,
  );
  if (!permission) return false;

  const assignedRoleIds = dataStore.staffRoleAssignments
    .filter((a) => a.user_id === req.session.userId)
    .map((a) => a.custom_role_id);
  if (assignedRoleIds.length === 0) return false;

  const orgRoleIds = new Set(
    dataStore.customRoles
      .filter(
        (r) =>
          assignedRoleIds.includes(r.custom_role_id) &&
          r.organization_id === req.tenant.organizationId,
      )
      .map((r) => r.custom_role_id),
  );
  if (orgRoleIds.size === 0) return false;

  return dataStore.rolePermissions.some(
    (rp) =>
      orgRoleIds.has(rp.custom_role_id) &&
      rp.permission_id === permission.permission_id,
  );
}


function authorize(legacyRoles, resource, mode) {
  return function (req, res, next) {
    const legacyOk = legacyRoles.includes(req.headers['x-role']);
    const allowedActors = ACTOR_ACCESS[resource]?.[mode] || [];
    const actorOk = Boolean(
      req.session && allowedActors.includes(req.session.role),
    );
    const dynamicOk = dynamicRoleGrants(req, resource, mode);

    if (legacyOk || actorOk || dynamicOk) return next();

    return res.status(403).json({
      message: 'Forbidden resource',
      error: 'Forbidden',
      statusCode: 403,
    });
  };
}

module.exports = { authorize, ACTOR_ACCESS };
