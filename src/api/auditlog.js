'use strict';

const { request } = require('./zabbix-client');
const { logger } = require('../utils/logger');
const config = require('../config');

/**
 * Get audit log records from Zabbix.
 * Only available to Super admin users.
 *
 * @param {Object} options - Parameters for auditlog.get
 * @returns {Promise<Array>} Array of audit log records
 */
async function getAuditLog(options = {}) {
    try {
        logger.debug(`${config.logging.prefix} Getting audit log`);

        const params = {
            output: 'extend',
            sortfield: 'clock',
            sortorder: 'DESC',
            ...options
        };

        return await request('auditlog.get', params);
    } catch (error) {
        logger.error(`${config.logging.prefix} Failed to get audit log:`, error.message);
        throw new Error(`Failed to retrieve audit log: ${error.message}`);
    }
}

/**
 * Get audit log records filtered by user IDs.
 *
 * @param {string[]} userids - Array of user IDs
 * @param {Object} options - Additional parameters
 * @returns {Promise<Array>} Array of audit log records for the given users
 */
async function getAuditLogByUser(userids, options = {}) {
    if (!Array.isArray(userids) || userids.length === 0) {
        throw new Error('getAuditLogByUser expects a non-empty array of user IDs.');
    }

    try {
        logger.debug(`${config.logging.prefix} Getting audit log for users: ${userids.join(', ')}`);

        const params = {
            output: 'extend',
            userids,
            sortfield: 'clock',
            sortorder: 'DESC',
            ...options
        };

        return await request('auditlog.get', params);
    } catch (error) {
        logger.error(`${config.logging.prefix} Failed to get audit log by user:`, error.message);
        throw new Error(`Failed to retrieve audit log by user: ${error.message}`);
    }
}

/**
 * Get audit log records within a time range.
 *
 * @param {number} timeFrom - Start Unix timestamp
 * @param {number} timeTill - End Unix timestamp (optional)
 * @param {Object} options - Additional parameters
 * @returns {Promise<Array>} Array of audit log records in the time range
 */
async function getAuditLogByTimeRange(timeFrom, timeTill = null, options = {}) {
    if (!timeFrom || typeof timeFrom !== 'number') {
        throw new Error('getAuditLogByTimeRange expects a valid timeFrom Unix timestamp.');
    }

    try {
        logger.debug(`${config.logging.prefix} Getting audit log from ${new Date(timeFrom * 1000).toISOString()}`);

        const params = {
            output: 'extend',
            time_from: timeFrom,
            sortfield: 'clock',
            sortorder: 'DESC',
            ...options
        };

        if (timeTill) {
            params.time_till = timeTill;
        }

        return await request('auditlog.get', params);
    } catch (error) {
        logger.error(`${config.logging.prefix} Failed to get audit log by time range:`, error.message);
        throw new Error(`Failed to retrieve audit log by time range: ${error.message}`);
    }
}

/**
 * Get audit log records filtered by resource type.
 * Common resourcetype values:
 *   0=User, 4=Host, 6=Trigger, 11=UserGroup, 14=HostGroup, 32=Script, etc.
 *
 * @param {number} resourcetype - Resource type integer
 * @param {Object} options - Additional parameters
 * @returns {Promise<Array>} Array of audit log records for the given resource type
 */
async function getAuditLogByResourceType(resourcetype, options = {}) {
    if (typeof resourcetype !== 'number') {
        throw new Error('getAuditLogByResourceType expects a numeric resourcetype.');
    }

    try {
        logger.debug(`${config.logging.prefix} Getting audit log for resourcetype: ${resourcetype}`);

        const params = {
            output: 'extend',
            filter: { resourcetype },
            sortfield: 'clock',
            sortorder: 'DESC',
            ...options
        };

        return await request('auditlog.get', params);
    } catch (error) {
        logger.error(`${config.logging.prefix} Failed to get audit log by resource type:`, error.message);
        throw new Error(`Failed to retrieve audit log by resource type: ${error.message}`);
    }
}

/**
 * Get audit log records filtered by action type.
 * Common action values: 0=Add, 1=Update, 2=Delete, 4=Login, 5=Logout, 6=Failed login
 *
 * @param {number} action - Action type integer
 * @param {Object} options - Additional parameters
 * @returns {Promise<Array>} Array of audit log records for the given action
 */
async function getAuditLogByAction(action, options = {}) {
    if (typeof action !== 'number') {
        throw new Error('getAuditLogByAction expects a numeric action code.');
    }

    try {
        logger.debug(`${config.logging.prefix} Getting audit log for action: ${action}`);

        const params = {
            output: 'extend',
            filter: { action },
            sortfield: 'clock',
            sortorder: 'DESC',
            ...options
        };

        return await request('auditlog.get', params);
    } catch (error) {
        logger.error(`${config.logging.prefix} Failed to get audit log by action:`, error.message);
        throw new Error(`Failed to retrieve audit log by action: ${error.message}`);
    }
}

module.exports = {
    getAuditLog,
    getAuditLogByUser,
    getAuditLogByTimeRange,
    getAuditLogByResourceType,
    getAuditLogByAction
};
