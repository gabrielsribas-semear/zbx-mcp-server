'use strict';
const { z } = require('zod');

// All schemas are defined as getter properties so that each access returns a
// fresh Zod instance. This prevents zod-to-json-schema from deduplicating
// repeated references within the same tool schema into $ref: "#/properties/..."
// which mcpo (and other JSON-Schema consumers) cannot resolve.
const schemas = {
    // Host identifier - can be ID, hostname, visible name, or IP
    get hostIdentifier() {
        return z.string()
            .min(1, 'Host identifier cannot be empty')
            .describe("Host identifier: ID, technical name, visible name, or IP address.");
    },

    get hostIdentifiers() {
        return z.array(z.string().min(1))
            .min(1, 'At least one host identifier required')
            .describe("Array of host identifiers (IDs, names, or IP addresses).");
    },

    get hostStatus() {
        return z.enum(['0', '1'])
            .describe('Host status: 0 (monitored), 1 (unmonitored).');
    },

    get severity() {
        return z.enum(['not_classified', 'information', 'warning', 'average', 'high', 'disaster'])
            .describe('Problem severity level: not_classified (0), information (1), warning (2), average (3), high (4), disaster (5).');
    },

    get interfaceType() {
        return z.enum(['1', '2', '3', '4'])
            .describe('Interface type: 1 (agent), 2 (SNMP), 3 (IPMI), 4 (JMX).');
    },

    get itemType() {
        return z.enum(['0', '2', '3', '5', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21'])
            .describe('Item type: 0 (Zabbix agent), 2 (Zabbix trapper), 3 (simple check), 5 (Zabbix internal), 7 (Zabbix agent active), etc.');
    },

    get valueType() {
        return z.enum(['0', '1', '2', '3', '4'])
            .describe('Value type: 0 (numeric float), 1 (character), 2 (log), 3 (numeric unsigned), 4 (text).');
    },

    get triggerPriority() {
        return z.enum(['0', '1', '2', '3', '4', '5'])
            .describe('Trigger priority: 0 (not classified), 1 (information), 2 (warning), 3 (average), 4 (high), 5 (disaster).');
    },

    get maintenanceType() {
        return z.enum(['0', '1'])
            .describe('Maintenance type: 0 (with data collection), 1 (without data collection).');
    },

    get dateYYYYMMDD() {
        return z.string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
            .refine(val => !isNaN(Date.parse(val)), 'Invalid date')
            .describe("Date in YYYY-MM-DD format (e.g., '2024-03-20').");
    },

    get dateTimeISO() {
        return z.string()
            .datetime('Must be valid ISO 8601 datetime')
            .describe("Date and time in ISO 8601 format (e.g., '2024-03-20T15:30:00Z').");
    },

    get unixTimestamp() {
        return z.number()
            .int('Must be an integer')
            .min(0, 'Timestamp must be positive')
            .describe('Unix timestamp (seconds since epoch).');
    },

    get ipAddress() {
        return z.string()
            .ip('Invalid IP address format')
            .describe("IP address (IPv4 or IPv6).");
    },

    get pagination() {
        return z.object({
            page: z.number().int().min(1).optional().default(1)
                .describe('Page number for paginated results.'),
            limit: z.number().int().min(1).max(1000).optional().default(100)
                .describe('Number of items per page (max 1000).')
        });
    },

    get timeRange() {
        return z.object({
            time_from: z.number().int().min(0)
                .describe('Start time as Unix timestamp.'),
            time_till: z.number().int().min(0).optional()
                .describe('End time as Unix timestamp (defaults to current time).')
        });
    },

    get hostGroup() {
        return z.object({
            groupid: z.string().describe('Host group ID.')
        });
    },

    get template() {
        return z.object({
            templateid: z.string().describe('Template ID.')
        });
    },

    get interface() {
        return z.object({
            type: z.number().int().min(1).max(4).describe('Interface type: 1 (agent), 2 (SNMP), 3 (IPMI), 4 (JMX).'),
            main: z.number().int().min(0).max(1).describe('Whether this is the default interface: 0 (no), 1 (yes).'),
            useip: z.number().int().min(0).max(1).describe('Connect using: 0 (DNS), 1 (IP).'),
            ip: z.string().ip().optional().describe('IP address (if useip is 1).'),
            dns: z.string().optional().describe('DNS name (if useip is 0).'),
            port: z.string().min(1).describe('Port number.'),
            details: z.any().optional().describe('Additional interface details (e.g., SNMP community).')
        });
    },

    get macro() {
        return z.object({
            macro: z.string().min(1).describe('Macro name (e.g., {$MACRO_NAME}).'),
            value: z.string().describe('Macro value.'),
            description: z.string().optional().describe('Macro description.'),
            type: z.number().int().min(0).max(2).optional().describe('Macro type: 0 (text), 1 (secret), 2 (vault).')
        });
    },

    get outputFields() {
        return z.union([
            z.literal('extend'),
            z.literal('count'),
            z.array(z.string())
        ]).describe('Output fields: "extend" (all fields), "count" (count only), or array of specific field names.');
    },

    get sortOrder() {
        return z.enum(['ASC', 'DESC'])
            .describe('Sort order: ASC (ascending) or DESC (descending).');
    },

    get hostId() {
        return z.string()
            .min(1, 'Host ID cannot be empty')
            .describe('Unique identifier for a host.');
    },

    get itemId() {
        return z.string()
            .min(1, 'Item ID cannot be empty')
            .describe('Unique identifier for an item.');
    },

    get triggerId() {
        return z.string()
            .min(1, 'Trigger ID cannot be empty')
            .describe('Unique identifier for a trigger.');
    },

    get eventId() {
        return z.string()
            .min(1, 'Event ID cannot be empty')
            .describe('Unique identifier for an event.');
    },

    get groupId() {
        return z.string()
            .min(1, 'Group ID cannot be empty')
            .describe('Unique identifier for a host group.');
    },

    get templateId() {
        return z.string()
            .min(1, 'Template ID cannot be empty')
            .describe('Unique identifier for a template.');
    },

    get maintenanceId() {
        return z.string()
            .min(1, 'Maintenance ID cannot be empty')
            .describe('Unique identifier for a maintenance period.');
    },

    get ackAction() {
        return z.object({
            action: z.number().int().min(0).max(63).optional().default(0)
                .describe('Acknowledgment action bitmask: 1 (close problem), 2 (acknowledge), 4 (add message), 8 (change severity), 16 (unacknowledge), 32 (suppress for).'),
            message: z.string().optional().describe('Acknowledgment message.'),
            severity: z.number().int().min(0).max(5).optional().describe('New severity level (0-5).')
        });
    }
};

module.exports = schemas;
