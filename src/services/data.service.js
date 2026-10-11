'use strict';

const { pool } = require('../database/pool');
const { generateId } = require('../utils/crypto');

const ALLOWED_VISIBILITY = ['public', 'private'];

/**
 * Kusoma data za umma.
 * Hakuhitaji login.
 */
async function getPublicData(options = {}) {
    const limit = Math.min(
        Math.max(Number(options.limit) || 20, 1),
        100
    );

    const offset = Math.max(
        Number(options.offset) || 0,
        0
    );

    const result = await pool.query(
        `SELECT
            id,
            owner_id,
            data_type,
            title,
            content,
            visibility,
            created_at,
            updated_at
         FROM user_data
         WHERE visibility = 'public'
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
    );

    return result.rows;
}

/**
 * Kusoma data za mtumiaji aliyeingia.
 * Mtumiaji atasoma data zake tu, za umma na binafsi.
 */
async function getMyData(userId, options = {}) {
    const limit = Math.min(
        Math.max(Number(options.limit) || 20, 1),
        100
    );

    const offset = Math.max(
        Number(options.offset) || 0,
        0
    );

    const result = await pool.query(
        `SELECT
            id,
            owner_id,
            data_type,
            title,
            content,
            visibility,
            created_at,
            updated_at
         FROM user_data
         WHERE owner_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
    );

    return result.rows;
}

/**
 * Kuongeza data mpya.
 * Owner ID hutoka kwenye mtumiaji aliyethibitishwa.
 */
async function createData(userId, input) {
    if (
        !input ||
        typeof input.title !== 'string' ||
        typeof input.dataType !== 'string'
    ) {
        throw new Error('Taarifa za data hazijakamilika.');
    }

    const title = input.title.trim();
    const dataType = input.dataType.trim();

    if (
        title.length < 1 ||
        title.length > 255 ||
        dataType.length < 1 ||
        dataType.length > 100
    ) {
        throw new Error('Urefu wa title au dataType si sahihi.');
    }

    const visibility = input.visibility || 'public';

    if (!ALLOWED_VISIBILITY.includes(visibility)) {
        throw new Error('Visibility si sahihi.');
    }

    const content =
        input.content === undefined ? {} : input.content;

    if (
        content === null ||
        typeof content !== 'object' ||
        Array.isArray(content)
    ) {
        throw new Error('Content lazima iwe JSON object.');
    }

    const id = generateId();

    const result = await pool.query(
        `INSERT INTO user_data (
            id,
            owner_id,
            data_type,
            title,
            content,
            visibility
        )
        VALUES ($1, $2, $3, $4, $5::jsonb, $6)
        RETURNING
            id,
            owner_id,
            data_type,
            title,
            content,
            visibility,
            created_at,
            updated_at`,
        [
            id,
            userId,
            dataType,
            title,
            JSON.stringify(content),
            visibility
        ]
    );

    return result.rows[0];
}

/**
 * Kuhariri data za mtumiaji mwenyewe tu.
 */
async function updateMyData(userId, dataId, input) {
    if (!input || typeof input !== 'object') {
        throw new Error('Taarifa za mabadiliko si sahihi.');
    }

    const fields = [];
    const values = [];

    function addField(column, value) {
        values.push(value);
        fields.push(`${column} = $${values.length}`);
    }

    if (input.title !== undefined) {
        if (
            typeof input.title !== 'string' ||
            input.title.trim().length < 1 ||
            input.title.trim().length > 255
        ) {
            throw new Error('Title si sahihi.');
        }

        addField('title', input.title.trim());
    }

    if (input.dataType !== undefined) {
        if (
            typeof input.dataType !== 'string' ||
            input.dataType.trim().length < 1 ||
            input.dataType.trim().length > 100
        ) {
            throw new Error('Data type si sahihi.');
        }

        addField('data_type', input.dataType.trim());
    }

    if (input.content !== undefined) {
        if (
            input.content === null ||
            typeof input.content !== 'object' ||
            Array.isArray(input.content)
        ) {
            throw new Error('Content lazima iwe JSON object.');
        }

        values.push(JSON.stringify(input.content));
        fields.push(`content = $${values.length}::jsonb`);
    }

    if (input.visibility !== undefined) {
        if (!ALLOWED_VISIBILITY.includes(input.visibility)) {
            throw new Error('Visibility si sahihi.');
        }

        addField('visibility', input.visibility);
    }

    if (fields.length === 0) {
        throw new Error('Hakuna mabadiliko yaliyotumwa.');
    }

    fields.push('updated_at = NOW()');

    values.push(dataId);
    const idPosition = values.length;

    values.push(userId);
    const ownerPosition = values.length;

    const result = await pool.query(
        `UPDATE user_data
         SET ${fields.join(', ')}
         WHERE id = $${idPosition}
           AND owner_id = $${ownerPosition}
         RETURNING
            id,
            owner_id,
            data_type,
            title,
            content,
            visibility,
            created_at,
            updated_at`,
        values
    );

    return result.rows[0] || null;
}

/**
 * Kufuta data za mtumiaji mwenyewe tu.
 */
async function deleteMyData(userId, dataId) {
    const result = await pool.query(
        `DELETE FROM user_data
         WHERE id = $1
           AND owner_id = $2
         RETURNING id`,
        [dataId, userId]
    );

    return result.rowCount > 0;
}

module.exports = {
    getPublicData,
    getMyData,
    createData,
    updateMyData,
    deleteMyData
};
