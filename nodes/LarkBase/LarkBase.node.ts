import {
    INodeType,
    INodeTypeDescription,
    IExecuteFunctions,
    INodeExecutionData,
    NodeConnectionType,
    INodeProperties, // Make sure INodeProperties is imported for the new properties
} from 'n8n-workflow';

export class LarkBase implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Lark Base',
        name: 'larkBase',
        icon: 'file:logo.svg', 
        group: ['applications'],
        version: 1,
        description: 'Interact with Lark Base API to manage records',
        defaults: {
            name: 'Lark Base',
        },
        inputs: [NodeConnectionType.Main],
        outputs: [NodeConnectionType.Main],
        credentials: [
            {
                name: 'larkAppApi',
                required: true,
            },
        ],
        properties: [
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                options: [
                    {
                        name: 'Get Record List',
                        value: 'getRecordList',
                        action: 'Get a list of records from a Lark Base table',
                    },
                    {
                        name: 'Create Record',
                        value: 'createRecord',
                        action: 'Create a new record in a Lark Base table',
                    },
                    {
                        name: 'Update Record',
                        value: 'updateRecord',
                        action: 'Update an existing record in a Lark Base table',
                    },
                    {
                        name: 'Delete Record',
                        value: 'deleteRecord',
                        action: 'Delete a record from a Lark Base table',
                    },
                ],
                default: 'getRecordList',
            },
            {
                displayName: 'Limit',
                name: 'limit',
                type: 'number',
                default: 50,
                description: 'Max number of results to return',
                displayOptions: {
                    show: {
                        operation: ['getRecordList'],
                    },
                },
            },
            {
                displayName: 'Fields (JSON)',
                name: 'fields',
                type: 'json',
                default: '{}',
                required: true,
                description: 'JSON object representing the fields and their values for the record. Example: {"FieldName": "Value"}',
                displayOptions: {
                    show: {
                        operation: ['createRecord', 'updateRecord'],
                    },
                },
            },
            {
                displayName: 'Record ID',
                name: 'recordId',
                type: 'string',
                default: '',
                required: true,
                description: 'The ID of the record to update or delete.',
                displayOptions: {
                    show: {
                        operation: ['updateRecord', 'deleteRecord'],
                    },
                },
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];

        const credentials = await this.getCredentials('larkAppApi') as {
            app_token: string;
            table_id: string;
        };

        const operation = this.getNodeParameter('operation', 0) as string;

        for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
            const currentItem = items[itemIndex];
            let responseData;

            const tenantAccessToken = currentItem.json.tenantAccessToken
            if (!tenantAccessToken) {
                throw new Error('Tenant Access Token not found in input data. Please connect a "Lark Authentication" node before this node.');
            }

            try {
                if (operation === 'getRecordList') {
                    const limit = this.getNodeParameter('limit', itemIndex) as number;

                    const response = await this.helpers.httpRequest({
                        method: 'GET',
                        url: `https://open.larksuite.com/open-apis/bitable/v1/apps/${credentials.app_token}/tables/${credentials.table_id}/records?page_size=${limit}`,
                        json: true,
                        headers: {
                            'Authorization': `Bearer ${tenantAccessToken}`,
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                        },
                    });

                    if (response.code === 0 && response.data) {
                        responseData = response.data;
                    } else {
                        throw new Error(`Failed to get records: ${response.msg || 'Unknown error'}`);
                    }
                } else if (operation === 'createRecord') {
                    const fieldsJson = this.getNodeParameter('fields', itemIndex) as string;
                    let fields: object;

                    try {
                        fields = JSON.parse(fieldsJson);
                    } catch (e: any) {
                        throw new Error(`Invalid JSON for "Fields": ${e.message}. Please ensure it is a valid JSON object.`);
                    }

                    const response = await this.helpers.httpRequest({
                        method: 'POST',
                        url: `https://open.larksuite.com/open-apis/bitable/v1/apps/${credentials.app_token}/tables/${credentials.table_id}/records`,
                        body: {
                            fields: fields,
                        },
                        json: true,
                        headers: {
                            'Authorization': `Bearer ${tenantAccessToken}`,
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                        },
                    });

                    if (response.code === 0 && response.data) {
                        responseData = response.data;
                    } else {
                        throw new Error(`Failed to create record: ${response.msg || 'Unknown error'}`);
                    }
                } else if (operation === 'updateRecord') {
                    const recordId = this.getNodeParameter('recordId', itemIndex) as string;
                    const fieldsJson = this.getNodeParameter('fields', itemIndex) as string;
                    let fields: object;

                    try {
                        fields = JSON.parse(fieldsJson);
                    } catch (e: any) {
                        throw new Error(`Invalid JSON for "Fields": ${e.message}. Please ensure it is a valid JSON object.`);
                    }

                    const response = await this.helpers.httpRequest({
                        method: 'POST',
                        url: `https://open.larksuite.com/open-apis/bitable/v1/apps/${credentials.app_token}/tables/${credentials.table_id}/records/${recordId}`,
                        body: {
                            fields: fields,
                        },
                        json: true,
                        headers: {
                            'Authorization': `Bearer ${tenantAccessToken}`,
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                        },
                    });

                    if (response.code === 0 && response.data) {
                        responseData = response.data;
                    } else {
                        throw new Error(`Failed to update record: ${response.msg || 'Unknown error'}`);
                    }
                } else if (operation === 'deleteRecord') {
                    const recordId = this.getNodeParameter('recordId', itemIndex) as string;

                    const response = await this.helpers.httpRequest({
                        method: 'DELETE',
                        url: `https://open.larksuite.com/open-apis/bitable/v1/apps/${credentials.app_token}/tables/${credentials.table_id}/records/${recordId}`,
                        json: true,
                        headers: {
                            'Authorization': `Bearer ${tenantAccessToken}`,
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                        },
                    });

                    if (response.code === 0) {
                        responseData = response.data || { success: true, recordId: recordId, message: response.msg};
                    } else {
                        throw new Error(`Failed to delete record: ${response.msg || 'Unknown error'}`);
                    }
                }
            } catch (error: any) {
                this.logger.error(`Error in Lark Base operation "${operation}": ${error.message}`);
                throw error;
            }

            if (responseData) {
                returnData.push({
                    json: responseData,
                });
            }
        }

        return this.prepareOutputData(returnData);
    }
}