import pool from './pool.js';

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

export const createUser = async ({ cn, rmUuid, callsign }) => {
    const client = await pool.connect();
    try {
        const result = await client.query(
            'INSERT INTO bl_users (cn, rm_uuid, callsign) VALUES ($1, $2, $3) RETURNING cn, rm_uuid, callsign, is_admin, created_at, updated_at',
            [cn, rmUuid || null, callsign || null],
        );
        return result.rows[0];
    } finally {
        client.release();
    }
};

export const upsertUserByCn = async ({ cn, rmUuid, callsign }) => {
    const client = await pool.connect();
    try {
        const result = await client.query(
            `INSERT INTO bl_users (cn, rm_uuid, callsign, is_admin)
             VALUES ($1, $2, $3, false)
             ON CONFLICT (cn) DO UPDATE SET rm_uuid = EXCLUDED.rm_uuid, callsign = EXCLUDED.callsign, updated_at = NOW()
             RETURNING cn, rm_uuid, callsign, is_admin, created_at, updated_at`,
            [cn, rmUuid || null, callsign || null],
        );
        return result.rows[0];
    } finally {
        client.release();
    }
};

export const promoteUser = async (rmUuid) => {
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
