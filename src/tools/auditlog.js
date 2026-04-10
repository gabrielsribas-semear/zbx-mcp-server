'use strict';

const { logger } = require('../utils/logger');
const api = require('../api');
const { z } = require('zod');

// Action codes for human-readable descriptions in tool schemas
const ACTION_DESCRIPTION =
    '0=Add, 1=Update, 2=Delete, 4=Login, 5=Logout, 6=Failed login';

// Resource type codes reference
const RESOURCETYPE_DESCRIPTION =
    '0=User, 4=Host, 5=Action, 6=GraphPrototype, 11=UserGroup, 14=HostGroup, ' +
    '18=Item, 19=Image, 20=Map, 25=DiscoveryRule, 29=Service, 32=Script, ' +
    '36=MaintenancePeriod, 39=Authentication, 40=Template, 55=Trigger';

function registerTools(server) {

    // ── zabbix_get_audit_log ─────────────────────────────────────────────────
    server.tool(
        'zabbix_get_audit_log',
        'Retrieve Zabbix audit log records. Requires Super admin privileges. ' +
        'Returns a list of recorded configuration changes, login events and other actions.',
        {
            auditids: z.array(z.string()).optional()
                .describe('Return only audit log entries with the given IDs'),
            userids: z.array(z.string()).optional()
                .describe('Return only entries created by the given user IDs'),
            time_from: z.number().int().optional()
                .describe('Return only entries created after this Unix timestamp (inclusive)'),
            time_till: z.number().int().optional()
                .describe('Return only entries created before this Unix timestamp (inclusive)'),
            filter: z.record(z.any()).optional()
                .describe(
                    'Exact-match filter on any audit log field. ' +
                    'Useful fields: action (' + ACTION_DESCRIPTION + '), ' +
                    'resourcetype (' + RESOURCETYPE_DESCRIPTION + '), ' +
                    'resourceid, userid'
                ),
            search: z.record(z.any()).optional()
                .describe('Case-insensitive substring search. Searchable fields: username, ip, resourcename, details'),
            searchByAny: z.boolean().optional()
                .describe('If true, return results matching ANY search criterion instead of ALL'),
            sortfield: z.union([z.string(), z.array(z.string())]).optional()
                .describe('Field(s) to sort by. Possible values: auditid, userid, clock. Default: clock'),
            sortorder: z.union([z.enum(['ASC', 'DESC']), z.array(z.enum(['ASC', 'DESC']))]).optional()
                .describe('Sort order. Default: DESC (newest first)'),
            limit: z.number().int().positive().optional()
                .describe('Maximum number of records to return'),
            output: z.union([z.literal('extend'), z.array(z.string())]).optional()
                .describe('Properties to return. Default: extend (all fields)'),
            countOutput: z.boolean().optional()
                .describe('Return a count of matching records instead of the records themselves')
        },
        async (args) => {
            try {
                const params = {
                    output: args.output || 'extend',
                    sortfield: args.sortfield || 'clock',
                    sortorder: args.sortorder || 'DESC'
                };

                if (args.auditids)    params.auditids    = args.auditids;
                if (args.userids)     params.userids     = args.userids;
                if (args.time_from)   params.time_from   = args.time_from;
                if (args.time_till)   params.time_till   = args.time_till;
                if (args.filter)      params.filter      = args.filter;
                if (args.search)      params.search      = args.search;
                if (args.searchByAny !== undefined) params.searchByAny = args.searchByAny;
                if (args.limit)       params.limit       = args.limit;
                if (args.countOutput !== undefined)  params.countOutput = args.countOutput;

                const result = await api.getAuditLog(params);
                return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
            } catch (error) {
                logger.error('zabbix_get_audit_log failed:', error.message);
                return { content: [{ type: 'text', text: JSON.stringify({ error: error.message }) }] };
            }
        }
    );

    // ── zabbix_get_audit_log_by_user ─────────────────────────────────────────
    server.tool(
        'zabbix_get_audit_log_by_user',
        'Retrieve Zabbix audit log entries for specific users. ' +
        'Useful for tracking what changes a particular user made.',
        {
            userids: z.array(z.string()).min(1)
                .describe('One or more user IDs whose audit log entries to return'),
            time_from: z.number().int().optional()
                .describe('Return only entries created after this Unix timestamp'),
            time_till: z.number().int().optional()
                .describe('Return only entries created before this Unix timestamp'),
            limit: z.number().int().positive().optional().default(100)
                .describe('Maximum number of records to return (default: 100)'),
            sortorder: z.enum(['ASC', 'DESC']).optional().default('DESC')
                .describe('Sort order (default: DESC — newest first)')
        },
        async (args) => {
            try {
                const options = { limit: args.limit || 100 };
                if (args.time_from) options.time_from = args.time_from;
                if (args.time_till) options.time_till = args.time_till;
                if (args.sortorder) options.sortorder = args.sortorder;

                const result = await api.getAuditLogByUser(args.userids, options);
                return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
            } catch (error) {
                logger.error('zabbix_get_audit_log_by_user failed:', error.message);
                return { content: [{ type: 'text', text: JSON.stringify({ error: error.message }) }] };
            }
        }
    );

    // ── zabbix_get_audit_log_by_time_range ───────────────────────────────────
    server.tool(
        'zabbix_get_audit_log_by_time_range',
        'Retrieve Zabbix audit log entries within a specific time window. ' +
        'Tip: use Math.floor(Date.now()/1000) - N to get entries from the last N seconds.',
        {
            time_from: z.number().int()
                .describe('Start of time range as Unix timestamp (required)'),
            time_till: z.number().int().optional()
                .describe('End of time range as Unix timestamp (optional, defaults to now)'),
            limit: z.number().int().positive().optional().default(200)
                .describe('Maximum number of records to return (default: 200)'),
            filter: z.record(z.any()).optional()
                .describe('Optional exact-match filter (e.g. { "action": 2 } for Delete events)')
        },
        async (args) => {
            try {
                const options = { limit: args.limit || 200 };
                if (args.filter) options.filter = args.filter;

                const result = await api.getAuditLogByTimeRange(args.time_from, args.time_till || null, options);
                return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
            } catch (error) {
                logger.error('zabbix_get_audit_log_by_time_range failed:', error.message);
                return { content: [{ type: 'text', text: JSON.stringify({ error: error.message }) }] };
            }
        }
    );

    // ── zabbix_get_audit_log_by_action ───────────────────────────────────────
    server.tool(
        'zabbix_get_audit_log_by_action',
        'Retrieve Zabbix audit log entries for a specific action type. ' +
        'Action codes: 0=Add, 1=Update, 2=Delete, 4=Login, 5=Logout, 6=Failed login.',
        {
            action: z.number().int().min(0)
                .describe('Action code: 0=Add, 1=Update, 2=Delete, 4=Login, 5=Logout, 6=Failed login'),
            time_from: z.number().int().optional()
                .describe('Return only entries created after this Unix timestamp'),
            time_till: z.number().int().optional()
                .describe('Return only entries created before this Unix timestamp'),
            limit: z.number().int().positive().optional().default(100)
                .describe('Maximum number of records to return (default: 100)')
        },
        async (args) => {
            try {
                const options = { limit: args.limit || 100 };
                if (args.time_from) options.time_from = args.time_from;
                if (args.time_till) options.time_till = args.time_till;

                const result = await api.getAuditLogByAction(args.action, options);
                return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
            } catch (error) {
                logger.error('zabbix_get_audit_log_by_action failed:', error.message);
                return { content: [{ type: 'text', text: JSON.stringify({ error: error.message }) }] };
            }
        }
    );

    // ── zabbix_get_audit_log_by_resource_type ────────────────────────────────
    server.tool(
        'zabbix_get_audit_log_by_resource_type',
        'Retrieve Zabbix audit log entries for a specific resource type. ' +
        'Resource type codes: 0=User, 4=Host, 5=Action, 11=UserGroup, 14=HostGroup, ' +
        '18=Item, 20=Map, 25=DiscoveryRule, 32=Script, 36=MaintenancePeriod, 40=Template, 55=Trigger.',
        {
            resourcetype: z.number().int().min(0)
                .describe(
                    'Resource type code: 0=User, 4=Host, 5=Action, 11=UserGroup, 14=HostGroup, ' +
                    '18=Item, 20=Map, 25=DiscoveryRule, 32=Script, 36=MaintenancePeriod, 40=Template, 55=Trigger'
                ),
            time_from: z.number().int().optional()
                .describe('Return only entries created after this Unix timestamp'),
            time_till: z.number().int().optional()
                .describe('Return only entries created before this Unix timestamp'),
            limit: z.number().int().positive().optional().default(100)
                .describe('Maximum number of records to return (default: 100)')
        },
        async (args) => {
            try {
                const options = { limit: args.limit || 100 };
                if (args.time_from) options.time_from = args.time_from;
                if (args.time_till) options.time_till = args.time_till;

                const result = await api.getAuditLogByResourceType(args.resourcetype, options);
                return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
            } catch (error) {
                logger.error('zabbix_get_audit_log_by_resource_type failed:', error.message);
                return { content: [{ type: 'text', text: JSON.stringify({ error: error.message }) }] };
            }
        }
    );
}

module.exports = { registerTools };
