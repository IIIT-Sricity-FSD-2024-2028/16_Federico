'use strict';

import { useState } from 'react';
import DialogShell from '../../components/layout/DialogShell.jsx';
import Button from '../../components/ui/Button.jsx';
import { api } from '../../api/index.js';
import { toast } from '../../components/feedback/feedback.js';
import TaggedEmailInput from '../../components/forms/TaggedEmailInput.jsx';
import { ACTOR_TO_TAG, buildTaggedEmail } from '../../lib/emailIdentity.js';

/** Ported from the #staff-dialog <dialog> in Admin/screen-05-people.html. */
const BLANK = { name: '', emailName: '', email: '', password: '', actor_role: 'HOM' };

/**
 * `emailDomain` is the organization's staff domain (session tenant). With it,
 * the login email is built as name.<role>@<domain> - the shape the unified
 * login page reads the portal and hospital from. Without it (a session from
 * before email domains existed) the email is typed in full and the server
 * checks the shape.
 */
export default function StaffDialog({ open, emailDomain, onClose, onSaved }) {
  // Mounted only while open, so every opening starts from a blank form.
  if (!open) return null;
  return <StaffForm emailDomain={emailDomain} onClose={onClose} onSaved={onSaved} />;
}

function StaffForm({ emailDomain, onClose, onSaved }) {
  const [f, setF] = useState(BLANK);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    const tag = ACTOR_TO_TAG[f.actor_role];
    const payload = {
      name: f.name.trim(),
      email: emailDomain ? buildTaggedEmail(f.emailName, tag, emailDomain) || '' : f.email.trim(),
      password: f.password,
      actor_role: f.actor_role,
    };
    if (!payload.name || !payload.email || payload.password.length < 6) return;
    try {
      const created = await api.rbac.createStaff(payload);
      onClose();
      toast(
        created.name + ' can now sign in as ' + created.actor_role + ' with ' + created.email + '.',
        'success',
      );
      await onSaved();
    } catch (err) {
      toast(err.message || 'Could not create this login.', 'error');
    }
  }

  return (
    <DialogShell
      open
      onClose={onClose}
      title="Add a Person"
      subtitle="Create a new login with assigned portal role for this organization."
    >
      <form id="staff-form" className="dialog-form" onSubmit={handleSubmit}>
          <div className="md-field">
            <label htmlFor="staff-name">Full name</label>
            <input id="staff-name" required placeholder="e.g. Rekha Nair" value={f.name} onChange={set('name')} />
          </div>
          <div className="md-field">
            <label htmlFor="staff-email">Login email</label>
            {emailDomain ? (
              <TaggedEmailInput
                id="staff-email"
                value={f.emailName}
                onChange={(v) => setF((p) => ({ ...p, emailName: v }))}
                tag={ACTOR_TO_TAG[f.actor_role]}
                domain={emailDomain}
              />
            ) : (
              <input id="staff-email" type="email" required placeholder="name.hom@yourhospital.com" value={f.email} onChange={set('email')} />
            )}
          </div>
          <div className="md-field">
            <label htmlFor="staff-password">Temporary password</label>
            <input id="staff-password" required minLength={6} placeholder="At least 6 characters" value={f.password} onChange={set('password')} />
          </div>
          <div className="md-field">
            <label htmlFor="staff-role">Portal role</label>
            <select id="staff-role" className="input" required value={f.actor_role} onChange={set('actor_role')}>
              <option value="HOM">HOM {'—'} Hospital Operations</option>
              <option value="PRE">PRE {'—'} Patient Registration</option>
              <option value="FA">FA {'—'} Finance Associate</option>
            </select>
          </div>
          <p className="cred-hint">
            Share the email + temporary password with the person. They sign in at the login page,
            which opens their portal from the role in the email. Changing their role later renames
            the email to match.
          </p>
          <div className="md-dialog-actions">
            <Button variant="outline" type="button" id="staff-cancel" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Create Login
            </Button>
          </div>
        </form>
    </DialogShell>
  );
}

