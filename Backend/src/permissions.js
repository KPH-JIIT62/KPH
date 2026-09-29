const PERMISSIONS = {
  SEND_MESSAGES: "send_messages",
  CREATE_THREADS: "create_threads",
  REACT: "react",
  CREATE_POLLS: "create_polls",
  SAVE_MESSAGES: "save_messages",
  SEND_DMS: "send_dms",
  PIN_MESSAGES: "pin_messages",
  ROLE_MENTION: "role_mention",
  MANAGE_CHANNELS: "manage_channels",
  MODERATE_MESSAGES: "moderate_messages",
  MANAGE_RESOURCES: "manage_resources",
  EVENT_MANAGE: "event_manage",
  PROBLEM_SETTING: "problem_setting",
  WORKSPACE_ADMIN: "workspace_admin",
  OVERSIGHT: "oversight",
};

const member = [
  PERMISSIONS.SEND_MESSAGES,
  PERMISSIONS.CREATE_THREADS,
  PERMISSIONS.REACT,
  PERMISSIONS.CREATE_POLLS,
  PERMISSIONS.SAVE_MESSAGES,
  PERMISSIONS.SEND_DMS,
];

const ROLE_PERMISSIONS = {
  Member: member,
  Volunteer: [...member, PERMISSIONS.EVENT_MANAGE],
  Mentor: [...member, PERMISSIONS.PIN_MESSAGES, PERMISSIONS.ROLE_MENTION, PERMISSIONS.MANAGE_RESOURCES],
  "Problem Setter": [...member, PERMISSIONS.PROBLEM_SETTING, PERMISSIONS.PIN_MESSAGES],
  "Core Team": [
    ...member,
    PERMISSIONS.PIN_MESSAGES,
    PERMISSIONS.ROLE_MENTION,
    PERMISSIONS.MANAGE_CHANNELS,
    PERMISSIONS.MODERATE_MESSAGES,
    PERMISSIONS.MANAGE_RESOURCES,
    PERMISSIONS.EVENT_MANAGE,
  ],
  Manager: [
    ...member,
    PERMISSIONS.PIN_MESSAGES,
    PERMISSIONS.ROLE_MENTION,
    PERMISSIONS.MANAGE_CHANNELS,
    PERMISSIONS.MODERATE_MESSAGES,
    PERMISSIONS.MANAGE_RESOURCES,
    PERMISSIONS.EVENT_MANAGE,
  ],
  Admin: Object.values(PERMISSIONS),
  "Faculty Coordinator": [
    ...member,
    PERMISSIONS.PIN_MESSAGES,
    PERMISSIONS.ROLE_MENTION,
    PERMISSIONS.OVERSIGHT,
    PERMISSIONS.EVENT_MANAGE,
    PERMISSIONS.MANAGE_RESOURCES,
  ],
};

const ROLES = [
  { id: "Faculty Coordinator", label: "Faculty Coordinator", color: "#C4A35A" },
  { id: "Admin", label: "Admin", color: "#D08484" },
  { id: "Manager", label: "Manager", color: "#C4B48A" },
  { id: "Core Team", label: "Core Team", color: "#8AA4D4" },
  { id: "Volunteer", label: "Volunteer", color: "#8FB59A" },
  { id: "Mentor", label: "Mentor", color: "#7DBfa0" },
  { id: "Problem Setter", label: "Problem Setter", color: "#D4A574" },
  { id: "Member", label: "Member", color: "#9AA3B2" },
];

const ROLE_MENTIONS = [
  { token: "faculty", role: "Faculty Coordinator", label: "Faculty Coordinator" },
  { token: "admin", role: "Admin", label: "Admin" },
  { token: "manager", role: "Manager", label: "Manager" },
  { token: "core", role: "Core Team", label: "Core Team" },
  { token: "volunteer", role: "Volunteer", label: "Volunteer" },
  { token: "mentor", role: "Mentor", label: "Mentor" },
  { token: "setter", role: "Problem Setter", label: "Problem Setter" },
  { token: "member", role: "Member", label: "Member" },
];

const REACTION_EMOJIS = ["👍", "💡", "🔥", "❤️"];

const PERMISSION_LABELS = {
  send_messages: "Send messages",
  create_threads: "Start threads",
  react: "React to messages",
  create_polls: "Create polls",
  save_messages: "Save messages",
  send_dms: "Send direct messages",
  pin_messages: "Pin messages",
  role_mention: "Mention a role",
  manage_channels: "Manage channels",
  moderate_messages: "Moderate messages",
  manage_resources: "Manage resources",
  event_manage: "Post event updates",
  problem_setting: "Problem-setting tools",
  workspace_admin: "Full workspace admin",
  oversight: "Faculty oversight",
};

function permissionsFor(role) {
  return ROLE_PERMISSIONS[role] ? [...ROLE_PERMISSIONS[role]] : [];
}

function can(user, permission) {
  return permissionsFor(user.role).includes(permission);
}

module.exports = {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  ROLES,
  ROLE_MENTIONS,
  REACTION_EMOJIS,
  PERMISSION_LABELS,
  permissionsFor,
  can,
};
