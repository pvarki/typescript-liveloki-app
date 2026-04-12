import { X509Certificate } from 'node:crypto';

import pool from './pool.js';

const parseSubjectCn = (subject) => {
    if (typeof subject !== 'string') {
        return null;
    }

    const slashCn = subject.match(/(?:^|\/)CN=([^/]+)/);
    if (slashCn?.[1]) {
        return slashCn[1].trim() || null;
    }

    const commaCn = subject.match(/(?:^|[,\n]\s*)CN\s*=\s*([^,\n]+)/i);
    if (commaCn?.[1]) {
        return commaCn[1].trim() || null;
    }

    return null;
};

export const getCertificateCn = (x509cert) => {
    if (typeof x509cert !== 'string' || !x509cert.trim()) {
        return null;
    }

    try {
        return parseSubjectCn(new X509Certificate(x509cert.replaceAll(String.raw`\n`, '\n')).subject);
    } catch {
        return null;
    }
};

export const getUserCn = ({ cn, certCn, x509cert, callsign } = {}) => cn || certCn || getCertificateCn(x509cert) || callsign || null;

export const findUserByCn = async (cn) => {
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT cn, rm_uuid, callsign, is_admin, created_at, updated_at FROM bl_users WHERE cn = $1', [cn]);
        return result.rows[0] || null;
    } finally {
        client.release();
    }
};

export const findUserByRmUuid = async (rmUuid) => {
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT cn, rm_uuid, callsign, is_admin, created_at, updated_at FROM bl_users WHERE rm_uuid = $1', [rmUuid]);
        return result.rows[0] || null;
    } finally {
        client.release();
    }
};

export const upsertUser = async ({ cn, rmUuid, callsign, isAdmin = false }) => {
    const client = await pool.connect();
    try {
        const result = await client.query(
            `INSERT INTO bl_users (cn, rm_uuid, callsign, is_admin)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (cn) DO UPDATE SET
                rm_uuid = COALESCE(EXCLUDED.rm_uuid, bl_users.rm_uuid),
                callsign = COALESCE(EXCLUDED.callsign, bl_users.callsign),
                is_admin = bl_users.is_admin OR EXCLUDED.is_admin,
                updated_at = NOW()
             RETURNING cn, rm_uuid, callsign, is_admin, created_at, updated_at`,
            [cn, rmUuid || null, callsign || null, Boolean(isAdmin)],
        );
        return result.rows[0];
    } finally {
        client.release();
    }
};

export const createUser = async ({ cn, rmUuid, callsign }) => upsertUser({ cn, rmUuid, callsign, isAdmin: false });

export const upsertUserByCn = async ({ cn, rmUuid, callsign }) => upsertUser({ cn, rmUuid, callsign, isAdmin: false });

export const promoteUser = async (rmUuid, userData = {}) => {
    const cn = getUserCn(userData);
    if (cn) {
        return upsertUser({ cn, rmUuid, callsign: userData.callsign, isAdmin: true });
    }

    const client = await pool.connect();
    try {
        const result = await client.query(
            'UPDATE bl_users SET is_admin = true, updated_at = NOW() WHERE rm_uuid = $1 RETURNING cn, rm_uuid, callsign, is_admin, created_at, updated_at',
            [rmUuid],
        );
        return result.rows[0] || null;
    } finally {
        client.release();
    }
};

export const demoteUser = async (rmUuid) => {
    const client = await pool.connect();
    try {
        const result = await client.query(
            'UPDATE bl_users SET is_admin = false, updated_at = NOW() WHERE rm_uuid = $1 RETURNING cn, rm_uuid, callsign, is_admin, created_at, updated_at',
            [rmUuid],
        );
        return result.rows[0] || null;
    } finally {
        client.release();
    }
};

export const deleteUser = async (rmUuid) => {
    const client = await pool.connect();
    try {
        const result = await client.query('DELETE FROM bl_users WHERE rm_uuid = $1 RETURNING cn', [rmUuid]);
        return result.rows[0] || null;
    } finally {
        client.release();
    }
};

export const updateUserCallsign = async (rmUuid, callsign) => {
    const client = await pool.connect();
    try {
        const result = await client.query(
            'UPDATE bl_users SET callsign = $1, updated_at = NOW() WHERE rm_uuid = $2 RETURNING cn, rm_uuid, callsign, is_admin, created_at, updated_at',
            [callsign, rmUuid],
        );
        return result.rows[0] || null;
    } finally {
        client.release();
    }
};
